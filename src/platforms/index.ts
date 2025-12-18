/**
 * Platform Factory
 *
 * Detects the current platform and instantiates the appropriate client
 */

import {warning} from '@actions/core'
import {
  Platform,
  PlatformConfig,
  PlatformType,
  IPlatformClient,
  ICommenter,
  IPlatformContext
} from './types'

// Re-export types
export * from './types'

/**
 * Detect the current platform based on environment variables
 * @returns The detected platform type or null if unknown
 */
export function detectPlatform(): PlatformType | null {
  // Check for explicit platform configuration
  const explicitPlatform = process.env.PLATFORM?.toLowerCase()
  if (explicitPlatform === 'github' || explicitPlatform === 'gitlab') {
    return explicitPlatform
  }

  // Check for GitHub Actions environment
  if (process.env.GITHUB_ACTIONS === 'true') {
    return 'github'
  }

  // Check for GitLab CI environment
  if (process.env.GITLAB_CI === 'true') {
    return 'gitlab'
  }

  return null
}

/**
 * Get platform configuration from environment
 * @param platformType - The platform type
 * @returns Platform configuration
 */
export function getPlatformConfig(platformType: PlatformType): PlatformConfig {
  if (platformType === 'github') {
    return {
      platform: 'github',
      token: process.env.GITHUB_TOKEN || '',
      baseUrl: process.env.GITHUB_API_URL || 'https://api.github.com'
    }
  }

  if (platformType === 'gitlab') {
    return {
      platform: 'gitlab',
      token: process.env.GITLAB_TOKEN || '',
      baseUrl: process.env.GITLAB_BASE_URL || process.env.CI_SERVER_URL || 'https://gitlab.com',
      insecureSsl: process.env.GITLAB_INSECURE_SSL === 'true',
      caCert: process.env.GITLAB_CA_CERT
    }
  }

  throw new Error(`Unknown platform: ${platformType}`)
}

/**
 * Create a platform instance
 * @param config - Platform configuration (optional, will auto-detect if not provided)
 * @returns Platform instance with client, commenter, and context
 */
export async function createPlatform(config?: Partial<PlatformConfig>): Promise<Platform> {
  // Detect platform if not specified
  const platformType = config?.platform || detectPlatform()

  if (!platformType) {
    throw new Error(
      'Unable to detect platform. Please set PLATFORM environment variable to "github" or "gitlab", ' +
      'or run in a supported CI environment (GitHub Actions or GitLab CI).'
    )
  }

  // Get full configuration
  const fullConfig = {
    ...getPlatformConfig(platformType),
    ...config,
    platform: platformType
  }

  // Validate token
  if (!fullConfig.token) {
    const tokenEnvVar = platformType === 'github' ? 'GITHUB_TOKEN' : 'GITLAB_TOKEN'
    throw new Error(`Missing authentication token. Please set ${tokenEnvVar} environment variable.`)
  }

  // Import and instantiate platform-specific implementations
  if (platformType === 'github') {
    const {GitHubClient} = await import('./github/client')
    const {GitHubCommenter} = await import('./github/commenter')
    const {GitHubContext} = await import('./github/context')

    const context = new GitHubContext()
    const client = new GitHubClient(fullConfig.token, fullConfig.baseUrl)
    const commenter = new GitHubCommenter(client, context)

    return {
      type: 'github',
      client,
      commenter,
      context
    }
  }

  if (platformType === 'gitlab') {
    const {GitLabClient} = await import('./gitlab/client')
    const {GitLabCommenter} = await import('./gitlab/commenter')
    const {GitLabContext} = await import('./gitlab/context')

    const context = new GitLabContext()
    const client = new GitLabClient(fullConfig.token, fullConfig.baseUrl, {
      insecureSsl: fullConfig.insecureSsl,
      caCert: fullConfig.caCert
    })
    const commenter = new GitLabCommenter(client, context)

    return {
      type: 'gitlab',
      client,
      commenter,
      context
    }
  }

  throw new Error(`Unsupported platform: ${platformType}`)
}

/**
 * Check if running in a supported CI environment
 */
export function isInCIEnvironment(): boolean {
  return detectPlatform() !== null
}

/**
 * Get the event name normalized across platforms
 * @param context - Platform context
 * @returns Normalized event name
 */
export function getNormalizedEventName(context: IPlatformContext): string {
  if (context.isMergeRequestEvent()) {
    return 'merge_request'
  }
  if (context.isReviewCommentEvent()) {
    return 'review_comment'
  }
  return context.eventName
}
