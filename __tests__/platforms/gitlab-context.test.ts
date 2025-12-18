import {expect, describe, test, beforeEach, afterEach} from '@jest/globals'
import {GitLabContext} from '../../src/platforms/gitlab/context'

describe('GitLabContext', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {...originalEnv}
    // Clear GitLab CI variables
    delete process.env.CI_PIPELINE_SOURCE
    delete process.env.CI_PROJECT_PATH
    delete process.env.CI_PROJECT_ID
    delete process.env.CI_MERGE_REQUEST_IID
    delete process.env.CI_MERGE_REQUEST_TITLE
    delete process.env.CI_MERGE_REQUEST_DESCRIPTION
    delete process.env.CI_MERGE_REQUEST_SOURCE_BRANCH_NAME
    delete process.env.CI_MERGE_REQUEST_TARGET_BRANCH_NAME
    delete process.env.CI_MERGE_REQUEST_DIFF_BASE_SHA
    delete process.env.CI_COMMIT_SHA
    delete process.env.CI_SERVER_URL
    delete process.env.GITLAB_CI
    delete process.env.GITLAB_USER_LOGIN
    delete process.env.GITLAB_USER_ID
    delete process.env.CI_MERGE_REQUEST_LABELS
    delete process.env.CI_NOTE_ID
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('eventName', () => {
    test('returns merge_request for merge_request_event pipeline', () => {
      process.env.CI_PIPELINE_SOURCE = 'merge_request_event'
      const context = new GitLabContext()
      expect(context.eventName).toBe('merge_request')
    })

    test('returns note for comment events', () => {
      process.env.CI_NOTE_ID = '12345'
      const context = new GitLabContext()
      expect(context.eventName).toBe('note')
    })

    test('returns pipeline source for other events', () => {
      process.env.CI_PIPELINE_SOURCE = 'push'
      const context = new GitLabContext()
      expect(context.eventName).toBe('push')
    })
  })

  describe('repo', () => {
    test('parses project path correctly', () => {
      process.env.CI_PROJECT_PATH = 'mygroup/myproject'
      const context = new GitLabContext()
      expect(context.repo.owner).toBe('mygroup')
      expect(context.repo.repo).toBe('myproject')
      expect(context.repo.fullName).toBe('mygroup/myproject')
    })

    test('handles nested groups', () => {
      process.env.CI_PROJECT_PATH = 'org/subgroup/myproject'
      const context = new GitLabContext()
      expect(context.repo.owner).toBe('org/subgroup')
      expect(context.repo.repo).toBe('myproject')
      expect(context.repo.fullName).toBe('org/subgroup/myproject')
    })

    test('handles empty project path', () => {
      const context = new GitLabContext()
      expect(context.repo.owner).toBe('')
      expect(context.repo.repo).toBe('')
      expect(context.repo.fullName).toBe('')
    })
  })

  describe('mergeRequest', () => {
    test('returns null when no MR IID', () => {
      const context = new GitLabContext()
      expect(context.mergeRequest).toBeNull()
    })

    test('returns MR info from environment', () => {
      process.env.CI_MERGE_REQUEST_IID = '42'
      process.env.CI_MERGE_REQUEST_TITLE = 'Test MR'
      process.env.CI_MERGE_REQUEST_DESCRIPTION = 'Test description'
      process.env.CI_MERGE_REQUEST_SOURCE_BRANCH_NAME = 'feature-branch'
      process.env.CI_MERGE_REQUEST_TARGET_BRANCH_NAME = 'main'
      process.env.CI_MERGE_REQUEST_DIFF_BASE_SHA = 'abc123'
      process.env.CI_COMMIT_SHA = 'def456'
      process.env.GITLAB_USER_LOGIN = 'testuser'
      process.env.GITLAB_USER_ID = '100'
      process.env.CI_MERGE_REQUEST_LABELS = 'bug,urgent'

      const context = new GitLabContext()
      const mr = context.mergeRequest

      expect(mr).not.toBeNull()
      expect(mr!.number).toBe(42)
      expect(mr!.title).toBe('Test MR')
      expect(mr!.description).toBe('Test description')
      expect(mr!.sourceBranch).toBe('feature-branch')
      expect(mr!.targetBranch).toBe('main')
      expect(mr!.baseSha).toBe('abc123')
      expect(mr!.headSha).toBe('def456')
      expect(mr!.author.login).toBe('testuser')
      expect(mr!.author.id).toBe(100)
      expect(mr!.labels).toEqual(['bug', 'urgent'])
    })
  })

  describe('isMergeRequestEvent', () => {
    test('returns true for merge_request_event', () => {
      process.env.CI_PIPELINE_SOURCE = 'merge_request_event'
      const context = new GitLabContext()
      expect(context.isMergeRequestEvent()).toBe(true)
    })

    test('returns false for other events', () => {
      process.env.CI_PIPELINE_SOURCE = 'push'
      const context = new GitLabContext()
      expect(context.isMergeRequestEvent()).toBe(false)
    })
  })

  describe('isReviewCommentEvent', () => {
    test('returns true when CI_NOTE_ID is set', () => {
      process.env.CI_NOTE_ID = '12345'
      const context = new GitLabContext()
      expect(context.isReviewCommentEvent()).toBe(true)
    })

    test('returns false when CI_NOTE_ID is not set', () => {
      const context = new GitLabContext()
      expect(context.isReviewCommentEvent()).toBe(false)
    })
  })

  describe('getMergeRequestNumber', () => {
    test('returns MR IID as number', () => {
      process.env.CI_MERGE_REQUEST_IID = '42'
      const context = new GitLabContext()
      expect(context.getMergeRequestNumber()).toBe(42)
    })

    test('returns null when no MR IID', () => {
      const context = new GitLabContext()
      expect(context.getMergeRequestNumber()).toBeNull()
    })
  })

  describe('getServerUrl', () => {
    test('returns CI_SERVER_URL when set', () => {
      process.env.CI_SERVER_URL = 'https://gitlab.company.com'
      const context = new GitLabContext()
      expect(context.getServerUrl()).toBe('https://gitlab.company.com')
    })

    test('returns default gitlab.com when not set', () => {
      const context = new GitLabContext()
      expect(context.getServerUrl()).toBe('https://gitlab.com')
    })
  })

  describe('isGitLabCI', () => {
    test('returns true when GITLAB_CI is true', () => {
      process.env.GITLAB_CI = 'true'
      const context = new GitLabContext()
      expect(context.isGitLabCI()).toBe(true)
    })

    test('returns false when GITLAB_CI is not set', () => {
      const context = new GitLabContext()
      expect(context.isGitLabCI()).toBe(false)
    })
  })
})
