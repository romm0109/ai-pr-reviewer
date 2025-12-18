/**
 * GitHub Actions Context
 *
 * Provides platform context for GitHub Actions environment
 */

import {context as githubContext} from '@actions/github'
import {
  IPlatformContext,
  MergeRequestInfo,
  RepoInfo
} from '../types'

/**
 * GitHub Actions context implementation
 */
export class GitHubContext implements IPlatformContext {
  private _context = githubContext

  get eventName(): string {
    return this._context.eventName
  }

  get repo(): RepoInfo {
    return {
      owner: this._context.repo.owner,
      repo: this._context.repo.repo,
      fullName: `${this._context.repo.owner}/${this._context.repo.repo}`
    }
  }

  get payload(): Record<string, unknown> {
    return this._context.payload as Record<string, unknown>
  }

  get mergeRequest(): MergeRequestInfo | null {
    const pr = this._context.payload.pull_request
    if (!pr) {
      return null
    }

    return {
      number: pr.number as number,
      title: pr.title as string,
      description: (pr.body as string) || '',
      state: this.mapPRState(pr.state as string),
      sourceBranch: (pr.head as {ref: string}).ref,
      targetBranch: (pr.base as {ref: string}).ref,
      baseSha: (pr.base as {sha: string}).sha,
      headSha: (pr.head as {sha: string}).sha,
      author: {
        login: (pr.user as {login: string}).login,
        id: (pr.user as {id: number}).id
      },
      labels: ((pr.labels as Array<{name: string}>) || []).map(l => l.name),
      createdAt: pr.created_at as string,
      updatedAt: pr.updated_at as string
    }
  }

  isMergeRequestEvent(): boolean {
    return (
      this._context.eventName === 'pull_request' ||
      this._context.eventName === 'pull_request_target'
    )
  }

  isReviewCommentEvent(): boolean {
    return this._context.eventName === 'pull_request_review_comment'
  }

  getMergeRequestNumber(): number | null {
    if (this._context.payload.pull_request) {
      return this._context.payload.pull_request.number as number
    }
    if (this._context.payload.issue) {
      return this._context.payload.issue.number as number
    }
    return null
  }

  /**
   * Get the raw GitHub context for advanced use cases
   */
  getRawContext(): typeof githubContext {
    return this._context
  }

  /**
   * Get the pull request payload directly
   */
  getPullRequestPayload(): Record<string, unknown> | null {
    return this._context.payload.pull_request as Record<string, unknown> | null
  }

  /**
   * Get the comment payload for review comment events
   */
  getCommentPayload(): Record<string, unknown> | null {
    return this._context.payload.comment as Record<string, unknown> | null
  }

  private mapPRState(state: string): 'open' | 'closed' | 'merged' {
    if (state === 'open') return 'open'
    if (state === 'closed') return 'closed'
    // GitHub doesn't have a 'merged' state, it's 'closed' with merged=true
    return 'closed'
  }
}
