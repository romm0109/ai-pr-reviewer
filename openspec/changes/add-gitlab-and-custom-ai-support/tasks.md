# Implementation Tasks

## 1. Platform Abstraction Layer

- [ ] 1.1 Create platform interface types in `src/platforms/types.ts`
  - Define `Platform` interface with all required methods
  - Define `PlatformContext`, `Comment`, `File`, `Diff` types
  - Define `PlatformType` enum ('github' | 'gitlab')
- [ ] 1.2 Implement platform factory in `src/platforms/index.ts`
  - Create `detectPlatform()` function
  - Create `createPlatform()` factory function
  - Implement singleton pattern for platform instance
- [ ] 1.3 Refactor GitHub implementation to use platform interface
  - Create `src/platforms/github/index.ts` implementing `Platform`
  - Move GitHub-specific code from `src/commenter.ts` to GitHub platform
  - Create `src/platforms/github/context.ts` for context handling
  - Update imports in `src/main.ts` and `src/review.ts`
- [ ] 1.4 Write unit tests for platform abstraction
  - Test platform detection logic
  - Test platform factory
  - Mock platform implementations for testing

## 2. GitLab Integration

- [ ] 2.1 Add GitLab SDK dependency
  - Add `@gitbeaker/node` to package.json
  - Update package-lock.json
- [ ] 2.2 Implement GitLab platform adapter
  - Create `src/platforms/gitlab/index.ts` implementing `Platform`
  - Create `src/platforms/gitlab/context.ts` for MR context
  - Create `src/platforms/gitlab/client.ts` for API client setup
- [ ] 2.3 Implement GitLab comment management
  - Create merge request note creation
  - Implement note update and delete
  - Implement note listing with bot comment filtering
- [ ] 2.4 Implement GitLab file changes retrieval
  - Fetch merge request changes
  - Convert GitLab diff format to internal format
  - Handle large diffs and file limits
- [ ] 2.5 Create GitLab CI/CD examples
  - Create `.gitlab-ci.simple.yml` example
  - Create `.gitlab-ci.build-and-use.yml` example
  - Create `QUICKSTART_GITLAB.md` documentation
- [ ] 2.6 Write integration tests for GitLab
  - Test MR context retrieval
  - Test comment operations
  - Test file changes retrieval

## 3. Custom AI Model Configuration

- [ ] 3.1 Update Options class for custom AI configuration
  - Add custom AI environment variable parsing in `src/options.ts`
  - Implement configuration precedence logic
  - Add validation for custom endpoints
- [ ] 3.2 Update Bot class for custom AI providers
  - Modify `src/bot.ts` to support custom endpoints
  - Update ChatGPT API initialization with custom config
  - Add endpoint compatibility validation
- [ ] 3.3 Update action.yml inputs
  - Add `custom_ai_endpoint` input
  - Add `custom_ai_api_key` input
  - Add `custom_ai_light_model` input
  - Add `custom_ai_heavy_model` input
  - Add `custom_ai_org_id` input
  - Add `custom_ai_timeout_ms` input
  - Add `custom_ai_retries` input
  - Add `custom_ai_temperature` input
- [ ] 3.4 Implement configuration logging
  - Log AI configuration on startup (mask sensitive data)
  - Add debug logging for AI API requests
- [ ] 3.5 Write tests for custom AI configuration
  - Test configuration precedence
  - Test custom endpoint initialization
  - Test fallback to OpenAI defaults

## 4. Webhook Server Implementation

- [ ] 4.1 Create HTTP server with Express.js
  - Add Express.js dependency to package.json
  - Create `src/server.ts` with basic HTTP server
  - Configure port and host from environment variables
  - Implement graceful shutdown handling
- [ ] 4.2 Implement webhook endpoint
  - Create POST /webhook/gitlab endpoint
  - Parse GitLab webhook payload
  - Extract merge request information
  - Validate webhook payload structure
- [ ] 4.3 Implement webhook authentication
  - Add webhook secret token validation
  - Verify X-Gitlab-Token header
  - Return 401 for invalid/missing tokens
  - Make authentication optional for testing
- [ ] 4.4 Implement asynchronous processing
  - Create job queue (in-memory or Bull/BullMQ)
  - Return 202 Accepted immediately
  - Process reviews in background
  - Handle concurrent requests with configurable limit
- [ ] 4.5 Implement health check endpoint
  - Create GET /health endpoint
  - Return 200 OK when server is ready
  - Return 503 during startup
  - Include basic status information
- [ ] 4.6 Add structured logging
  - Implement JSON logging format
  - Log all incoming webhook requests
  - Log processing status and errors
  - Mask sensitive data in logs
- [ ] 4.7 Add GitHub webhook support
  - Create POST /webhook/github endpoint
  - Parse GitHub webhook payload
  - Support pull_request events
  - Reuse platform abstraction layer
- [ ] 4.8 Write webhook server tests
  - Test webhook endpoint with valid payloads
  - Test authentication validation
  - Test async processing
  - Test health check endpoint

## 5. Container Deployment

- [ ] 5.1 Create Dockerfile for webhook server
  - Implement multi-stage build
  - Use Node.js 18 Alpine base image
  - Bundle application with @vercel/ncc
  - Configure non-root user
  - Expose port 3000
  - Set CMD to start server
