/**
 * Platform Abstraction Layer Types
 *
 * This module defines platform-agnostic interfaces for interacting with
 * code hosting platforms (GitHub, GitLab, etc.)
 */

/**
 * Represents a file changed in a merge request/pull request
 */
export interface ChangedFile {
  filename: string
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed'
  additions: number
  deletions: number
  changes: number
  patch?: string
  previousFilename?: string
}

/**
 * Represents a commit in the repository
 */
export interface Commit {
  sha: string
  message: string
  author: {
    name: string
    email: string
    date: string
  }
}

/**
 * Result of comparing two commits
 */
export interface CompareResult {
  files: ChangedFile[]
  commits: Commit[]
  aheadBy: number
  behindBy: number
  totalCommits: number
}

/**
 * Information about a merge request / pull request
 */
export interface MergeRequestInfo {
  number: number
  title: string
  description: string
  state: 'open' | 'closed' | 'merged'
  sourceBranch: string
  targetBranch: string
  baseSha: string
  headSha: string
  author: {
    login: string
    id: number
  }
  labels: string[]
  createdAt: string
  updatedAt: string
}

/**
 * Repository information
 */
export interface RepoInfo {
  owner: string
  repo: string
  fullName: string
}

/**
 * Comment on a merge request / pull request
 */
export interface Comment {
  id: number
  body: string
  author: {
    login: string
    id: number
  }
  createdAt: string
  updatedAt: string
}

/**
 * Review comment on a specific line of code
 */
export interface ReviewComment extends Comment {
  path: string
  line: number
  startLine?: number
  side: 'LEFT' | 'RIGHT'
  inReplyToId?: number
}

/**
 * Buffered review comment for batch submission
 */
export interface BufferedReviewComment {
  path: string
  startLine: number
  endLine: number
  message: string
}

/**
 * Platform-agnostic interface for repository operations
 */
export interface IPlatformClient {
  /**
   * Compare commits between two refs
   * @param base - Base commit SHA or ref
   * @param head - Head commit SHA or ref
   * @returns Comparison result with files and commits
   */
  compareCommits(base: string, head: string): Promise<CompareResult>

  /**
   * Get file content at a specific ref
   * @param path - File path relative to repository root
   * @param ref - Commit SHA or ref
   * @returns File content as string
   */
  getFileContent(path: string, ref: string): Promise<string>

  /**
   * Get merge request / pull request information
   * @param mrNumber - Merge request number (optional, uses context if not provided)
   * @returns Merge request information
   */
  getMergeRequestInfo(mrNumber?: number): Promise<MergeRequestInfo>

  /**
   * List commits in a merge request / pull request
   * @param mrNumber - Merge request number
   * @returns Array of commits
   */
  listCommits(mrNumber: number): Promise<Commit[]>

  /**
   * Get repository information
   * @returns Repository info
   */
  getRepoInfo(): RepoInfo
}

/**
 * Platform-agnostic interface for comment management
 */
export interface ICommenter {
  /**
   * Post or update a comment on a merge request
   * @param message - Comment message
   * @param tag - Unique tag to identify the comment for updates
   * @param mode - 'create' to always create new, 'replace' to update existing
   */
  comment(message: string, tag: string, mode: 'create' | 'replace'): Promise<void>

  /**
   * Update the merge request description
   * @param mrNumber - Merge request number
   * @param message - Message to add to description
   */
  updateDescription(mrNumber: number, message: string): Promise<void>

  /**
   * Buffer a review comment for batch submission
   * @param path - File path
   * @param startLine - Start line number
   * @param endLine - End line number
   * @param message - Comment message
   */
  bufferReviewComment(
    path: string,
    startLine: number,
    endLine: number,
    message: string
  ): Promise<void>

  /**
   * Submit all buffered review comments
   * @param mrNumber - Merge request number
   * @param commitId - Commit SHA to attach review to
   * @param statusMsg - Status message for the review
   */
  submitReview(mrNumber: number, commitId: string, statusMsg: string): Promise<void>

  /**
   * Reply to an existing review comment
   * @param mrNumber - Merge request number
   * @param topLevelComment - The comment to reply to
   * @param message - Reply message
   */
  reviewCommentReply(
    mrNumber: number,
    topLevelComment: ReviewComment,
    message: string
  ): Promise<void>

