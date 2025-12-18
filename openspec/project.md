# Project Context

## Purpose

AI-based PR Reviewer and Summarizer (CodeRabbit) - An automated code review tool that uses OpenAI's GPT models to provide intelligent, context-aware code reviews and summaries for GitHub pull requests. The tool performs incremental reviews on each commit, provides line-by-line suggestions, generates release notes, and supports interactive conversations with the bot.

**Key Goals:**
- Automate code review process using AI to improve code quality
- Provide cost-effective incremental reviews that track changes between commits
- Generate comprehensive PR summaries and release notes
- Enable interactive code discussions through bot conversations
- Support customizable review prompts and focus areas

## Tech Stack

### Core Technologies
- **TypeScript 4.9.5** - Primary language with strict type checking
- **Node.js 16+** - Runtime environment (GitHub Actions compatible)
- **GitHub Actions** - Deployment and execution platform

### Key Dependencies
- **@actions/core** & **@actions/github** - GitHub Actions SDK
- **@octokit/action** - GitHub API client with retry and throttling plugins
- **chatgpt (v5.2.5)** - OpenAI ChatGPT API integration
- **@dqbd/tiktoken** - Token counting for OpenAI models
- **minimatch** - File path pattern matching for filters
- **p-limit** & **p-retry** - Concurrency control and retry logic
- **node-fetch** - HTTP client with polyfill support

### Development Tools
- **ESLint** - Linting with TypeScript, GitHub, and Prettier plugins
- **Prettier 2.8.8** - Code formatting
- **Jest 27** with **ts-jest** - Testing framework
- **@vercel/ncc** - Bundling for distribution

## Project Conventions

### Code Style

**Formatting (Prettier):**
- 80 character line width
- 2 spaces for indentation (no tabs)
- Single quotes for strings
- No semicolons
- No trailing commas
- No bracket spacing in objects: `{key: value}`
- Arrow function parens: avoid when possible `x => x`

**TypeScript:**
- Strict mode enabled (`strict: true`, `noImplicitAny: true`)
- ESNext target and module system
- ES module interop enabled
- Isolated modules for faster compilation

**Naming Conventions:**
- camelCase for variables, functions, and methods
- PascalCase for classes and types/interfaces
- UPPER_SNAKE_CASE for environment variables
- Descriptive names that reflect purpose

**Linting:**
- Extends GitHub recommended config
- TypeScript ESLint parser with latest ECMAVersion
- Import plugin for module resolution
- Jest plugin for test files
- i18n-text/no-en rule disabled

### Architecture Patterns

**Modular Design:**
- Separation of concerns: bot logic, review logic, commenting, options, prompts
- Platform abstraction (prepared for multi-platform support beyond GitHub)
- Single responsibility principle for each module

**Key Modules:**
- [`bot.ts`](src/bot.ts) - OpenAI ChatGPT API wrapper with retry logic
- [`review.ts`](src/review.ts) - Core PR review orchestration
- [`commenter.ts`](src/commenter.ts) - GitHub comment management
- [`options.ts`](src/options.ts) - Configuration and input handling
- [`prompts.ts`](src/prompts.ts) - AI prompt templates
- [`tokenizer.ts`](src/tokenizer.ts) - Token counting and limits
- [`main.ts`](src/main.ts) - Entry point and event routing

**Design Patterns:**
- **Dual-bot pattern**: Separate "light" (gpt-3.5-turbo) and "heavy" (gpt-4) bots for cost optimization
- **Incremental processing**: Review changes commit-by-commit rather than entire PR
- **Retry with exponential backoff**: Using p-retry for API resilience
- **Concurrency limiting**: Controlled parallel API calls to OpenAI and GitHub
- **Conversation threading**: Maintains context via parentMessageId and conversationId

### Testing Strategy

**Framework:** Jest with ts-jest transformer

**Test Location:** `__tests__/` directory with `*.test.ts` pattern

**Coverage Areas:**
- Unit tests for core functionality
- Mock GitHub Actions environment
- Test OpenAI API interactions with mocks

**Running Tests:**
```bash
npm test              # Run tests
npm run all          # Build, format, lint, package, and test
```

