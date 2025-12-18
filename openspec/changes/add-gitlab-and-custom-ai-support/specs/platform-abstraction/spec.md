# Capability: Platform Abstraction

## ADDED Requirements

### Requirement: Platform Interface Definition
The system SHALL define a platform-agnostic interface that abstracts all platform-specific operations for code review workflows.

#### Scenario: Platform interface contract
- **WHEN** a platform implementation is created
- **THEN** it MUST implement all required methods: initialize, getPullRequest, createComment, updateComment, deleteComment, listComments, getChangedFiles, getDiff

#### Scenario: Multiple platform support
- **WHEN** the system needs to support multiple platforms
- **THEN** each platform SHALL implement the same interface without modifying core review logic

### Requirement: Platform Detection
The system SHALL automatically detect the current platform based on environment variables.

#### Scenario: GitHub Actions detection
- **WHEN** environment variable `GITHUB_ACTIONS` is set to `true`
- **THEN** the system SHALL initialize the GitHub platform adapter

#### Scenario: GitLab CI detection
- **WHEN** environment variable `GITLAB_CI` is set to `true`
- **THEN** the system SHALL initialize the GitLab platform adapter

#### Scenario: Explicit platform override
- **WHEN** environment variable `FORCE_PLATFORM` is set to a valid platform name
- **THEN** the system SHALL use the specified platform regardless of auto-detection

#### Scenario: Unknown platform error
- **WHEN** no platform can be detected from environment variables
- **THEN** the system SHALL throw an error with a clear message indicating platform detection failed

### Requirement: Platform Context
The system SHALL provide a unified context object containing pull request or merge request information.

#### Scenario: Pull request context structure
- **WHEN** platform context is requested
- **THEN** it SHALL include: repository owner, repository name, PR/MR number, title, description, author, base branch, head branch, commit SHA

#### Scenario: Platform-agnostic access
- **WHEN** core review logic accesses PR/MR information
- **THEN** it SHALL use the platform context interface without platform-specific code

### Requirement: Comment Management Abstraction
The system SHALL provide platform-agnostic methods for managing review comments.

#### Scenario: Create comment
- **WHEN** a review comment needs to be posted
- **THEN** the platform adapter SHALL create the comment using platform-specific APIs and return a comment ID

#### Scenario: Update existing comment
- **WHEN** an existing comment needs to be updated
- **THEN** the platform adapter SHALL update the comment by ID using platform-specific APIs

#### Scenario: Delete comment
- **WHEN** a comment needs to be removed
- **THEN** the platform adapter SHALL delete the comment by ID using platform-specific APIs

#### Scenario: List all comments
- **WHEN** existing comments need to be retrieved
- **THEN** the platform adapter SHALL return all comments in a standardized format

### Requirement: File Change Abstraction
The system SHALL provide platform-agnostic access to changed files and diffs.

#### Scenario: Get changed files list
- **WHEN** the review process needs to know which files changed
- **THEN** the platform adapter SHALL return a list of changed files with paths and change types

#### Scenario: Get file diff
- **WHEN** the review process needs the diff for a specific file
- **THEN** the platform adapter SHALL return the unified diff in a standardized format

#### Scenario: Handle binary files
- **WHEN** a changed file is binary
- **THEN** the platform adapter SHALL indicate the file is binary and provide no diff content

### Requirement: Error Handling Consistency
The system SHALL provide consistent error handling across all platform implementations.

#### Scenario: API rate limit error
- **WHEN** a platform API returns a rate limit error
- **THEN** the system SHALL retry with exponential backoff up to the configured retry limit

#### Scenario: Authentication error
- **WHEN** a platform API returns an authentication error
- **THEN** the system SHALL throw a clear error indicating invalid or missing credentials

#### Scenario: Network error
- **WHEN** a platform API call fails due to network issues
- **THEN** the system SHALL retry up to the configured retry limit before failing

### Requirement: Platform Factory
The system SHALL provide a factory function to create the appropriate platform instance.

#### Scenario: Platform factory creation
- **WHEN** the application initializes
- **THEN** the factory SHALL detect the platform and return the correct platform implementation

#### Scenario: Platform factory caching
- **WHEN** the platform instance is requested multiple times
- **THEN** the factory SHALL return the same instance (singleton pattern)
