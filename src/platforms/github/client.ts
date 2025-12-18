/**
 * GitHub API Client
 *
 * Implements IPlatformClient for GitHub repositories
 */

import {getInput, warning} from '@actions/core'
import {context as githubContext} from '@actions/github'
import {Octokit} from '@octokit/action'
import {retry} from '@octokit/plugin-retry'
import {throttling} from '@octokit/plugin-throttling'
import {
  IPlatformClient,
  CompareResult,
  ChangedFile,
  Commit,
  MergeRequestInfo,
  RepoInfo
} from '../types'

/**
 * Create a configured Octokit instance with retry and throttling
 */
function createOctokit(token: string): InstanceType<typeof Octokit> {
  const RetryAndThrottlingOctokit = Octokit.plugin(throttling, retry)

  return new RetryAndThrottlingOctokit({
    auth: `token ${token}`,
    throttle: {
      onRateLimit: (
        retryAfter: number,
        options: any,
        _o: any,
        retryCount: number
      ) => {
        warning(
          `Request quota exhausted for request ${options.method} ${options.url}
Retry after: ${retryAfter} seconds
Retry count: ${retryCount}
`
        )
        if (retryCount <= 3) {
          warning(`Retrying after ${retryAfter} seconds!`)
          return true
        }
        return false
      },
      onSecondaryRateLimit: (
        retryAfter: number,
        options: any
      ) => {
        warning(
          `SecondaryRateLimit detected for request ${options.method} ${options.url} ; retry after ${retryAfter} seconds`
        )
        // if we are doing a POST method on /repos/{owner}/{repo}/pulls/{pull_number}/reviews then we shouldn't retry
        if (
          options.method === 'POST' &&
          options.url.match(/\/repos\/.*\/.*\/pulls\/.*\/reviews/)
        ) {
          return false
        }
        return true
      }
    }
  })
}

/**
 * GitHub API client implementation
 */
export class GitHubClient implements IPlatformClient {
  private octokit: InstanceType<typeof Octokit>
  private _repo: RepoInfo

  constructor(token?: string, _baseUrl?: string) {
    const authToken = token || getInput('token') || process.env.GITHUB_TOKEN || ''
    this.octokit = createOctokit(authToken)
    this._repo = {
      owner: githubContext.repo.owner,
      repo: githubContext.repo.repo,
      fullName: `${githubContext.repo.owner}/${githubContext.repo.repo}`
    }
  }

  getRepoInfo(): RepoInfo {
    return this._repo
  }

  async compareCommits(base: string, head: string): Promise<CompareResult> {
    const response = await this.octokit.repos.compareCommits({
      owner: this._repo.owner,
      repo: this._repo.repo,
      base,
      head
    })

    const files: ChangedFile[] = (response.data.files || []).map(file => ({
      filename: file.filename,
      status: this.mapFileStatus(file.status),
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      patch: file.patch,
      previousFilename: file.previous_filename
    }))

    const commits: Commit[] = response.data.commits.map(commit => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: {
        name: commit.commit.author?.name || 'Unknown',
        email: commit.commit.author?.email || '',
        date: commit.commit.author?.date || ''
      }
    }))

    return {
      files,
      commits,
      aheadBy: response.data.ahead_by,
      behindBy: response.data.behind_by,
      totalCommits: response.data.total_commits
    }
  }

  async getFileContent(path: string, ref: string): Promise<string> {
    const response = await this.octokit.repos.getContent({
      owner: this._repo.owner,
      repo: this._repo.repo,
      path,
      ref
    })

    if (Array.isArray(response.data)) {
      throw new Error(`Path ${path} is a directory, not a file`)
    }

    if (response.data.type !== 'file') {
      throw new Error(`Path ${path} is not a file (type: ${response.data.type})`)
    }

    if (!response.data.content) {
      throw new Error(`File ${path} has no content`)
    }

    return Buffer.from(response.data.content, 'base64').toString('utf-8')
  }

  async getMergeRequestInfo(mrNumber?: number): Promise<MergeRequestInfo> {
    const prNumber = mrNumber || githubContext.payload.pull_request?.number

    if (!prNumber) {
      throw new Error('No pull request number provided and none found in context')
    }

    const response = await this.octokit.pulls.get({
      owner: this._repo.owner,
      repo: this._repo.repo,
      pull_number: prNumber
    })

    const pr = response.data

    return {
      number: pr.number,
      title: pr.title,
      description: pr.body || '',
      state: this.mapPRState(pr.state, pr.merged),
      sourceBranch: pr.head.ref,
      targetBranch: pr.base.ref,
      baseSha: pr.base.sha,
      headSha: pr.head.sha,
      author: {
        login: pr.user?.login || 'unknown',
        id: pr.user?.id || 0
      },
      labels: pr.labels.map(l => l.name || ''),
      createdAt: pr.created_at,
      updatedAt: pr.updated_at
    }
  }

  async listCommits(mrNumber: number): Promise<Commit[]> {
    const allCommits: Commit[] = []
    let page = 1

    while (true) {
      const response = await this.octokit.pulls.listCommits({
        owner: this._repo.owner,
        repo: this._repo.repo,
        pull_number: mrNumber,
        per_page: 100,
        page
      })

      if (response.data.length === 0) {
        break
      }

      allCommits.push(
        ...response.data.map(commit => ({
          sha: commit.sha,
          message: commit.commit.message,
          author: {
            name: commit.commit.author?.name || 'Unknown',
            email: commit.commit.author?.email || '',
            date: commit.commit.author?.date || ''
          }
        }))
      )

      page++
    }

    return allCommits
  }

  /**
   * Get the underlying Octokit instance for advanced operations
   */
  getOctokit(): InstanceType<typeof Octokit> {
    return this.octokit
  }

  private mapFileStatus(
    status: string
  ): 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' {
    switch (status) {
      case 'added':
        return 'added'
      case 'removed':
        return 'removed'
      case 'modified':
        return 'modified'
      case 'renamed':
        return 'renamed'
      case 'copied':
        return 'copied'
      case 'changed':
        return 'changed'
      default:
        return 'modified'
    }
  }

  private mapPRState(
    state: string,
    merged: boolean
  ): 'open' | 'closed' | 'merged' {
    if (merged) return 'merged'
    if (state === 'open') return 'open'
    return 'closed'
  }
}

/**
 * Create a standalone Octokit instance (for backward compatibility)
 */
export function createGitHubOctokit(token?: string): InstanceType<typeof Octokit> {
  const authToken = token || getInput('token') || process.env.GITHUB_TOKEN || ''
  return createOctokit(authToken)
}