- [ ] 5.2 Create .dockerignore file
  - Exclude unnecessary files from build context
  - Minimize build context size
- [ ] 5.3 Create Docker Compose example
  - Create `docker-compose.yml` for local deployment
  - Configure environment variables
  - Add volume mounts for development
  - Document usage
- [ ] 5.4 Create Kubernetes manifests
  - Create Deployment manifest
  - Create Service manifest
  - Create Ingress manifest
  - Create ConfigMap for configuration
  - Create Secret for sensitive data
- [ ] 5.5 Create container documentation
  - Create `WEBHOOK_SERVER.md` with setup instructions
  - Document all environment variables
  - Provide deployment examples
  - Add troubleshooting guide
- [ ] 5.6 Set up container image publishing
  - Create GitHub Actions workflow for Docker builds
  - Configure Docker Hub publishing
  - Configure GitHub Container Registry publishing
  - Implement multi-architecture builds (amd64, arm64)
- [ ] 5.7 Test container deployment
  - Test with Docker Compose locally
  - Test Kubernetes deployment
  - Verify environment variable passing
  - Test webhook delivery from GitLab

## 6. Integration and Testing

- [ ] 5.1 Update main entry point
  - Modify `src/main.ts` to use platform factory
  - Add platform detection and initialization
  - Update error handling for multi-platform support
- [ ] 5.2 Update review orchestration
  - Modify `src/review.ts` to use platform abstraction
  - Remove GitHub-specific code
  - Ensure platform-agnostic operations
- [ ] 5.3 Update commenter module
  - Refactor `src/commenter.ts` to be platform-agnostic
  - Move platform-specific code to platform implementations
- [ ] 5.4 Write end-to-end tests
  - Test GitHub Actions workflow
  - Test GitLab CI pipeline
  - Test custom AI configuration
  - Test container deployment
- [ ] 5.5 Update existing tests
  - Fix broken tests after refactoring
  - Add platform abstraction mocks
  - Ensure test coverage remains high

## 7. Documentation

- [ ] 7.1 Update README.md
  - Add GitLab support section
  - Add custom AI configuration section
  - Add webhook server deployment section
  - Update feature list
  - Add architecture diagram
- [ ] 7.2 Create GitLab webhook setup guide
  - Step-by-step webhook configuration for GitLab cloud
  - Step-by-step webhook configuration for self-hosted GitLab
  - Webhook URL format and settings
  - Secret token configuration
  - Troubleshooting section
- [ ] 7.3 Create custom AI provider guide
  - List of compatible providers
  - Configuration examples for each provider
  - Troubleshooting common issues
- [ ] 7.4 Create webhook server deployment guide
  - Docker Compose deployment
  - Kubernetes deployment
  - Cloud platform deployment (AWS, GCP, Azure)
  - Reverse proxy configuration (nginx, Traefik)
  - SSL/TLS setup
  - Monitoring and logging setup
- [ ] 7.5 Create webhook server operations guide
  - Scaling guidelines
  - Performance tuning
  - Security best practices
  - Backup and disaster recovery
  - Monitoring and alerting
- [ ] 7.6 Update migration guide
  - Document backward compatibility
  - Provide migration examples
  - Address common migration questions

## 8. Quality Assurance

- [ ] 8.1 Run full test suite
  - Execute `npm test`
  - Verify all tests pass
  - Check test coverage
- [ ] 8.2 Run linting and formatting
  - Execute `npm run lint`
  - Execute `npm run format-check`
  - Fix any issues
- [ ] 8.3 Build and package
  - Execute `npm run build`
  - Execute `npm run package`
  - Verify dist/index.js and dist/server.js are generated
- [ ] 8.4 Manual testing
  - Test with real GitHub PR (Actions mode)
  - Test with real GitLab MR (webhook mode)
  - Test with custom AI endpoint
  - Test webhook server deployment
  - Test webhook authentication
- [ ] 8.5 Performance testing
  - Measure webhook response time
  - Test concurrent webhook handling
  - Verify image size < 200MB
  - Test with large PRs/MRs
  - Load test webhook server
- [ ] 8.6 Security review
  - Scan container for vulnerabilities
  - Review secret handling
  - Verify non-root container execution
  - Check for exposed sensitive data in logs
  - Test webhook authentication bypass attempts
  - Review rate limiting effectiveness

## 9. Release Preparation

- [ ] 9.1 Update version numbers
  - Update package.json version
  - Update container image tags
- [ ] 9.2 Create release notes
  - Document new features (GitLab support, webhook server, custom AI)
  - Document breaking changes (if any)
  - Provide migration guide
  - Include deployment examples
- [ ] 9.3 Update changelog
  - Add entry for this release
  - Link to relevant PRs and issues
- [ ] 9.4 Publish container images
  - Build and push webhook server image to Docker Hub
  - Build and push webhook server image to GitHub Container Registry
  - Tag with version and 'latest'
  - Verify images are accessible
- [ ] 9.5 Create GitHub release
  - Tag the release
  - Attach release notes
  - Include deployment examples
  - Publish release
- [ ] 9.6 Announce release
  - Update project documentation
  - Notify users of new features
  - Share deployment guides
