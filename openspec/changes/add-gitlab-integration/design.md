# Design: Add GitLab Integration

## Context
The AI PR Reviewer currently only supports GitHub through tight coupling with `@actions/github` and `@octokit/*` packages. To support GitLab (cloud and self-hosted), we need to introduce a platform abstraction layer that allows the core review logic to work with any supported platform.

**Stakeholders:**
- Development teams using GitLab
- Organizations with self-hosted GitLab instances
- Existing GitHub users (must not break)

## Goals / Non-Goals

### Goals
- Support GitLab.com (cloud) merge request reviews
- Support self-hosted GitLab instances with configurable base URL
- Maintain feature parity with GitHub implementation
- Keep existing GitHub functionality working unchanged
- Provide clear documentation for GitLab setup

### Non-Goals
- Support for other platforms (Bitbucket, Azure DevOps) - future work
- GitLab-specific features not available in GitHub (e.g., approval rules)
- Migration tools from GitHub to GitLab
- Supporting GitLab versions older than 14.0

## Decisions

### Decision 1: Platform Abstraction Pattern
**What:** Create a platform abstraction layer using TypeScript interfaces.

**Why:** Allows core review logic to remain platform-agnostic while supporting multiple platforms.

**Alternatives considered:**
1. **Fork the project for GitLab** - Rejected: leads to code duplication and maintenance burden
2. **Conditional logic throughout codebase** - Rejected: makes code harder to maintain and test
3. **Plugin architecture** - Rejected: over-engineering for two platforms

### Decision 2: GitLab API Client
**What:** Use `@gitbeaker/rest` package for GitLab API interactions.

**Why:** 
- Well-maintained, TypeScript-native GitLab API client
- Supports both cloud and self-hosted instances
- Similar API patterns to Octokit

**Alternatives considered:**
1. **Raw fetch calls** - Rejected: too much boilerplate, error-prone
2. **gitlab npm package** - Rejected: less maintained than gitbeaker

### Decision 3: Deployment Model for GitLab
**What:** Support GitLab CI/CD as the primary deployment method, with optional Docker container support.

**Why:**
- GitLab CI/CD is the native CI system for GitLab
- Aligns with how GitHub Actions works for GitHub
- Docker support enables flexibility for self-hosted setups

### Decision 4: Authentication
**What:** Support GitLab Personal Access Tokens (PAT) and Project/Group Access Tokens.

**Why:**
- PATs are the standard authentication method for GitLab API
- Project tokens provide scoped access for CI/CD
- No OAuth flow needed for CI/CD context

### Decision 5: Self-Hosted Support
**What:** Allow configurable `gitlab_base_url` with optional SSL certificate configuration.

**Why:**
- Many enterprises run self-hosted GitLab
- Custom SSL certificates are common in enterprise environments

## Architecture

```
src/
├── platforms/
│   ├── types.ts              # Platform-agnostic interfaces
│   ├── index.ts              # Platform factory
│   ├── github/
│   │   ├── client.ts         # GitHub API client (refactored from octokit.ts)
│   │   ├── commenter.ts      # GitHub comment implementation
│   │   └── context.ts        # GitHub Actions context
│   └── gitlab/
│       ├── client.ts         # GitLab API client
│       ├── commenter.ts      # GitLab MR discussion implementation
│       └── context.ts        # GitLab CI context
├── bot.ts                    # Unchanged
├── review.ts                 # Uses platform interfaces
├── prompts.ts                # Unchanged
└── main.ts                   # Platform detection and initialization
```

### Key Interfaces

```typescript
interface IPlatformClient {
  compareCommits(base: string, head: string): Promise<CompareResult>
  getFileContent(path: string, ref: string): Promise<string>
  getMergeRequestInfo(): Promise<MergeRequestInfo>
  listCommits(mrId: number): Promise<Commit[]>
}

interface ICommenter {
  comment(message: string, tag: string, mode: 'create' | 'replace'): Promise<void>
  updateDescription(mrId: number, message: string): Promise<void>
  submitReview(mrId: number, commitId: string, statusMsg: string): Promise<void>
  bufferReviewComment(path: string, startLine: number, endLine: number, message: string): Promise<void>
  // ... other methods
}

interface IPlatformContext {
  eventName: string
  mergeRequest: MergeRequestInfo | null
  repo: { owner: string; repo: string }
}
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Breaking existing GitHub users | Comprehensive test suite, phased rollout |
| GitLab API differences | Thorough mapping of API responses to common interface |
| Self-hosted SSL issues | Document requirements, provide troubleshooting guide |
| Performance differences | Monitor and optimize GitLab-specific code paths |
| GitLab rate limits | Implement retry/throttling similar to GitHub |

## Migration Plan

### Phase 1: Abstraction (Non-breaking)
1. Create platform interfaces
2. Refactor GitHub code to implement interfaces
3. Verify all existing tests pass

### Phase 2: GitLab Implementation
1. Implement GitLab client
2. Add GitLab CI/CD support
3. Test with GitLab.com

### Phase 3: Self-Hosted Support
1. Add configurable base URL
2. Test with self-hosted instance
3. Document setup process

### Rollback
- If issues arise, the abstraction layer allows easy rollback to GitHub-only
- GitLab code can be disabled via configuration flag

## Open Questions

1. **GitLab version support:** What's the minimum GitLab version to support? (Proposed: 14.0+)
2. **Diff format:** GitLab uses different diff format - need to verify patch parsing works
3. **Discussion threads:** GitLab uses "discussions" vs GitHub "review comments" - need to map correctly
4. **CI variables:** Which GitLab CI predefined variables should we use for context?