**Quality Gates:**
- All tests must pass before packaging
- Linting must pass (ESLint)
- Formatting must be consistent (Prettier)

### Git Workflow

**Branching:**
- `main` branch for stable releases
- Feature branches for development
- PR-based workflow with required reviews

**Commit Conventions:**
- Descriptive commit messages
- Reference issues/PRs when applicable
- Atomic commits that represent single logical changes

**CI/CD:**
- GitHub Actions for automated testing and building
- Automated packaging with `@vercel/ncc`
- Distribution via `dist/` directory (bundled output)

## Domain Context

### AI Code Review Domain

**Review Focus Areas:**
- Logic correctness and algorithmic efficiency
- Security vulnerabilities and data handling
- Performance optimization opportunities
- Data races and concurrency issues
- Error handling and edge cases
- Code maintainability and modularity
- Complexity reduction
- Best practices: DRY, SOLID, KISS principles

**Smart Review Behavior:**
- Skips in-depth review for trivial changes (typos, formatting) unless configured otherwise
- Avoids commenting on minor style issues or missing documentation
- Focuses on significant concerns that impact code quality
- Provides actionable code snippets for improvements

### OpenAI Integration

**Model Strategy:**
- **Light model** (gpt-3.5-turbo): PR summaries, file-level diffs, simple tasks
- **Heavy model** (gpt-4): In-depth code reviews, complex analysis, conversations

**Token Management:**
- Track token limits per model
- Knowledge cutoff dates included in system messages
- Response token limits to control costs
- Tiktoken for accurate token counting

**Conversation Context:**
- Maintains conversation threads for interactive discussions
- Supports @coderabbitai mentions for bot invocation
- Context-aware responses based on code hunks and file content

## Important Constraints

### Technical Constraints
- **Node.js 16+ required** - GitHub Actions compatibility
- **GitHub Actions environment** - Designed specifically for GitHub Actions runtime
- **OpenAI API dependency** - Requires valid OPENAI_API_KEY
- **Token limits** - Must respect OpenAI model token constraints
- **Rate limiting** - Configurable concurrency for API calls (default: 6 concurrent)
- **File size limits** - Max files configurable (default: 150)

### Cost Constraints
- **OpenAI API costs** - gpt-4 is expensive; use strategically
- **Incremental reviews** - Minimize redundant analysis to reduce costs
- **Smart skipping** - Avoid reviewing trivial changes

### Security Constraints
- **Code privacy** - User code sent to OpenAI servers (compliance consideration)
- **API key security** - Must be stored in GitHub Secrets
- **Token permissions** - Requires `contents: read` and `pull-requests: write`

### Operational Constraints
- **Timeout limits** - Default 360s (6 min) for OpenAI API calls
- **Retry limits** - Default 5 retries for failed API calls
- **Path filters** - Extensive exclusion list for binary/generated files

## External Dependencies

### Required Services
- **OpenAI API** - Core AI functionality
  - Base URL: `https://api.openai.com/v1` (configurable)
  - Models: gpt-3.5-turbo, gpt-4
  - Requires API key and optional organization ID

- **GitHub API** - Platform integration
  - Octokit with retry and throttling plugins
  - Webhook events: `pull_request`, `pull_request_target`, `pull_request_review_comment`
  - Requires GITHUB_TOKEN (auto-provided in Actions)

### Optional Integrations
- **Custom OpenAI-compatible APIs** - Configurable base URL for alternative providers
- **Multi-language support** - ISO language codes for response localization (default: en-US)

### Build Dependencies
- **@vercel/ncc** - Bundles TypeScript and dependencies into single `dist/index.js`
- **Tiktoken WASM** - Binary file copied to dist during build process

### File Exclusions (Path Filters)
Automatically excludes from review:
- Binary files (executables, archives, media)
- Generated code (`gen/`, `_gen/`, `generated/`, `@generated/`)
- Vendor dependencies
- Lock files and configuration files (YAML, JSON, TOML, etc.)
- Minified JavaScript
- Infrastructure state files (Terraform)
- Documentation images and assets
