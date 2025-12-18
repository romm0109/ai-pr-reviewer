/**
 * GitLab Commenter
 *
 * Implements ICommenter for GitLab merge requests using discussions and notes
 */

import {info, warning} from '@actions/core'
import {
  ICommenter,
  Comment,
  ReviewComment,
  BufferedReviewComment
} from '../types'
import {GitLabClient} from './client'
import {GitLabContext} from './context'

// Comment tags for identification (same as GitHub for consistency)
export const COMMENT_GREETING = `<img src="https://avatars.githubusercontent.com/in/347564?s=41" alt="CodeRabbit" width="20" height="20">   CodeRabbit`

export const COMMENT_TAG =
  '<!-- This is an auto-generated comment by OSS CodeRabbit -->'

export const COMMENT_REPLY_TAG =
  '<!-- This is an auto-generated reply by OSS CodeRabbit -->'

export const SUMMARIZE_TAG =
  '<!-- This is an auto-generated comment: summarize by OSS CodeRabbit -->'

export const IN_PROGRESS_START_TAG =
  '<!-- This is an auto-generated comment: summarize review in progress by OSS CodeRabbit -->'

export const IN_PROGRESS_END_TAG =
  '<!-- end of auto-generated comment: summarize review in progress by OSS CodeRabbit -->'

export const DESCRIPTION_START_TAG =
  '<!-- This is an auto-generated comment: release notes by OSS CodeRabbit -->'
export const DESCRIPTION_END_TAG =
  '<!-- end of auto-generated comment: release notes by OSS CodeRabbit -->'

export const RAW_SUMMARY_START_TAG = `<!-- This is an auto-generated comment: raw summary by OSS CodeRabbit -->
<!--
`
export const RAW_SUMMARY_END_TAG = `-->
<!-- end of auto-generated comment: raw summary by OSS CodeRabbit -->`

export const SHORT_SUMMARY_START_TAG = `<!-- This is an auto-generated comment: short summary by OSS CodeRabbit -->
<!--
`

export const SHORT_SUMMARY_END_TAG = `-->
<!-- end of auto-generated comment: short summary by OSS CodeRabbit -->`

export const COMMIT_ID_START_TAG = '<!-- commit_ids_reviewed_start -->'
export const COMMIT_ID_END_TAG = '<!-- commit_ids_reviewed_end -->'

/**
 * GitLab commenter implementation
 *
 * Uses GitLab's Notes API for MR comments and Discussions API for inline comments
 */
export class GitLabCommenter implements ICommenter {
  private client: GitLabClient
  private context: GitLabContext
  private reviewCommentsBuffer: BufferedReviewComment[] = []
  private notesCache: Record<number, Comment[]> = {}
  private discussionsCache: Record<number, ReviewComment[]> = {}

  constructor(client: GitLabClient, context: GitLabContext) {
    this.client = client
    this.context = context
  }

  async comment(
    message: string,
    tag: string,
    mode: 'create' | 'replace'
  ): Promise<void> {
    const mrNumber = this.context.getMergeRequestNumber()
    if (!mrNumber) {
      warning('Skipped: no merge request number found in context')
      return
    }

    if (!tag) {
      tag = COMMENT_TAG
    }

    const body = `${COMMENT_GREETING}

${message}

${tag}`

    if (mode === 'create') {
      await this.createNote(body, mrNumber)
    } else {
      await this.replaceNote(body, tag, mrNumber)
    }
  }

  async updateDescription(mrNumber: number, message: string): Promise<void> {
    try {
      const gitlab = this.client.getGitlab()
      const projectId = this.client.getProjectId()

      const mr = await gitlab.MergeRequests.show(projectId, mrNumber) as any
      let description = mr.description || ''

      // Remove existing release notes section
      description = this.getDescription(description)

      const messageClean = this.removeContentWithinTags(
        message,
        DESCRIPTION_START_TAG,
        DESCRIPTION_END_TAG
      )
      const newDescription = `${description}\n${DESCRIPTION_START_TAG}\n${messageClean}\n${DESCRIPTION_END_TAG}`

      await gitlab.MergeRequests.edit(projectId, mrNumber, {
        description: newDescription
      })
    } catch (e) {
      warning(
        `Failed to update MR description: ${e}, skipping adding release notes.`
      )
    }
  }

