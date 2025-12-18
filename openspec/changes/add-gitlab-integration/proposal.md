# Change: Add GitLab Integration (including Self-Hosted)

## Why
The current AI PR Reviewer only supports GitHub. Many organizations use GitLab (both cloud and self-hosted) for their code repositories. Adding GitLab support would significantly expand the tool's reach and allow teams using GitLab to benefit from AI-powered code reviews.

## What Changes
- **BREAKING**: Refactor platform-specific code into an abstraction layer
- Add GitLab API client with authentication support
- Support GitLab cloud (gitlab.com) and self-hosted GitLab instances
- Create platform-agnostic interfaces for:
  - Repository operations (get files, compare commits)
  - Merge Request/Pull Request operations
  - Comment management (create, update, delete, reply)
  - Review submission
- Add GitLab CI/CD pipeline configuration support (alternative to GitHub Actions)
- Add configuration options for GitLab-specific settings (base URL, token, project ID)

## Impact
- Affected specs: New capabilities for `platform-abstraction`, `gitlab-integration`
- Affected code:
  - `src/octokit.ts` → refactor to `src/platforms/github.ts`
  - `src/commenter.ts` → extract interface, create GitLab implementation
  - `src/review.ts` → use platform abstraction instead of direct GitHub calls
  - `src/main.ts` → detect platform and instantiate correct client
  - `src/inputs.ts` → add GitLab-specific inputs
  - `action.yml` → add GitLab configuration inputs
  - New: `src/platforms/` directory with platform abstraction
  - New: `.gitlab-ci.yml` template for GitLab CI/CD usage
