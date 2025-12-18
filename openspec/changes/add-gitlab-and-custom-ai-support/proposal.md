# Change: Add GitLab Support and Custom AI Model Configuration

## Why

The current AI PR Reviewer is tightly coupled to GitHub Actions and OpenAI's API, limiting its adoption by teams using:
1. GitLab (both cloud and self-hosted instances) for version control
2. Custom or alternative AI model providers (Azure OpenAI, self-hosted models, etc.)
3. Containerized CI/CD pipelines that need flexible deployment options

This change enables the tool to serve a broader user base while maintaining backward compatibility with existing GitHub Actions workflows.

## What Changes

- **Platform Abstraction**: Refactor GitHub-specific code into a platform abstraction layer supporting both GitHub and GitLab
- **GitLab Integration**: Add full support for GitLab merge requests (cloud and self-hosted)
  - GitLab API client integration
  - Merge request event handling
  - Comment management on merge requests
  - CI/CD pipeline integration via `.gitlab-ci.yml`
- **Custom AI Model Configuration**: Enable users to configure custom AI providers via environment variables
  - Custom API endpoint URL
  - Custom API key management
  - Custom model names (light and heavy models)
  - Backward compatible with existing OpenAI configuration
- **Container Deployment**: Provide Docker-based deployment for CI/CD pipelines
  - Dockerfile for building reviewer container
  - Environment variable-based configuration
  - Minimal CI/CD YAML configuration
  - Support for both GitHub Actions and GitLab CI/CD

## Impact

**Affected Specs:**
- `platform-abstraction` (NEW) - Abstract platform-specific operations
- `gitlab-integration` (NEW) - GitLab-specific implementation
- `ai-model-configuration` (NEW) - Custom AI provider configuration
- `container-deployment` (NEW) - Docker and CI/CD deployment

**Affected Code:**
- [`src/main.ts`](src/main.ts) - Entry point needs platform detection
- [`src/bot.ts`](src/bot.ts) - AI client initialization with custom providers
- [`src/options.ts`](src/options.ts) - Add custom AI configuration options
- [`src/commenter.ts`](src/commenter.ts) - Platform-agnostic commenting
- [`src/review.ts`](src/review.ts) - Platform-agnostic review orchestration
- [`action.yml`](action.yml) - Add new input parameters
- New files: Platform abstraction layer, GitLab implementation, Dockerfile

**Breaking Changes:**
- None - all changes are additive and backward compatible

**Migration Path:**
- Existing GitHub Actions users: No changes required
- GitLab users: Add `.gitlab-ci.yml` and configure environment variables
- Custom AI users: Set new environment variables for custom endpoints
