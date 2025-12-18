import {expect, describe, test, beforeEach, afterEach} from '@jest/globals'
import {detectPlatform, getPlatformConfig} from '../../src/platforms'

describe('Platform Detection', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Reset environment before each test
    process.env = {...originalEnv}
    delete process.env.PLATFORM
    delete process.env.GITHUB_ACTIONS
    delete process.env.GITLAB_CI
    delete process.env.GITHUB_TOKEN
    delete process.env.GITLAB_TOKEN
    delete process.env.GITLAB_BASE_URL
    delete process.env.CI_SERVER_URL
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('detectPlatform', () => {
    test('returns null when no platform is detected', () => {
      expect(detectPlatform()).toBeNull()
    })

    test('detects GitHub Actions environment', () => {
      process.env.GITHUB_ACTIONS = 'true'
      expect(detectPlatform()).toBe('github')
    })

    test('detects GitLab CI environment', () => {
      process.env.GITLAB_CI = 'true'
      expect(detectPlatform()).toBe('gitlab')
    })

    test('explicit platform overrides environment detection', () => {
      process.env.GITHUB_ACTIONS = 'true'
      process.env.PLATFORM = 'gitlab'
      expect(detectPlatform()).toBe('gitlab')
    })

    test('explicit github platform', () => {
      process.env.PLATFORM = 'github'
      expect(detectPlatform()).toBe('github')
    })

    test('explicit gitlab platform', () => {
      process.env.PLATFORM = 'gitlab'
      expect(detectPlatform()).toBe('gitlab')
    })

    test('case insensitive platform detection', () => {
      process.env.PLATFORM = 'GITHUB'
      expect(detectPlatform()).toBe('github')

      process.env.PLATFORM = 'GitLab'
      expect(detectPlatform()).toBe('gitlab')
    })
  })

  describe('getPlatformConfig', () => {
    test('returns GitHub config with defaults', () => {
      const config = getPlatformConfig('github')
      expect(config.platform).toBe('github')
      expect(config.baseUrl).toBe('https://api.github.com')
    })

    test('returns GitHub config with token from env', () => {
      process.env.GITHUB_TOKEN = 'test-github-token'
      const config = getPlatformConfig('github')
      expect(config.token).toBe('test-github-token')
    })

    test('returns GitLab config with defaults', () => {
      const config = getPlatformConfig('gitlab')
      expect(config.platform).toBe('gitlab')
      expect(config.baseUrl).toBe('https://gitlab.com')
    })

    test('returns GitLab config with token from env', () => {
      process.env.GITLAB_TOKEN = 'test-gitlab-token'
      const config = getPlatformConfig('gitlab')
      expect(config.token).toBe('test-gitlab-token')
    })

    test('returns GitLab config with custom base URL', () => {
      process.env.GITLAB_BASE_URL = 'https://gitlab.company.com'
      const config = getPlatformConfig('gitlab')
      expect(config.baseUrl).toBe('https://gitlab.company.com')
    })

    test('returns GitLab config with CI_SERVER_URL fallback', () => {
      process.env.CI_SERVER_URL = 'https://gitlab.internal.com'
      const config = getPlatformConfig('gitlab')
      expect(config.baseUrl).toBe('https://gitlab.internal.com')
    })

    test('GITLAB_BASE_URL takes precedence over CI_SERVER_URL', () => {
      process.env.GITLAB_BASE_URL = 'https://gitlab.company.com'
      process.env.CI_SERVER_URL = 'https://gitlab.internal.com'
      const config = getPlatformConfig('gitlab')
      expect(config.baseUrl).toBe('https://gitlab.company.com')
    })

    test('returns GitLab config with insecure SSL option', () => {
      process.env.GITLAB_INSECURE_SSL = 'true'
      const config = getPlatformConfig('gitlab')
      expect(config.insecureSsl).toBe(true)
    })

    test('returns GitLab config with CA cert option', () => {
      process.env.GITLAB_CA_CERT = '/path/to/ca.crt'
      const config = getPlatformConfig('gitlab')
      expect(config.caCert).toBe('/path/to/ca.crt')
    })

    test('throws error for unknown platform', () => {
      expect(() => getPlatformConfig('unknown' as any)).toThrow('Unknown platform')
    })
  })
})
