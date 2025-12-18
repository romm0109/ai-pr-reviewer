# Tasks: Add GitLab Integration

## 1. Platform Abstraction Layer
- [x] 1.1 Create `src/platforms/types.ts` with platform-agnostic interfaces
- [x] 1.2 Define `IPlatformClient` interface for repository operations
- [x] 1.3 Define `ICommenter` interface for comment management
- [x] 1.4 Define `IMergeRequestContext` interface for MR/PR context

## 2. Refactor GitHub Implementation
- [x] 2.1 Create `src/platforms/github/` directory structure
- [x] 2.2 Move `octokit.ts` to `src/platforms/github/client.ts`
- [x] 2.3 Implement `IPlatformClient` for GitHub
- [x] 2.4 Refactor `commenter.ts` to implement `ICommenter` interface
- [x] 2.5 Update imports across codebase to use new paths
- [x] 2.6 Verify existing GitHub functionality works unchanged

## 3. GitLab Client Implementation
- [x] 3.1 Create `src/platforms/gitlab/` directory structure
- [x] 3.2 Implement GitLab API client with authentication
- [x] 3.3 Support self-hosted GitLab URL configuration
- [x] 3.4 Implement `IPlatformClient` for GitLab
- [x] 3.5 Implement `ICommenter` for GitLab MR discussions
- [x] 3.6 Handle GitLab-specific diff format and line mapping

## 4. Platform Detection and Configuration
- [x] 4.1 Add GitLab-specific inputs to `action.yml`
- [x] 4.2 Update `src/inputs.ts` for GitLab configuration
- [x] 4.3 Create platform factory in `src/platforms/index.ts`
- [x] 4.4 Update `src/main.ts` to detect platform and instantiate correct client
- [x] 4.5 Support environment variable detection (CI_SERVER_URL for GitLab)

## 5. GitLab CI/CD Support
- [x] 5.1 Create `.gitlab-ci.yml` template for GitLab CI/CD usage
- [x] 5.2 Document GitLab CI/CD setup in README
- [x] 5.3 Handle GitLab CI environment variables (CI_MERGE_REQUEST_IID, etc.)

## 6. Self-Hosted GitLab Support
- [x] 6.1 Add `gitlab_base_url` configuration option
- [x] 6.2 Support custom SSL certificates (optional)
- [x] 6.3 Test with self-hosted GitLab instance
- [x] 6.4 Document self-hosted setup requirements

## 7. Testing
- [x] 7.1 Add unit tests for platform abstraction interfaces
- [x] 7.2 Add unit tests for GitLab client
- [x] 7.3 Add integration tests for GitLab MR operations (mocked)
- [x] 7.4 Verify GitHub tests still pass
- [x] 7.5 Add E2E test documentation for both platforms

## 8. Documentation
- [x] 8.1 Update README with GitLab setup instructions
- [x] 8.2 Add GitLab CI/CD workflow examples
- [x] 8.3 Document self-hosted GitLab configuration
- [x] 8.4 Add troubleshooting section for GitLab-specific issues
- [x] 8.5 Update action.yml descriptions for new inputs