  async bufferReviewComment(
    path: string,
    startLine: number,
    endLine: number,
    message: string
  ): Promise<void> {
    const formattedMessage = `${COMMENT_GREETING}

${message}

${COMMENT_TAG}`
    this.reviewCommentsBuffer.push({
      path,
      startLine,
      endLine,
      message: formattedMessage
    })
  }

  async deletePendingReview(_mrNumber: number): Promise<void> {
    // GitLab doesn't have a concept of pending reviews like GitHub
    // Comments are posted immediately as discussions
    // This is a no-op for GitLab
  }

  async submitReview(
    mrNumber: number,
    commitId: string,
    statusMsg: string
  ): Promise<void> {
    const gitlab = this.client.getGitlab()
    const projectId = this.client.getProjectId()

    // Post status message as a regular note
    const body = `${COMMENT_GREETING}

${statusMsg}
`

    if (this.reviewCommentsBuffer.length === 0) {
      info(`Submitting empty review for MR !${mrNumber}`)
      try {
        await gitlab.MergeRequestNotes.create(projectId, mrNumber, body)
      } catch (e) {
        warning(`Failed to submit empty review: ${e}`)
      }
      return
    }

    // Post each buffered comment as a discussion on the diff
    let commentCounter = 0
    for (const comment of this.reviewCommentsBuffer) {
      try {
        // Check for existing comments at the same location and delete them
        const existingComments = await this.getCommentsAtRange(
          mrNumber,
          comment.path,
          comment.startLine,
          comment.endLine
        )

        for (const existing of existingComments) {
          if (existing.body.includes(COMMENT_TAG)) {
            try {
              // In GitLab, we need to resolve or delete the discussion
              // For simplicity, we'll just add a new comment
              info(`Found existing comment at ${comment.path}:${comment.startLine}-${comment.endLine}`)
            } catch (e) {
              warning(`Failed to handle existing comment: ${e}`)
            }
          }
        }

        // Create a new discussion on the diff
        // GitLab uses position-based comments for diff discussions
        const baseSha = await this.getBaseSha(mrNumber)
        await gitlab.MergeRequestDiscussions.create(
          projectId,
          mrNumber,
          comment.message,
          {
            position: {
              baseSha: baseSha,
              startSha: baseSha,
              headSha: commitId,
              positionType: 'text',
              newPath: comment.path,
              newLine: comment.endLine,
              oldPath: comment.path
            }
          } as any
        )

        commentCounter++
        info(`Comment ${commentCounter}/${this.reviewCommentsBuffer.length} posted`)
      } catch (e) {
        warning(`Failed to create discussion for ${comment.path}:${comment.startLine}-${comment.endLine}: ${e}`)

        // Fallback: post as a regular note with file reference
        try {
          const fallbackMessage = `**${comment.path}** (lines ${comment.startLine}-${comment.endLine})

${comment.message}`
          await gitlab.MergeRequestNotes.create(projectId, mrNumber, fallbackMessage)
          commentCounter++
          info(`Fallback comment ${commentCounter}/${this.reviewCommentsBuffer.length} posted`)
        } catch (ee) {
          warning(`Failed to create fallback note: ${ee}`)
        }
      }
    }

    // Clear the buffer after submission
    this.reviewCommentsBuffer = []
  }

