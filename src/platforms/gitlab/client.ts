/**
 * GitLab API Client
 *
 * Implements IPlatformClient for GitLab repositories using @gitbeaker/rest
 */

import {warning} from '@actions/core'
import {Gitlab} from '@gitbeaker/rest'
import {
  IPlatformClient,
  CompareResult,
  ChangedFile,
  Commit,
  MergeRequestInfo,
  RepoInfo
} from '../types'
import {GitLabContext} from './context'

interface GitLabClientOptions {
  insecureSsl?: boolean
  caCert?: string
}

/**
 * GitLab API client implementation
 */
export class GitLabClient implements IPlatformClient {
  private gitlab: InstanceType<typeof Gitlab>
  private context: GitLabContext
  private _repo: RepoInfo
  private projectId: string

  constructor(
    token: string,
    baseUrl?: string,
    options?: GitLabClientOptions
  ) {
    this.context = new GitLabContext()

    // Configure GitLab client
    const gitlabConfig: {
      token: string
      host?: string
      rejectUnauthorized?: boolean
    } = {
      token
    }

    if (baseUrl) {
      gitlabConfig.host = baseUrl
    } else {
      gitlabConfig.host = this.context.getServerUrl()
    }

    // Handle SSL options
    if (options?.insecureSsl) {
      gitlabConfig.rejectUnauthorized = false
      warning('SSL certificate verification is disabled. This is not recommended for production.')
    }

    this.gitlab = new Gitlab(gitlabConfig)

    // Get project info from context
    this.projectId = this.context.getProjectId()
    this._repo = this.context.repo
  }

  getRepoInfo(): RepoInfo {
    return this._repo
  }

  async compareCommits(base: string, head: string): Promise<CompareResult> {
    try {
      const comparison = await this.gitlab.Repositories.compare(
        this.projectId,
        base,
        head
      ) as any

      const diffs = comparison.diffs || []
      const files: ChangedFile[] = diffs.map((diff: any) => ({
        filename: diff.new_path,
        status: this.mapDiffStatus(diff),
        additions: this.countAdditions(diff.diff),
        deletions: this.countDeletions(diff.diff),
        changes: this.countAdditions(diff.diff) + this.countDeletions(diff.diff),
        patch: diff.diff,
        previousFilename: diff.old_path !== diff.new_path ? diff.old_path : undefined
      }))

      const commitsList = comparison.commits || []
      const commits: Commit[] = commitsList.map((commit: any) => ({
        sha: commit.id,
        message: commit.message,
        author: {
          name: commit.author_name,
          email: commit.author_email,
          date: commit.authored_date
        }
      }))

      return {
        files,
        commits,
        aheadBy: commits.length,
        behindBy: 0, // GitLab compare doesn't provide this directly
        totalCommits: commits.length
      }
    } catch (e) {
      warning(`Failed to compare commits: ${e}`)
      throw e
    }
  }

  async getFileContent(path: string, ref: string): Promise<string> {
    try {
      const file = await this.gitlab.RepositoryFiles.show(
        this.projectId,
        path,
        ref
      ) as any

      if (file.encoding === 'base64') {
        return Buffer.from(file.content, 'base64').toString('utf-8')
      }

      return file.content
    } catch (e) {
      warning(`Failed to get file content: ${e}`)
      throw e
    }
  }

  async getMergeRequestInfo(mrNumber?: number): Promise<MergeRequestInfo> {
    const mrIid = mrNumber || this.context.getMergeRequestNumber()

    if (!mrIid) {
      throw new Error('No merge request number provided and none found in context')
    }

    try {
      const mr = await this.gitlab.MergeRequests.show(this.projectId, mrIid) as any

      return {
        number: mr.iid,
        title: mr.title,
        description: mr.description || '',
        state: this.mapMRState(mr.state),
        sourceBranch: String(mr.source_branch),
        targetBranch: String(mr.target_branch),
        baseSha: mr.diff_refs?.base_sha || '',
        headSha: mr.diff_refs?.head_sha || mr.sha || '',
        author: {
          login: mr.author?.username || 'unknown',
          id: mr.author?.id || 0
        },
        labels: Array.isArray(mr.labels) ? mr.labels.map((l: any) => typeof l === 'string' ? l : l.name || '') : [],
        createdAt: String(mr.created_at),
        updatedAt: String(mr.updated_at)
      }
    } catch (e) {
      warning(`Failed to get merge request info: ${e}`)
      throw e
    }
  }

  async listCommits(mrNumber: number): Promise<Commit[]> {
    try {
      const commits = await this.gitlab.MergeRequests.allCommits(
        this.projectId,
        mrNumber
      ) as any[]

      return commits.map((commit: any) => ({
        sha: commit.id,
        message: commit.message,
        author: {
          name: commit.author_name,
          email: commit.author_email,
          date: commit.authored_date
        }
      }))
    } catch (e) {
      warning(`Failed to list commits: ${e}`)
      throw e
    }
  }

  /**
   * Get the underlying GitLab client for advanced operations
   */
  getGitlab(): InstanceType<typeof Gitlab> {
    return this.gitlab
  }

  /**
   * Get the project ID
   */
  getProjectId(): string {
    return this.projectId
  }

  /**
   * Set the project ID (useful for testing or when not in CI context)
   */
  setProjectId(projectId: string): void {
    this.projectId = projectId
  }

  private mapDiffStatus(diff: any): 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' {
    if (diff.new_file) return 'added'
    if (diff.deleted_file) return 'removed'
    if (diff.renamed_file) return 'renamed'
    return 'modified'
  }

  private mapMRState(state: string): 'open' | 'closed' | 'merged' {
    switch (state) {
      case 'opened':
        return 'open'
      case 'closed':
        return 'closed'
      case 'merged':
        return 'merged'
      default:
        return 'open'
    }
  }

  private countAdditions(diff: string): number {
    if (!diff) return 0
    const lines = diff.split('\n')
    return lines.filter(line => line.startsWith('+') && !line.startsWith('+++')).length
  }

  private countDeletions(diff: string): number {
    if (!diff) return 0
    const lines = diff.split('\n')
    return lines.filter(line => line.startsWith('-') && !line.startsWith('---')).length
  }
}
