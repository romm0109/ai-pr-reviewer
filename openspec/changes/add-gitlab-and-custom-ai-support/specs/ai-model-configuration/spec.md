# Capability: AI Model Configuration

## ADDED Requirements

### Requirement: Custom AI Endpoint Configuration
The system SHALL support custom AI model endpoints via environment variables.

#### Scenario: Custom endpoint URL
- **WHEN** `CUSTOM_AI_ENDPOINT` environment variable is set
- **THEN** the system SHALL use the custom endpoint instead of the default OpenAI endpoint

#### Scenario: Custom API key
- **WHEN** `CUSTOM_AI_API_KEY` environment variable is set
- **THEN** the system SHALL use the custom API key for authentication

#### Scenario: Fallback to OpenAI
- **WHEN** custom AI environment variables are not set
- **THEN** the system SHALL use `OPENAI_API_KEY` and default OpenAI endpoint

#### Scenario: Missing API key error
- **WHEN** neither `CUSTOM_AI_API_KEY` nor `OPENAI_API_KEY` is set
- **THEN** the system SHALL throw an error indicating an API key is required

### Requirement: Custom Model Names
The system SHALL support custom model names for light and heavy review tasks.

#### Scenario: Custom light model
- **WHEN** `CUSTOM_AI_LIGHT_MODEL` environment variable is set
- **THEN** the system SHALL use the specified model name for light tasks (summaries, simple diffs)

#### Scenario: Custom heavy model
- **WHEN** `CUSTOM_AI_HEAVY_MODEL` environment variable is set
- **THEN** the system SHALL use the specified model name for heavy tasks (code reviews, complex analysis)

#### Scenario: Model name fallback
- **WHEN** custom model names are not set
- **THEN** the system SHALL use the action input values or defaults (gpt-3.5-turbo, gpt-4)

#### Scenario: Same model for both tasks
- **WHEN** only one custom model is specified
- **THEN** the system SHALL allow using the same model for both light and heavy tasks

### Requirement: Custom Organization ID
The system SHALL support custom organization IDs for AI providers that require them.

#### Scenario: Custom organization ID
- **WHEN** `CUSTOM_AI_ORG_ID` environment variable is set
- **THEN** the system SHALL include the organization ID in API requests

#### Scenario: Optional organization ID
- **WHEN** `CUSTOM_AI_ORG_ID` is not set
- **THEN** the system SHALL make API requests without an organization ID

### Requirement: Configuration Precedence
The system SHALL follow a clear precedence order for AI configuration.

#### Scenario: Environment variable precedence
- **WHEN** both custom AI environment variables and action inputs are set
- **THEN** environment variables SHALL take precedence over action inputs

#### Scenario: Configuration priority order
- **WHEN** resolving AI configuration
- **THEN** the system SHALL use this order: 1) Custom AI env vars, 2) Action inputs, 3) OpenAI defaults

#### Scenario: Partial custom configuration
- **WHEN** only some custom AI environment variables are set
- **THEN** the system SHALL use custom values where available and fall back to defaults for missing values

### Requirement: OpenAI-Compatible API Format
The system SHALL require custom AI endpoints to be OpenAI-compatible.

#### Scenario: API compatibility validation
- **WHEN** a custom AI endpoint is configured
- **THEN** the system SHALL validate that the endpoint accepts OpenAI-compatible request formats

#### Scenario: Incompatible endpoint error
- **WHEN** a custom endpoint returns an incompatible response format
- **THEN** the system SHALL throw a clear error indicating the endpoint is not OpenAI-compatible

#### Scenario: Supported providers documentation
- **WHEN** users configure custom AI endpoints
- **THEN** documentation SHALL list known compatible providers (Azure OpenAI, OpenRouter, self-hosted OpenAI, etc.)

### Requirement: Custom AI Timeout and Retry Configuration
The system SHALL support custom timeout and retry settings for AI API calls.

#### Scenario: Custom timeout
- **WHEN** `CUSTOM_AI_TIMEOUT_MS` environment variable is set
- **THEN** the system SHALL use the specified timeout for AI API calls

#### Scenario: Custom retry count
- **WHEN** `CUSTOM_AI_RETRIES` environment variable is set
- **THEN** the system SHALL retry failed AI API calls up to the specified count

#### Scenario: Default timeout and retries
- **WHEN** custom timeout and retry settings are not set
- **THEN** the system SHALL use action input values or defaults (360000ms, 5 retries)

### Requirement: Custom AI Temperature Configuration
The system SHALL support custom temperature settings for AI model responses.

#### Scenario: Custom temperature
- **WHEN** `CUSTOM_AI_TEMPERATURE` environment variable is set
- **THEN** the system SHALL use the specified temperature value for AI API calls

#### Scenario: Temperature validation
- **WHEN** a custom temperature is provided
- **THEN** the system SHALL validate it is between 0.0 and 2.0

#### Scenario: Default temperature
- **WHEN** custom temperature is not set
- **THEN** the system SHALL use the action input value or default (0.05)

### Requirement: Configuration Logging
The system SHALL log AI configuration for debugging purposes.

#### Scenario: Configuration logging
- **WHEN** the system initializes with AI configuration
- **THEN** it SHALL log the endpoint URL, model names, and timeout settings (but NOT API keys)

#### Scenario: Sensitive data protection
- **WHEN** logging AI configuration
- **THEN** the system SHALL mask or omit API keys and tokens

#### Scenario: Debug mode configuration
- **WHEN** debug mode is enabled
- **THEN** the system SHALL log additional details about AI API requests and responses

### Requirement: Backward Compatibility
The system SHALL maintain backward compatibility with existing OpenAI-only configurations.

#### Scenario: Existing GitHub Actions workflows
- **WHEN** an existing workflow uses only `OPENAI_API_KEY` and action inputs
- **THEN** the system SHALL work without any configuration changes

#### Scenario: No breaking changes
- **WHEN** custom AI features are added
- **THEN** existing workflows SHALL continue to function identically

#### Scenario: Migration path
- **WHEN** users want to migrate from OpenAI to custom endpoints
- **THEN** they SHALL only need to add custom AI environment variables without removing existing configuration