  async reviewCommentReply(
    mrNumber: number,
    topLevelComment: ReviewComment,
    message: string
  ): Promise<void> {
    const gitlab = this.client.getGitlab()
    const projectId = this.client.getProjectId()

    const reply = `${COMMENT_GREETING}

${message}

${COMMENT_REPLY_TAG}
`

    try {
      // In GitLab, we need to find the discussion ID and add a note to it
      // The topLevelComment.id should be the discussion ID or note ID
      const discussions = await gitlab.MergeRequestDiscussions.all(projectId, mrNumber) as any[]

      for (const discussion of discussions) {
        const notes = discussion.notes || []
        const matchingNote = notes.find((n: any) => n.id === topLevelComment.id)
        if (matchingNote) {
          // addNote requires: projectId, mergerequestId, discussionId, noteId, body
          await gitlab.MergeRequestDiscussions.addNote(
            projectId,
            mrNumber,
            discussion.id,
            notes[0].id,
            reply
          )
          return
        }
      }

      // If we couldn't find the discussion, create a new note
      warning(`Could not find discussion for comment ${topLevelComment.id}, creating new note`)
      await gitlab.MergeRequestNotes.create(projectId, mrNumber, reply)
    } catch (error) {
      warning(`Failed to reply to comment: ${error}`)
    }
  }

  async listComments(mrNumber: number): Promise<Comment[]> {
    if (this.notesCache[mrNumber]) {
      return this.notesCache[mrNumber]
    }

    const gitlab = this.client.getGitlab()
    const projectId = this.client.getProjectId()
    const allComments: Comment[] = []

    try {
      const notes = await gitlab.MergeRequestNotes.all(projectId, mrNumber) as any[]

      for (const note of notes) {
        // Skip system notes
        if (note.system) continue

        allComments.push({
          id: note.id,
          body: note.body,
          author: {
            login: note.author?.username || 'unknown',
            id: note.author?.id || 0
          },
          createdAt: String(note.created_at),
          updatedAt: String(note.updated_at || note.created_at)
        })
      }

      this.notesCache[mrNumber] = allComments
      return allComments
    } catch (e) {
      warning(`Failed to list notes: ${e}`)
      return allComments
    }
  }

  async listReviewComments(mrNumber: number): Promise<ReviewComment[]> {
    if (this.discussionsCache[mrNumber]) {
      return this.discussionsCache[mrNumber]
    }

    const gitlab = this.client.getGitlab()
    const projectId = this.client.getProjectId()
    const allComments: ReviewComment[] = []

    try {
      const discussions = await gitlab.MergeRequestDiscussions.all(projectId, mrNumber) as any[]

      for (const discussion of discussions) {
        const notes = discussion.notes || []
        for (let i = 0; i < notes.length; i++) {
          const note = notes[i]
          // Only include notes that have position (diff comments)
          const position = note.position
          if (!position) continue

          allComments.push({
            id: note.id,
            body: note.body,
            author: {
              login: note.author?.username || 'unknown',
              id: note.author?.id || 0
            },
            createdAt: String(note.created_at),
            updatedAt: String(note.updated_at || note.created_at),
            path: position.new_path || '',
            line: position.new_line || position.old_line || 0,
            startLine: undefined, // GitLab doesn't support multi-line comments in the same way
            side: position.new_line ? 'RIGHT' : 'LEFT',
            inReplyToId: i > 0 ? notes[0].id : undefined
          })
        }
      }

      this.discussionsCache[mrNumber] = allComments
      return allComments
    } catch (e) {
      warning(`Failed to list discussions: ${e}`)
      return allComments
    }
  }

  async findCommentWithTag(tag: string, mrNumber: number): Promise<Comment | null> {
    try {
      const comments = await this.listComments(mrNumber)
      for (const cmt of comments) {
        if (cmt.body && cmt.body.includes(tag)) {
          return cmt
        }
      }
      return null
    } catch (e) {
      warning(`Failed to find comment with tag: ${e}`)
      return null
    }
  }

  async getCommentsWithinRange(
    mrNumber: number,
    path: string,
    startLine: number,
    endLine: number
  ): Promise<ReviewComment[]> {
    const comments = await this.listReviewComments(mrNumber)
    return comments.filter(
      comment =>
        comment.path === path &&
        comment.body !== '' &&
        comment.line >= startLine &&
        comment.line <= endLine
    )
  }

  async getCommentsAtRange(
    mrNumber: number,
    path: string,
    startLine: number,
    endLine: number
  ): Promise<ReviewComment[]> {
    const comments = await this.listReviewComments(mrNumber)
    return comments.filter(
      comment =>
        comment.path === path &&
        comment.body !== '' &&
        comment.line >= startLine &&
        comment.line <= endLine
    )
  }

