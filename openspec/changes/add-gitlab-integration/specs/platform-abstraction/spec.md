# Platform Abstraction Specification

## ADDED Requirements

### Requirement: Platform Client Interface
The system SHALL provide a platform-agnostic interface (`IPlatformClient`) for interacting with code hosting platforms.

#### Scenario: Compare commits between two refs
- **WHEN** the system needs to compare commits between a base and head ref
- **THEN** it SHALL call `compareCommits(base, head)` on the platform client
- **AND** receive a standardized `CompareResult` object containing files and commits

#### Scenario: Get file content at specific ref
- **WHEN** the system needs to retrieve file content at a specific commit
- **THEN** it SHALL call `getFileContent(path, ref)` on the platform client
- **AND** receive the file content as a string

#### Scenario: Get merge request information
- **WHEN** the system needs merge request metadata (title, description, number)
- **THEN** it SHALL call `getMergeRequestInfo()` on the platform client
- **AND** receive a standardized `MergeRequestInfo` object

### Requirement: Commenter Interface
The system SHALL provide a platform-agnostic interface (`ICommenter`) for managing comments and reviews on merge requests.

#### Scenario: Post a comment on merge request
- **WHEN** the system needs to post a summary comment
- **THEN** it SHALL call `comment(message, tag, mode)` on the commenter
- **AND** the comment SHALL be created or replaced based on the mode

#### Scenario: Submit a review with inline comments
- **WHEN** the system has buffered review comments
- **THEN** it SHALL call `submitReview(mrId, commitId, statusMsg)`
- **AND** all buffered comments SHALL be posted as a review

#### Scenario: Update merge request description
- **WHEN** the system needs to add release notes to the description
- **THEN** it SHALL call `updateDescription(mrId, message)`
- **AND** the description SHALL be updated with the new content

### Requirement: Platform Context Interface
The system SHALL provide a platform-agnostic interface (`IPlatformContext`) for accessing CI/CD event context.

#### Scenario: Detect event type
- **WHEN** the system starts processing
- **THEN** it SHALL access `context.eventName` to determine the trigger event
- **AND** handle `merge_request` events for GitLab and `pull_request` events for GitHub

#### Scenario: Access repository information
- **WHEN** the system needs repository owner and name
- **THEN** it SHALL access `context.repo` for standardized repository info

### Requirement: Platform Factory
The system SHALL provide a factory function to instantiate the correct platform client based on environment detection.

#### Scenario: Detect GitHub environment
- **WHEN** `GITHUB_ACTIONS` environment variable is set
- **THEN** the factory SHALL return a GitHub platform client

#### Scenario: Detect GitLab CI environment
- **WHEN** `GITLAB_CI` environment variable is set
- **THEN** the factory SHALL return a GitLab platform client

#### Scenario: Explicit platform configuration
- **WHEN** `platform` input is explicitly set to "github" or "gitlab"
- **THEN** the factory SHALL return the specified platform client regardless of environment
