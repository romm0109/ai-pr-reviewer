# Design: GitLab Support and Custom AI Model Configuration

## Context

The AI PR Reviewer currently operates exclusively within GitHub Actions, using GitHub's Octokit SDK and OpenAI's API. To expand platform support and AI provider flexibility, we need architectural changes that:

1. Abstract platform-specific operations (GitHub vs GitLab)
2. Support custom AI model endpoints beyond OpenAI
3. Enable webhook server deployment for efficient CI/CD integration
4. Maintain backward compatibility with existing GitHub Actions workflows

**Constraints:**
- Must not break existing GitHub Actions users
- Should minimize code duplication between platforms
- Must support both cloud and self-hosted GitLab instances
- Webhook server must be lightweight, fast, and scalable

**Stakeholders:**
- Existing GitHub Actions users (backward compatibility)
- GitLab users (cloud and self-hosted)
- Teams using custom AI providers (Azure OpenAI, self-hosted models)
- DevOps teams managing CI/CD pipelines

## Goals / Non-Goals

**Goals:**
- Support GitLab merge requests with same features as GitHub PRs
- Enable custom AI model configuration via environment variables
- Provide persistent webhook server for platform-agnostic deployment
- Maintain 100% backward compatibility with existing GitHub workflows
- Support self-hosted GitLab instances with custom URLs
- Allow custom AI endpoints (Azure OpenAI, Anthropic, self-hosted)
- Eliminate GitLab CI/CD minute consumption for reviews

**Non-Goals:**
- Support for other platforms (Bitbucket, Azure DevOps) in this change
- Migration of existing GitHub Actions workflows
- Changes to AI prompt engineering or review logic
- Support for non-OpenAI-compatible API formats (different request/response schemas)
- Web UI for webhook server monitoring (defer to future change)

## Decisions

### Decision 1: Platform Abstraction Layer

**What:** Create an interface-based abstraction layer for platform operations

**Why:** 
- Enables clean separation between platform-specific and business logic
- Makes testing easier with mock implementations
- Allows adding new platforms without modifying core review logic
- Follows dependency inversion principle

**Implementation:**
```typescript
// src/platforms/types.ts
interface Platform {
  name: string
  initialize(): Promise<void>
  getPullRequest(): Promise<PullRequestContext>
  createComment(comment: Comment): Promise<void>
  updateComment(id: string, comment: Comment): Promise<void>
  deleteComment(id: string): Promise<void>
  listComments(): Promise<Comment[]>
  getChangedFiles(): Promise<File[]>
  getDiff(file: File): Promise<Diff>
}
```

**Alternatives Considered:**
- **Adapter pattern with inheritance**: Rejected due to tight coupling
- **Strategy pattern with runtime selection**: Chosen approach - cleaner and more testable
- **Monolithic if/else branching**: Rejected due to maintainability concerns

### Decision 2: GitLab API Integration

**What:** Use `@gitbeaker/node` SDK for GitLab integration

**Why:**
- Official GitLab SDK with TypeScript support
- Handles authentication, rate limiting, and retries
- Supports both cloud and self-hosted instances
- Similar API surface to Octokit for easier implementation

**Configuration:**
```typescript
// Environment variables
GITLAB_TOKEN          // Personal access token or CI job token
GITLAB_API_URL        // Default: https://gitlab.com/api/v4
CI_MERGE_REQUEST_IID  // GitLab CI provides this (for CI/CD mode)
CI_PROJECT_ID         // GitLab CI provides this (for CI/CD mode)
```

**Alternatives Considered:**
- **Direct REST API calls**: Rejected due to complexity and lack of retry logic
- **GraphQL API**: Rejected due to limited GitLab GraphQL maturity
- **@gitbeaker/node SDK**: Chosen for official support and feature completeness

### Decision 3: Custom AI Model Configuration

**What:** Environment variable-based configuration for custom AI providers

**Why:**
- Flexible for different deployment environments
- Secure (no hardcoded credentials)
- Backward compatible (defaults to OpenAI)
- Supports multiple providers without code changes

**Configuration:**
```typescript
// Environment variables (all optional, defaults to OpenAI)
CUSTOM_AI_ENDPOINT     // e.g., https://api.azure.com/openai/v1
CUSTOM_AI_API_KEY      // API key for custom endpoint
CUSTOM_AI_LIGHT_MODEL  // Model name for light tasks
CUSTOM_AI_HEAVY_MODEL  // Model name for heavy tasks
CUSTOM_AI_ORG_ID       // Optional organization ID
```

**Precedence:**
1. Custom AI environment variables (if `CUSTOM_AI_ENDPOINT` is set)
2. Action inputs (for GitHub Actions)
3. OpenAI defaults

**Alternatives Considered:**
- **Configuration file**: Rejected due to complexity in CI/CD environments
- **Action inputs only**: Rejected due to GitLab CI/CD requirements
- **Environment variables**: Chosen for flexibility and security

### Decision 4: Webhook Server Deployment Strategy

**What:** Persistent HTTP webhook server running in a container

**Why:**
- Eliminates need for GitLab CI/CD minutes for reviews
- Faster response time (no container startup overhead per request)
- Centralized deployment and configuration
- Supports high-volume merge request workflows
- Easier to monitor and scale

**Architecture:**
```
GitLab → Webhook → HTTP Server (Container) → AI Review → GitLab API
                        ↓
                   Background Queue
```

**Server Implementation:**
- Express.js HTTP server listening on configurable port (default: 3000)
- Webhook endpoint: POST /webhook/gitlab
- Health check endpoint: GET /health
- Asynchronous request processing with job queue
- Graceful shutdown handling