  async getCommentChainsWithinRange(
    mrNumber: number,
    path: string,
    startLine: number,
    endLine: number,
    tag = ''
  ): Promise<string> {
    const existingComments = await this.getCommentsWithinRange(
      mrNumber,
      path,
      startLine,
      endLine
    )

    const topLevelComments = existingComments.filter(c => !c.inReplyToId)

    let allChains = ''
    let chainNum = 0

    for (const topLevelComment of topLevelComments) {
      const chain = await this.composeCommentChain(existingComments, topLevelComment)
      if (chain && chain.includes(tag)) {
        chainNum += 1
        allChains += `Conversation Chain ${chainNum}:
${chain}
---
`
      }
    }

    return allChains
  }

  async getCommentChain(
    mrNumber: number,
    comment: ReviewComment
  ): Promise<{chain: string; topLevelComment: ReviewComment | null}> {
    try {
      const reviewComments = await this.listReviewComments(mrNumber)
      const topLevelComment = await this.getTopLevelComment(reviewComments, comment)
      const chain = await this.composeCommentChain(reviewComments, topLevelComment)
      return {chain, topLevelComment}
    } catch (e) {
      warning(`Failed to get conversation chain: ${e}`)
      return {chain: '', topLevelComment: null}
    }
  }

  async getAllCommitIds(): Promise<string[]> {
    const mrNumber = this.context.getMergeRequestNumber()
    if (!mrNumber) {
      return []
    }

    const commits = await this.client.listCommits(mrNumber)
    return commits.map(c => c.sha)
  }

  // Helper methods for comment body manipulation
  getContentWithinTags(content: string, startTag: string, endTag: string): string {
    const start = content.indexOf(startTag)
    const end = content.indexOf(endTag)
    if (start >= 0 && end >= 0) {
      return content.slice(start + startTag.length, end)
    }
    return ''
  }

  removeContentWithinTags(content: string, startTag: string, endTag: string): string {
    const start = content.indexOf(startTag)
    const end = content.lastIndexOf(endTag)
    if (start >= 0 && end >= 0) {
      return content.slice(0, start) + content.slice(end + endTag.length)
    }
    return content
  }

  getRawSummary(summary: string): string {
    return this.getContentWithinTags(summary, RAW_SUMMARY_START_TAG, RAW_SUMMARY_END_TAG)
  }

  getShortSummary(summary: string): string {
    return this.getContentWithinTags(summary, SHORT_SUMMARY_START_TAG, SHORT_SUMMARY_END_TAG)
  }

  getDescription(description: string): string {
    return this.removeContentWithinTags(
      description,
      DESCRIPTION_START_TAG,
      DESCRIPTION_END_TAG
    )
  }

  getReleaseNotes(description: string): string {
    const releaseNotes = this.getContentWithinTags(
      description,
      DESCRIPTION_START_TAG,
      DESCRIPTION_END_TAG
    )
    return releaseNotes.replace(/(^|\n)> .*/g, '')
  }

  getReviewedCommitIds(commentBody: string): string[] {
    const start = commentBody.indexOf(COMMIT_ID_START_TAG)
    const end = commentBody.indexOf(COMMIT_ID_END_TAG)
    if (start === -1 || end === -1) {
      return []
    }
    const ids = commentBody.substring(start + COMMIT_ID_START_TAG.length, end)
    return ids
      .split('<!--')
      .map(id => id.replace('-->', '').trim())
      .filter(id => id !== '')
  }

  getReviewedCommitIdsBlock(commentBody: string): string {
    const start = commentBody.indexOf(COMMIT_ID_START_TAG)
    const end = commentBody.indexOf(COMMIT_ID_END_TAG)
    if (start === -1 || end === -1) {
      return ''
    }
    return commentBody.substring(start, end + COMMIT_ID_END_TAG.length)
  }