  /**
   * Delete pending review if exists
   * @param mrNumber - Merge request number
   */
  deletePendingReview(mrNumber: number): Promise<void>

  /**
   * List all comments on a merge request
   * @param mrNumber - Merge request number
   * @returns Array of comments
   */
  listComments(mrNumber: number): Promise<Comment[]>

  /**
   * List all review comments on a merge request
   * @param mrNumber - Merge request number
   * @returns Array of review comments
   */
  listReviewComments(mrNumber: number): Promise<ReviewComment[]>

  /**
   * Find a comment with a specific tag
   * @param tag - Tag to search for
   * @param mrNumber - Merge request number
   * @returns Comment if found, null otherwise
   */
  findCommentWithTag(tag: string, mrNumber: number): Promise<Comment | null>

  /**
   * Get comments within a line range
   * @param mrNumber - Merge request number
   * @param path - File path
   * @param startLine - Start line
   * @param endLine - End line
   * @returns Array of review comments
   */
  getCommentsWithinRange(
    mrNumber: number,
    path: string,
    startLine: number,
    endLine: number
  ): Promise<ReviewComment[]>

  /**
   * Get comments at exact line range
   * @param mrNumber - Merge request number
   * @param path - File path
   * @param startLine - Start line
   * @param endLine - End line
   * @returns Array of review comments
   */
  getCommentsAtRange(
    mrNumber: number,
    path: string,
    startLine: number,
    endLine: number
  ): Promise<ReviewComment[]>

  /**
   * Get comment chains within a line range
   * @param mrNumber - Merge request number
   * @param path - File path
   * @param startLine - Start line
   * @param endLine - End line
   * @param tag - Optional tag to filter by
   * @returns Formatted comment chains string
   */
  getCommentChainsWithinRange(
    mrNumber: number,
    path: string,
    startLine: number,
    endLine: number,
    tag?: string
  ): Promise<string>

  /**
   * Get the comment chain for a specific comment
   * @param mrNumber - Merge request number
   * @param comment - The comment to get chain for
   * @returns Chain string and top level comment
   */
  getCommentChain(
    mrNumber: number,
    comment: ReviewComment
  ): Promise<{chain: string; topLevelComment: ReviewComment | null}>

  /**
   * Get all commit IDs in a merge request
   * @returns Array of commit SHAs
   */
  getAllCommitIds(): Promise<string[]>

  // Helper methods for comment body manipulation
  getContentWithinTags(content: string, startTag: string, endTag: string): string
  removeContentWithinTags(content: string, startTag: string, endTag: string): string
  getRawSummary(summary: string): string
  getShortSummary(summary: string): string
  getDescription(description: string): string
  getReleaseNotes(description: string): string
  getReviewedCommitIds(commentBody: string): string[]
  getReviewedCommitIdsBlock(commentBody: string): string
  addReviewedCommitId(commentBody: string, commitId: string): string
  getHighestReviewedCommitId(commitIds: string[], reviewedCommitIds: string[]): string
  addInProgressStatus(commentBody: string, statusMsg: string): string
  removeInProgressStatus(commentBody: string): string
}

/**
 * Platform-agnostic interface for CI/CD context
 */
export interface IPlatformContext {
  /**
   * The event that triggered the workflow
   * e.g., 'pull_request', 'merge_request', 'push'
   */
  eventName: string

  /**
   * The merge request / pull request payload (if applicable)
   */
  mergeRequest: MergeRequestInfo | null

  /**
   * Repository information
   */
  repo: RepoInfo

  /**
   * The payload from the CI event
   */
  payload: Record<string, unknown>

  /**
   * Check if this is a merge request event
   */
  isMergeRequestEvent(): boolean

  /**
   * Check if this is a review comment event
   */
  isReviewCommentEvent(): boolean

  /**
   * Get the merge request number from context
   */
  getMergeRequestNumber(): number | null
}

/**
 * Supported platform types
 */
export type PlatformType = 'github' | 'gitlab'

/**
 * Configuration for platform initialization
 */
export interface PlatformConfig {
  platform: PlatformType
  token: string
  baseUrl?: string
  insecureSsl?: boolean
  caCert?: string
}

/**
 * Platform factory result containing all platform components
 */
export interface Platform {
  type: PlatformType
  client: IPlatformClient
  commenter: ICommenter
  context: IPlatformContext
}
