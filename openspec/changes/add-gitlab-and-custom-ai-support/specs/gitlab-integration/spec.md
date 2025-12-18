# Capability: GitLab Integration

## ADDED Requirements

### Requirement: GitLab API Client Configuration
The system SHALL support GitLab API client configuration for both cloud and self-hosted instances.

#### Scenario: GitLab cloud configuration
- **WHEN** `GITLAB_TOKEN` environment variable is set and `GITLAB_API_URL` is not set
- **THEN** the system SHALL use `https://gitlab.com/api/v4` as the default API endpoint

#### Scenario: Self-hosted GitLab configuration
- **WHEN** both `GITLAB_TOKEN` and `GITLAB_API_URL` environment variables are set
- **THEN** the system SHALL use the custom API URL for all GitLab API calls

#### Scenario: Missing GitLab token
- **WHEN** GitLab platform is detected but `GITLAB_TOKEN` is not set
- **THEN** the system SHALL throw an error indicating the token is required

#### Scenario: GitLab CI job token
- **WHEN** running in GitLab CI and `CI_JOB_TOKEN` is available
- **THEN** the system SHALL accept `CI_JOB_TOKEN` as an alternative to `GITLAB_TOKEN`

### Requirement: Merge Request Context Retrieval
The system SHALL retrieve merge request context from GitLab CI environment variables.

#### Scenario: Merge request identification
- **WHEN** running in GitLab CI for a merge request
- **THEN** the system SHALL use `CI_MERGE_REQUEST_IID` and `CI_PROJECT_ID` to identify the merge request

#### Scenario: Merge request details
- **WHEN** merge request context is requested
- **THEN** the system SHALL fetch title, description, author, source branch, target branch, and latest commit SHA from GitLab API

#### Scenario: Non-merge request pipeline
- **WHEN** running in GitLab CI but not for a merge request
- **THEN** the system SHALL exit gracefully with a message indicating it only runs on merge requests

### Requirement: GitLab Comment Management
The system SHALL manage comments on GitLab merge requests using the GitLab API.

#### Scenario: Create merge request note
- **WHEN** a review comment needs to be posted
- **THEN** the system SHALL create a note on the merge request using the GitLab Notes API

#### Scenario: Update existing note
- **WHEN** an existing comment needs to be updated
- **THEN** the system SHALL update the note by ID using the GitLab Notes API

#### Scenario: Delete note
- **WHEN** a comment needs to be removed
- **THEN** the system SHALL delete the note by ID using the GitLab Notes API

#### Scenario: List merge request notes
- **WHEN** existing comments need to be retrieved
- **THEN** the system SHALL fetch all notes from the merge request and filter for bot-created comments

#### Scenario: Bot comment identification
- **WHEN** listing comments to find bot-created ones
- **THEN** the system SHALL use HTML comment tags (same as GitHub) to identify bot comments

### Requirement: GitLab File Changes Retrieval
The system SHALL retrieve changed files and diffs from GitLab merge requests.

#### Scenario: Get merge request changes
- **WHEN** the review process needs changed files
- **THEN** the system SHALL use the GitLab Merge Request Changes API to get the list of modified files

#### Scenario: File diff format
- **WHEN** retrieving file diffs from GitLab
- **THEN** the system SHALL convert GitLab diff format to the standardized internal format

#### Scenario: Large diff handling
- **WHEN** a merge request has more files than the configured limit
- **THEN** the system SHALL process only the configured maximum number of files and log a warning

### Requirement: GitLab CI/CD Integration
The system SHALL provide GitLab CI/CD pipeline configuration for automated reviews.

#### Scenario: GitLab CI YAML configuration
- **WHEN** users want to integrate the reviewer in GitLab CI
- **THEN** the system SHALL provide example `.gitlab-ci.yml` configurations for both Docker and direct execution

#### Scenario: Merge request pipeline trigger
- **WHEN** a merge request is created or updated
- **THEN** the GitLab CI pipeline SHALL trigger the review job automatically

#### Scenario: Environment variable passing
- **WHEN** the review job runs in GitLab CI
- **THEN** all required environment variables SHALL be available from GitLab CI built-in variables and project settings

### Requirement: GitLab Permissions and Authentication
The system SHALL handle GitLab authentication and verify required permissions.

#### Scenario: Personal access token permissions
- **WHEN** using a personal access token
- **THEN** the token MUST have `api` scope to read merge requests and post comments

#### Scenario: Job token permissions
- **WHEN** using GitLab CI job token
- **THEN** the project settings MUST have job token scope enabled for the repository

#### Scenario: Permission verification
- **WHEN** the GitLab platform initializes
- **THEN** the system SHALL verify it can access the merge request and post comments

#### Scenario: Insufficient permissions error
- **WHEN** the token lacks required permissions
- **THEN** the system SHALL throw a clear error indicating which permissions are missing

### Requirement: GitLab API Rate Limiting
The system SHALL handle GitLab API rate limits gracefully.

#### Scenario: Rate limit detection
- **WHEN** a GitLab API call returns a rate limit error (HTTP 429)
- **THEN** the system SHALL wait for the retry-after period before retrying

#### Scenario: Configurable concurrency
- **WHEN** making multiple GitLab API calls
- **THEN** the system SHALL respect the configured concurrency limit to avoid rate limiting

#### Scenario: Self-hosted rate limits
- **WHEN** using self-hosted GitLab with custom rate limits
- **THEN** the system SHALL adapt to the rate limit headers returned by the instance

### Requirement: GitLab Webhook Events
The system SHALL support GitLab webhook events for webhook server deployment.

#### Scenario: Webhook payload parsing
- **WHEN** receiving a GitLab webhook payload
- **THEN** the system SHALL parse the payload to extract merge request or comment details

#### Scenario: Merge request webhook events
- **WHEN** a merge request webhook is received
- **THEN** the system SHALL process events with actions: `open`, `update`, `reopen`

#### Scenario: Comment webhook events
- **WHEN** a note (comment) webhook is received on a merge request
- **THEN** the system SHALL process the comment for bot mentions or commands

#### Scenario: Bot mention detection
- **WHEN** processing a comment webhook
- **THEN** the system SHALL detect mentions of the bot (configurable trigger phrase)

#### Scenario: Interactive Q&A response
- **WHEN** a comment mentions the bot with a question
- **THEN** the system SHALL extract the question, get code context, call AI, and post a reply

#### Scenario: Webhook authentication
- **WHEN** receiving webhook payloads
- **THEN** the system SHALL verify the webhook secret token if configured
