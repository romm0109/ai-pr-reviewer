/**
 * GitHub Commenter
 *
 * Implements ICommenter for GitHub pull requests
 */

import {getInput, info, warning} from '@actions/core'
import {
  ICommenter,
  Comment,
  ReviewComment,
  BufferedReviewComment
} from '../types'
import {GitHubClient} from './client'
import {GitHubContext} from './context'

// Comment tags for identification
export const COMMENT_GREETING = `${getInput('bot_icon') || '<img src="https://avatars.githubusercontent.com/in/347564?s=41" alt="Image description" width="20" height="20">'}   CodeRabbit`

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
 * GitHub commenter implementation
 */
export class GitHubCommenter implements ICommenter {
  private client: GitHubClient
  private context: GitHubContext
  private reviewCommentsBuffer: BufferedReviewComment[] = []
  private reviewCommentsCache: Record<number, ReviewComment[]> = {}
  private issueCommentsCache: Record<number, Comment[]> = {}

  constructor(client: GitHubClient, context: GitHubContext) {
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
      warning('Skipped: no pull request or issue number found in context')
      return
    }

    if (!tag) {
      tag = COMMENT_TAG
    }

    const body = `${COMMENT_GREETING}

${message}

${tag}`

    if (mode === 'create') {
      await this.create(body, mrNumber)
    } else {
      await this.replace(body, tag, mrNumber)
    }
  }

  async updateDescription(mrNumber: number, message: string): Promise<void> {
    try {
      const octokit = this.client.getOctokit()
      const repo = this.client.getRepoInfo()

      const pr = await octokit.pulls.get({
        owner: repo.owner,
        repo: repo.repo,
        pull_number: mrNumber
      })

      let body = pr.data.body || ''
      const description = this.getDescription(body)

      const messageClean = this.removeContentWithinTags(
        message,
        DESCRIPTION_START_TAG,
        DESCRIPTION_END_TAG
      )
      const newDescription = `${description}\n${DESCRIPTION_START_TAG}\n${messageClean}\n${DESCRIPTION_END_TAG}`

      await octokit.pulls.update({
        owner: repo.owner,
        repo: repo.repo,
        pull_number: mrNumber,
        body: newDescription
      })
    } catch (e) {
      warning(
        `Failed to update PR description: ${e}, skipping adding release notes.`
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

  async deletePendingReview(mrNumber: number): Promise<void> {
    try {
      const octokit = this.client.getOctokit()
      const repo = this.client.getRepoInfo()

      const reviews = await octokit.pulls.listReviews({
        owner: repo.owner,
        repo: repo.repo,
        pull_number: mrNumber
      })

      const pendingReview = reviews.data.find(
        (review: {state: string}) => review.state === 'PENDING'
      )

      if (pendingReview) {
        info(`Deleting pending review for PR #${mrNumber} id: ${pendingReview.id}`)
        try {
          await octokit.pulls.deletePendingReview({
            owner: repo.owner,
            repo: repo.repo,
            pull_number: mrNumber,
            review_id: pendingReview.id
          })
        } catch (e) {
          warning(`Failed to delete pending review: ${e}`)
        }
      }
    } catch (e) {
      warning(`Failed to list reviews: ${e}`)
    }
  }

  async submitReview(
    mrNumber: number,
    commitId: string,
    statusMsg: string
  ): Promise<void> {
    const octokit = this.client.getOctokit()
    const repo = this.client.getRepoInfo()

    const body = `${COMMENT_GREETING}

${statusMsg}
`

    if (this.reviewCommentsBuffer.length === 0) {
      info(`Submitting empty review for PR #${mrNumber}`)
      try {
        await octokit.pulls.createReview({
          owner: repo.owner,
          repo: repo.repo,
          pull_number: mrNumber,
          commit_id: commitId,
          event: 'COMMENT',
          body
        })
      } catch (e) {
        warning(`Failed to submit empty review: ${e}`)
      }
      return
    }

    // Delete existing comments at the same ranges
    for (const comment of this.reviewCommentsBuffer) {
      const comments = await this.getCommentsAtRange(
        mrNumber,
        comment.path,
        comment.startLine,
        comment.endLine
      )
      for (const c of comments) {
        if (c.body.includes(COMMENT_TAG)) {
          info(
            `Deleting review comment for ${comment.path}:${comment.startLine}-${comment.endLine}`
          )
          try {
            await octokit.pulls.deleteReviewComment({
              owner: repo.owner,
              repo: repo.repo,
              comment_id: c.id
            })
          } catch (e) {
            warning(`Failed to delete review comment: ${e}`)
          }
        }
      }
    }

    await this.deletePendingReview(mrNumber)

    const generateCommentData = (comment: BufferedReviewComment) => {
      const commentData: Record<string, unknown> = {
        path: comment.path,
        body: comment.message,
        line: comment.endLine
      }

      if (comment.startLine !== comment.endLine) {
        commentData.start_line = comment.startLine
        commentData.start_side = 'RIGHT'
      }

      return commentData
    }

    try {
      const review = await octokit.pulls.createReview({
        owner: repo.owner,
        repo: repo.repo,
        pull_number: mrNumber,
        commit_id: commitId,
        comments: this.reviewCommentsBuffer.map(comment =>
          generateCommentData(comment)
        ) as Array<{path: string; body: string; line: number}>
      })

      info(
        `Submitting review for PR #${mrNumber}, total comments: ${this.reviewCommentsBuffer.length}, review id: ${review.data.id}`
      )

      await octokit.pulls.submitReview({
        owner: repo.owner,
        repo: repo.repo,
        pull_number: mrNumber,
        review_id: review.data.id,
        event: 'COMMENT',
        body
      })
    } catch (e) {
      warning(`Failed to create review: ${e}. Falling back to individual comments.`)
      await this.deletePendingReview(mrNumber)

      let commentCounter = 0
      for (const comment of this.reviewCommentsBuffer) {
        info(
          `Creating new review comment for ${comment.path}:${comment.startLine}-${comment.endLine}`
        )
        const commentData = {
          owner: repo.owner,
          repo: repo.repo,
          pull_number: mrNumber,
          commit_id: commitId,
          ...generateCommentData(comment)
        }

        try {
          await octokit.pulls.createReviewComment(
            commentData as Parameters<typeof octokit.pulls.createReviewComment>[0]
          )
        } catch (ee) {
          warning(`Failed to create review comment: ${ee}`)
        }

        commentCounter++
        info(`Comment ${commentCounter}/${this.reviewCommentsBuffer.length} posted`)
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
    const octokit = this.client.getOctokit()
    const repo = this.client.getRepoInfo()

    const reply = `${COMMENT_GREETING}

${message}

${COMMENT_REPLY_TAG}
`
    try {
      await octokit.pulls.createReplyForReviewComment({
        owner: repo.owner,
        repo: repo.repo,
        pull_number: mrNumber,
        body: reply,
        comment_id: topLevelComment.id
      })
    } catch (error) {
      warning(`Failed to reply to the top-level comment ${error}`)
      try {
        await octokit.pulls.createReplyForReviewComment({
          owner: repo.owner,
          repo: repo.repo,
          pull_number: mrNumber,
          body: `Could not post the reply due to error: ${error}`,
          comment_id: topLevelComment.id
        })
      } catch (e) {
        warning(`Failed to reply to the top-level comment ${e}`)
      }
    }

    try {
      if (topLevelComment.body.includes(COMMENT_TAG)) {
        const newBody = topLevelComment.body.replace(COMMENT_TAG, COMMENT_REPLY_TAG)
        await octokit.pulls.updateReviewComment({
          owner: repo.owner,
          repo: repo.repo,
          comment_id: topLevelComment.id,
          body: newBody
        })
      }
    } catch (error) {
      warning(`Failed to update the top-level comment ${error}`)
    }
  }

  async listComments(mrNumber: number): Promise<Comment[]> {
    if (this.issueCommentsCache[mrNumber]) {
      return this.issueCommentsCache[mrNumber]
    }

    const octokit = this.client.getOctokit()
    const repo = this.client.getRepoInfo()
    const allComments: Comment[] = []
    let page = 1

    try {
      while (true) {
        const {data: comments} = await octokit.issues.listComments({
          owner: repo.owner,
          repo: repo.repo,
          issue_number: mrNumber,
          page,
          per_page: 100
        })

        allComments.push(
          ...comments.map((c: {id: number; body?: string; user?: {login: string; id: number} | null; created_at: string; updated_at: string}) => ({
            id: c.id,
            body: c.body || '',
            author: {
              login: c.user?.login || 'unknown',
              id: c.user?.id || 0
            },
            createdAt: c.created_at,
            updatedAt: c.updated_at
          }))
        )

        page++
        if (!comments || comments.length < 100) {
          break
        }
      }

      this.issueCommentsCache[mrNumber] = allComments
      return allComments
    } catch (e) {
      warning(`Failed to list comments: ${e}`)
      return allComments
    }
  }

  async listReviewComments(mrNumber: number): Promise<ReviewComment[]> {
    if (this.reviewCommentsCache[mrNumber]) {
      return this.reviewCommentsCache[mrNumber]
    }

    const octokit = this.client.getOctokit()
    const repo = this.client.getRepoInfo()
    const allComments: ReviewComment[] = []
    let page = 1

    try {
      while (true) {
        const {data: comments} = await octokit.pulls.listReviewComments({
          owner: repo.owner,
          repo: repo.repo,
          pull_number: mrNumber,
          page,
          per_page: 100
        })

        allComments.push(
          ...comments.map((c: {
            id: number
            body: string
            user?: {login: string; id: number} | null
            created_at: string
            updated_at: string
            path: string
            line?: number | null
            start_line?: number | null
            side?: string
            in_reply_to_id?: number
          }) => ({
            id: c.id,
            body: c.body,
            author: {
              login: c.user?.login || 'unknown',
              id: c.user?.id || 0
            },
            createdAt: c.created_at,
            updatedAt: c.updated_at,
            path: c.path,
            line: c.line || 0,
            startLine: c.start_line || undefined,
            side: (c.side as 'LEFT' | 'RIGHT') || 'RIGHT',
            inReplyToId: c.in_reply_to_id
          }))
        )

        page++
        if (!comments || comments.length < 100) {
          break
        }
      }

      this.reviewCommentsCache[mrNumber] = allComments
      return allComments
    } catch (e) {
      warning(`Failed to list review comments: ${e}`)
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
        ((comment.startLine !== undefined &&
          comment.startLine >= startLine &&
          comment.line <= endLine) ||
          (startLine === endLine && comment.line === endLine))
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
        ((comment.startLine !== undefined &&
          comment.startLine === startLine &&
          comment.line === endLine) ||
          (startLine === endLine && comment.line === endLine))
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

Currently reviewing new changes in this PR...

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
  private async create(body: string, mrNumber: number): Promise<void> {
    try {
      const octokit = this.client.getOctokit()
      const repo = this.client.getRepoInfo()

      const response = await octokit.issues.createComment({
        owner: repo.owner,
        repo: repo.repo,
        issue_number: mrNumber,
        body
      })

      if (this.issueCommentsCache[mrNumber]) {
        this.issueCommentsCache[mrNumber].push({
          id: response.data.id,
          body: response.data.body || '',
          author: {
            login: response.data.user?.login || 'unknown',
            id: response.data.user?.id || 0
          },
          createdAt: response.data.created_at,
          updatedAt: response.data.updated_at
        })
      }
    } catch (e) {
      warning(`Failed to create comment: ${e}`)
    }
  }

  private async replace(body: string, tag: string, mrNumber: number): Promise<void> {
    try {
      const cmt = await this.findCommentWithTag(tag, mrNumber)
      if (cmt) {
        const octokit = this.client.getOctokit()
        const repo = this.client.getRepoInfo()

        await octokit.issues.updateComment({
          owner: repo.owner,
          repo: repo.repo,
          comment_id: cmt.id,
          body
        })
      } else {
        await this.create(body, mrNumber)
      }
    } catch (e) {
      warning(`Failed to replace comment: ${e}`)
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
}