  addReviewedCommitId(commentBody: string, commitId: string): string {
    const start = commentBody.indexOf(COMMIT_ID_START_TAG)
    const end = commentBody.indexOf(COMMIT_ID_END_TAG)
    if (start === -1 || end === -1) {
      return `${commentBody}\n${COMMIT_ID_START_TAG}\n<!-- ${commitId} -->\n${COMMIT_ID_END_TAG}`
    }
    const ids = commentBody.substring(start + COMMIT_ID_START_TAG.length, end)
    return `${commentBody.substring(
      0,
      start + COMMIT_ID_START_TAG.length
    )}${ids}<!-- ${commitId} -->\n${commentBody.substring(end)}`
  }

  getHighestReviewedCommitId(
    commitIds: string[],
    reviewedCommitIds: string[]
  ): string {
    for (let i = commitIds.length - 1; i >= 0; i--) {
      if (reviewedCommitIds.includes(commitIds[i])) {
        return commitIds[i]
      }
    }
    return ''
  }

  addInProgressStatus(commentBody: string, statusMsg: string): string {
    const start = commentBody.indexOf(IN_PROGRESS_START_TAG)
    const end = commentBody.indexOf(IN_PROGRESS_END_TAG)
    if (start === -1 || end === -1) {
      return `${IN_PROGRESS_START_TAG}

Currently reviewing new changes in this MR...

${statusMsg}

${IN_PROGRESS_END_TAG}

---

${commentBody}`
    }
    return commentBody
  }

  removeInProgressStatus(commentBody: string): string {
    const start = commentBody.indexOf(IN_PROGRESS_START_TAG)
    const end = commentBody.indexOf(IN_PROGRESS_END_TAG)
    if (start !== -1 && end !== -1) {
      return (
        commentBody.substring(0, start) +
        commentBody.substring(end + IN_PROGRESS_END_TAG.length)
      )
    }
    return commentBody
  }

  // Private helper methods
  private async createNote(body: string, mrNumber: number): Promise<void> {
    try {
      const gitlab = this.client.getGitlab()
      const projectId = this.client.getProjectId()

      const note = await gitlab.MergeRequestNotes.create(projectId, mrNumber, body) as any

      if (this.notesCache[mrNumber]) {
        this.notesCache[mrNumber].push({
          id: note.id,
          body: note.body,
          author: {
            login: note.author?.username || 'unknown',
            id: note.author?.id || 0
          },
          createdAt: String(note.created_at),
          updatedAt: String(note.updated_at || note.created_at)
        })
      }
    } catch (e) {
      warning(`Failed to create note: ${e}`)
    }
  }

  private async replaceNote(body: string, tag: string, mrNumber: number): Promise<void> {
    try {
      const cmt = await this.findCommentWithTag(tag, mrNumber)
      if (cmt) {
        const gitlab = this.client.getGitlab()
        const projectId = this.client.getProjectId()

        await gitlab.MergeRequestNotes.edit(projectId, mrNumber, cmt.id, {body})
      } else {
        await this.createNote(body, mrNumber)
      }
    } catch (e) {
      warning(`Failed to replace note: ${e}`)
    }
  }

  private async composeCommentChain(
    reviewComments: ReviewComment[],
    topLevelComment: ReviewComment
  ): Promise<string> {
    const conversationChain = reviewComments
      .filter(cmt => cmt.inReplyToId === topLevelComment.id)
      .map(cmt => `${cmt.author.login}: ${cmt.body}`)

    conversationChain.unshift(`${topLevelComment.author.login}: ${topLevelComment.body}`)

    return conversationChain.join('\n---\n')
  }

  private async getTopLevelComment(
    reviewComments: ReviewComment[],
    comment: ReviewComment
  ): Promise<ReviewComment> {
    let topLevelComment = comment

    while (topLevelComment.inReplyToId) {
      const parentComment = reviewComments.find(
        cmt => cmt.id === topLevelComment.inReplyToId
      )

      if (parentComment) {
        topLevelComment = parentComment
      } else {
        break
      }
    }

    return topLevelComment
  }

  private async getBaseSha(mrNumber: number): Promise<string> {
    try {
      const mrInfo = await this.client.getMergeRequestInfo(mrNumber)
      return mrInfo.baseSha
    } catch (e) {
      warning(`Failed to get base SHA: ${e}`)
      return ''
    }
  }
}