**Dockerfile Strategy:**
```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm run package

# Stage 2: Runtime
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --production
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

**Alternatives Considered:**
- **One-off container per webhook**: Rejected due to slow startup and high resource usage
- **GitLab CI/CD job per MR**: Rejected due to CI/CD minute consumption
- **Persistent webhook server**: Chosen for efficiency and cost savings
- **Serverless functions**: Rejected due to cold start latency and complexity

### Decision 5: Platform Detection

**What:** Automatic platform detection based on environment variables

**Why:**
- Zero configuration for users
- Works in both GitHub Actions and GitLab CI
- Explicit override available if needed

**Detection Logic:**
```typescript
function detectPlatform(): PlatformType {
  // Webhook mode - check payload
  if (process.env.WEBHOOK_MODE === 'true') {
    return detectFromWebhookPayload()
  }
  // CI/CD mode - check environment
  if (process.env.GITLAB_CI === 'true') return 'gitlab'
  if (process.env.GITHUB_ACTIONS === 'true') return 'github'
  if (process.env.FORCE_PLATFORM) return process.env.FORCE_PLATFORM
  throw new Error('Unable to detect platform')
}
```

**Alternatives Considered:**
- **Explicit configuration required**: Rejected due to poor UX
- **Auto-detection only**: Chosen for best UX
- **CLI flag**: Added as override option

## Risks / Trade-offs

### Risk 1: GitLab API Rate Limiting
**Risk:** GitLab has different rate limits than GitHub
**Mitigation:** 
- Implement configurable concurrency limits
- Add exponential backoff retry logic
- Document rate limit considerations

### Risk 2: Custom AI Endpoint Compatibility
**Risk:** Not all providers use OpenAI-compatible APIs
**Mitigation:**
- Document supported providers (OpenAI-compatible only)
- Validate endpoint compatibility in initialization
- Provide clear error messages for incompatible endpoints

### Risk 3: Webhook Server Availability
**Risk:** Server downtime means missed reviews
**Mitigation:**
- Deploy with container orchestration (Kubernetes, Docker Swarm)
- Implement health checks for automatic restart
- Use load balancer for multiple instances
- Document deployment best practices
- Provide monitoring and alerting guidance

### Risk 4: Webhook Request Flooding
**Risk:** Malicious actors could flood the webhook endpoint
**Mitigation:**
- Require webhook secret token authentication
- Implement rate limiting per source IP
- Use reverse proxy with DDoS protection
- Monitor and alert on unusual traffic patterns
- Document security best practices

### Risk 5: Breaking Changes in Dependencies
**Risk:** GitLab SDK or platform APIs may change
**Mitigation:**
- Pin dependency versions
- Comprehensive integration tests
- Version compatibility matrix in documentation

### Risk 6: Self-Hosted GitLab Compatibility
**Risk:** Self-hosted instances may have different API versions
**Mitigation:**
- Support GitLab API v4 (stable since 2016)
- Document minimum GitLab version (13.0+)
- Graceful degradation for missing features

## Migration Plan

### Phase 1: Platform Abstraction (Week 1)
1. Create platform interface and types
2. Refactor GitHub implementation to use interface
3. Update tests to use platform abstraction
4. Verify existing GitHub Actions workflows still work

### Phase 2: GitLab Integration (Week 2)
1. Implement GitLab platform adapter
2. Add GitLab API client configuration
3. Implement webhook payload parsing
4. Integration testing with GitLab cloud

### Phase 3: Custom AI Configuration (Week 3)
1. Add environment variable parsing
2. Update Bot class to support custom endpoints
3. Add validation for custom configurations
4. Document supported providers

### Phase 4: Webhook Server Implementation (Week 4)
1. Create Express.js HTTP server
2. Implement webhook endpoint with authentication
3. Add asynchronous job queue for processing
4. Implement health check endpoint
5. Add structured logging

### Phase 5: Container Deployment (Week 5)
1. Create Dockerfile for webhook server
2. Build and publish container images
3. Create deployment examples (Docker Compose, Kubernetes)
4. Performance and load testing

### Rollback Plan
- All changes are additive and backward compatible
- Existing GitHub Actions workflows continue to work unchanged
- Feature flags for new functionality
- Can disable GitLab support via environment variable if issues arise
- Webhook server can be deployed alongside existing CI/CD approach

## Open Questions

1. **Q:** Should we support GitLab's GraphQL API in the future?
   **A:** Defer to future change - REST API v4 is sufficient for MVP

2. **Q:** How to handle platform-specific features (e.g., GitHub's review threads)?
   **A:** Document feature parity matrix, implement common subset first

3. **Q:** Should container images be published to Docker Hub, GitHub Container Registry, or both?
   **A:** Both for maximum accessibility - automate with CI/CD

4. **Q:** What's the minimum supported GitLab version?
   **A:** GitLab 13.0+ (released 2020) for API v4 stability

5. **Q:** Should we support other AI providers beyond OpenAI-compatible APIs?
   **A:** Defer to future change - focus on OpenAI-compatible endpoints first

6. **Q:** Should the webhook server support GitHub webhooks too?
   **A:** Yes, for consistency - both platforms can use the same webhook server

7. **Q:** What job queue library should we use for async processing?
   **A:** Bull or BullMQ for Redis-backed queuing, or simple in-memory queue for MVP

8. **Q:** Should we support webhook retries from GitLab?
   **A:** Yes - document that GitLab retries failed webhooks automatically

9. **Q:** How to handle long-running reviews that exceed typical webhook timeouts?
   **A:** Return 202 Accepted immediately, process in background, update MR when complete

10. **Q:** Should we provide a web UI for monitoring webhook server status?
    **A:** Defer to future change - focus on API endpoints and logging for MVP
