/**
 * GitLab CI Context
 *
 * Provides platform context for GitLab CI environment
 */

import {
  IPlatformContext,
  MergeRequestInfo,
  RepoInfo
} from '../types'

/**
 * GitLab CI context implementation
 *
 * Reads context from GitLab CI predefined environment variables:
 * - CI_MERGE_REQUEST_IID: Merge request internal ID
 * - CI_PROJECT_ID: Project ID
 * - CI_PROJECT_PATH: namespace/project path
 * - CI_MERGE_REQUEST_DIFF_BASE_SHA: Base commit SHA
 * - CI_COMMIT_SHA: Head commit SHA
 * - CI_PIPELINE_SOURCE: Pipeline trigger source
 * - CI_MERGE_REQUEST_TITLE: MR title
 * - CI_MERGE_REQUEST_DESCRIPTION: MR description
 * - CI_MERGE_REQUEST_SOURCE_BRANCH_NAME: Source branch
 * - CI_MERGE_REQUEST_TARGET_BRANCH_NAME: Target branch
 */
export class GitLabContext implements IPlatformContext {
  get eventName(): string {
    const pipelineSource = process.env.CI_PIPELINE_SOURCE || ''
    if (pipelineSource === 'merge_request_event') {
      return 'merge_request'
    }
    if (process.env.CI_NOTE_ID) {
      return 'note' // Comment event
    }
    return pipelineSource
  }

  get repo(): RepoInfo {
    const projectPath = process.env.CI_PROJECT_PATH || ''
    const parts = projectPath.split('/')
    const repo = parts.pop() || ''
    const owner = parts.join('/')

    return {
      owner,
      repo,
      fullName: projectPath
    }
  }

  get payload(): Record<string, unknown> {
    // Construct a payload-like object from environment variables
    return {
      project_id: process.env.CI_PROJECT_ID,
      project_path: process.env.CI_PROJECT_PATH,
      merge_request_iid: process.env.CI_MERGE_REQUEST_IID,
      pipeline_source: process.env.CI_PIPELINE_SOURCE,
      commit_sha: process.env.CI_COMMIT_SHA,
      base_sha: process.env.CI_MERGE_REQUEST_DIFF_BASE_SHA,
      source_branch: process.env.CI_MERGE_REQUEST_SOURCE_BRANCH_NAME,
      target_branch: process.env.CI_MERGE_REQUEST_TARGET_BRANCH_NAME,
      title: process.env.CI_MERGE_REQUEST_TITLE,
      description: process.env.CI_MERGE_REQUEST_DESCRIPTION,
      author_username: process.env.GITLAB_USER_LOGIN,
      note_id: process.env.CI_NOTE_ID
    }
  }

  get mergeRequest(): MergeRequestInfo | null {
    const mrIid = process.env.CI_MERGE_REQUEST_IID
    if (!mrIid) {
      return null
    }

    return {
      number: parseInt(mrIid, 10),
      title: process.env.CI_MERGE_REQUEST_TITLE || '',
      description: process.env.CI_MERGE_REQUEST_DESCRIPTION || '',
      state: 'open', // If we're in a MR pipeline, it's open
      sourceBranch: process.env.CI_MERGE_REQUEST_SOURCE_BRANCH_NAME || '',
      targetBranch: process.env.CI_MERGE_REQUEST_TARGET_BRANCH_NAME || '',
      baseSha: process.env.CI_MERGE_REQUEST_DIFF_BASE_SHA || '',
      headSha: process.env.CI_COMMIT_SHA || '',
      author: {
        login: process.env.GITLAB_USER_LOGIN || 'unknown',
        id: parseInt(process.env.GITLAB_USER_ID || '0', 10)
      },
      labels: (process.env.CI_MERGE_REQUEST_LABELS || '').split(',').filter(l => l),
      createdAt: '', // Not available in CI variables
      updatedAt: ''
    }
  }

  isMergeRequestEvent(): boolean {
    return process.env.CI_PIPELINE_SOURCE === 'merge_request_event'
  }

  isReviewCommentEvent(): boolean {
    // GitLab uses "note" events for comments
    return !!process.env.CI_NOTE_ID
  }

  getMergeRequestNumber(): number | null {
    const mrIid = process.env.CI_MERGE_REQUEST_IID
    if (mrIid) {
      return parseInt(mrIid, 10)
    }
    return null
  }

  /**
   * Get the GitLab project ID
   */
  getProjectId(): string {
    return process.env.CI_PROJECT_ID || ''
  }

  /**
   * Get the GitLab project path (namespace/project)
   */
  getProjectPath(): string {
    return process.env.CI_PROJECT_PATH || ''
  }

  /**
   * Get the GitLab server URL
   */
  getServerUrl(): string {
    return process.env.CI_SERVER_URL || 'https://gitlab.com'
  }

  /**
   * Get the GitLab API URL
   */
  getApiUrl(): string {
    const serverUrl = this.getServerUrl()
    return `${serverUrl}/api/v4`
  }

  /**
   * Check if running in GitLab CI
   */
  isGitLabCI(): boolean {
    return process.env.GITLAB_CI === 'true'
  }

  /**
   * Get the note/comment ID if this is a comment event
   */
  getNoteId(): number | null {
    const noteId = process.env.CI_NOTE_ID
    if (noteId) {
      return parseInt(noteId, 10)
    }
    return null
  }
}
