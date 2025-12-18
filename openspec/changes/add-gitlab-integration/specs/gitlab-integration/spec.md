# GitLab Integration Specification

## ADDED Requirements

### Requirement: GitLab API Client
The system SHALL provide a GitLab API client that implements the `IPlatformClient` interface for interacting with GitLab repositories.

#### Scenario: Authenticate with GitLab cloud
- **WHEN** `GITLAB_TOKEN` environment variable is set
- **AND** no custom base URL is configured
- **THEN** the client SHALL authenticate with gitlab.com API

#### Scenario: Authenticate with self-hosted GitLab
- **WHEN** `GITLAB_TOKEN` environment variable is set
- **AND** `gitlab_base_url` is configured (e.g., "https://gitlab.company.com")
- **THEN** the client SHALL authenticate with the self-hosted GitLab API

#### Scenario: Compare commits for merge request
- **WHEN** `compareCommits(base, head)` is called
- **THEN** the client SHALL use GitLab's Repository Compare API
- **AND** return files with patches in the standardized format

#### Scenario: Get file content
- **WHEN** `getFileContent(path, ref)` is called
- **THEN** the client SHALL use GitLab's Repository Files API
- **AND** return the decoded file content

### Requirement: GitLab Merge Request Comments
The system SHALL provide a GitLab commenter that implements the `ICommenter` interface for managing merge request discussions.

#### Scenario: Create summary comment on merge request
- **WHEN** `comment(message, tag, 'create')` is called
- **THEN** the commenter SHALL create a new note on the merge request

#### Scenario: Replace existing summary comment
- **WHEN** `comment(message, tag, 'replace')` is called
- **AND** a note with the specified tag exists
- **THEN** the commenter SHALL update the existing note
- **OTHERWISE** it SHALL create a new note

#### Scenario: Post inline review comments
- **WHEN** `submitReview(mrId, commitId, statusMsg)` is called with buffered comments
- **THEN** the commenter SHALL create discussion threads on the merge request diff
- **AND** each comment SHALL be positioned on the correct line

#### Scenario: Reply to existing discussion
- **WHEN** replying to a review comment
- **THEN** the commenter SHALL add a note to the existing discussion thread

### Requirement: GitLab CI Context
The system SHALL extract merge request context from GitLab CI predefined variables.

#### Scenario: Extract merge request ID
- **WHEN** running in GitLab CI merge request pipeline
- **THEN** the system SHALL read `CI_MERGE_REQUEST_IID` for the MR number

#### Scenario: Extract project information
- **WHEN** running in GitLab CI
- **THEN** the system SHALL read `CI_PROJECT_ID` for the project identifier
- **AND** `CI_PROJECT_PATH` for the namespace/project path

#### Scenario: Extract commit information
- **WHEN** running in GitLab CI merge request pipeline
- **THEN** the system SHALL read `CI_MERGE_REQUEST_DIFF_BASE_SHA` for base commit
- **AND** `CI_COMMIT_SHA` for head commit

#### Scenario: Detect merge request event
- **WHEN** `CI_PIPELINE_SOURCE` equals "merge_request_event"
- **THEN** the system SHALL process the merge request for review

### Requirement: GitLab CI/CD Configuration
The system SHALL support deployment via GitLab CI/CD pipelines.

#### Scenario: Provide CI configuration template
- **WHEN** users want to set up the reviewer in GitLab
- **THEN** documentation SHALL include a `.gitlab-ci.yml` template
- **AND** the template SHALL trigger on merge request events

#### Scenario: Run as GitLab CI job
- **WHEN** the CI job executes
- **THEN** the system SHALL read configuration from CI/CD variables
- **AND** post review comments to the merge request

### Requirement: Self-Hosted GitLab Support
The system SHALL support self-hosted GitLab instances with custom configurations.

#### Scenario: Configure custom GitLab URL
- **WHEN** `gitlab_base_url` input is provided
- **THEN** the client SHALL use this URL as the API base
- **AND** all API calls SHALL be directed to the self-hosted instance

#### Scenario: Handle self-signed certificates
- **WHEN** `gitlab_insecure_ssl` is set to true
- **THEN** the client SHALL skip SSL certificate verification
- **NOTE** This is not recommended for production use

#### Scenario: Use custom CA certificate
- **WHEN** `gitlab_ca_cert` input is provided with a certificate path
- **THEN** the client SHALL use the custom CA for SSL verification

### Requirement: GitLab Rate Limiting
The system SHALL handle GitLab API rate limits gracefully.

#### Scenario: Respect rate limit headers
- **WHEN** GitLab returns rate limit headers
- **THEN** the client SHALL track remaining requests
- **AND** throttle requests when approaching the limit

#### Scenario: Retry on rate limit error
- **WHEN** GitLab returns HTTP 429 (Too Many Requests)
- **THEN** the client SHALL wait for the specified retry-after duration
- **AND** retry the request up to the configured retry limit

### Requirement: GitLab Diff Format Handling
The system SHALL correctly parse GitLab's diff format for inline comments.

#### Scenario: Parse unified diff format
- **WHEN** processing merge request diffs
- **THEN** the system SHALL parse GitLab's unified diff format
- **AND** extract line numbers for comment positioning

#### Scenario: Map line numbers to diff positions
- **WHEN** posting inline comments
- **THEN** the system SHALL calculate the correct `new_line` and `old_line` values
- **AND** position comments accurately on the diff view
