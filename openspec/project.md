# Project Context

## Purpose
AI-based PR Reviewer and Summarizer for GitHub pull requests. This is a GitHub Action that uses OpenAI's GPT models to automatically review code changes, provide line-by-line suggestions, generate PR summaries, and create release notes. The tool performs incremental reviews on each commit, supports interactive conversations with the bot, and intelligently skips simple changes to reduce noise and costs.

**Key Features:**
- Automated PR summarization and release notes generation
- Line-by-line code review with suggestions
- Incremental reviews per commit (cost-effective)
- Interactive chat capabilities for code context
- Smart review skipping for trivial changes
- Customizable prompts and review focus areas

## Tech Stack
- **Runtime:** Node.js 16+
- **Language:** TypeScript 4.9.5 (strict mode enabled)
- **Build Tools:**
  - `@vercel/ncc` for bundling
  - TypeScript compiler (`tsc`)
- **Testing:** Jest 27 with ts-jest
- **Code Quality:**
  - ESLint with GitHub plugin
  - Prettier for formatting
- **Key Dependencies:**
  - `@actions/core` & `@actions/github` - GitHub Actions SDK
  - `@octokit/*` - GitHub API client with retry/throttling
  - `@dqbd/tiktoken` - Token counting for OpenAI
  - `minimatch` - File path filtering
  - `p-limit` & `p-retry` - Concurrency and retry control
  - `node-fetch` - HTTP client

## Project Conventions

### Code Style
- **Formatter:** Prettier with the following rules:
  - 80 character line width
  - 2 space indentation (no tabs)
  - Single quotes
  - No semicolons
  - No trailing commas
  - No bracket spacing
  - Arrow functions without parens for single args
  - Always wrap prose
  
- **Linting:** ESLint with:
  - GitHub recommended rules
  - TypeScript ESLint plugin
  - Import plugin for module resolution
  - Prettier integration
  
- **TypeScript:**
  - Strict mode enabled
  - `noImplicitAny: true`
  - ESNext target and module system
  - ES module interop enabled

### Architecture Patterns
- **GitHub Action Architecture:** Entry point at [`src/main.ts`](src/main.ts)
- **Modular Design:**
  - [`src/bot.ts`](src/bot.ts) - Bot interaction logic
  - [`src/commenter.ts`](src/commenter.ts) - GitHub comment management
  - [`src/review.ts`](src/review.ts) - Core review logic
  - [`src/prompts.ts`](src/prompts.ts) - OpenAI prompt templates
  - [`src/options.ts`](src/options.ts) - Configuration management
  - [`src/inputs.ts`](src/inputs.ts) - GitHub Action inputs
  - [`src/octokit.ts`](src/octokit.ts) - GitHub API client setup
  - [`src/tokenizer.ts`](src/tokenizer.ts) - Token counting utilities
  - [`src/limits.ts`](src/limits.ts) - Rate limiting logic
  
- **Separation of Concerns:** Clear boundaries between GitHub API interaction, OpenAI integration, and business logic
- **Retry & Throttling:** Built-in resilience with configurable retry logic and concurrency limits

### Testing Strategy
- **Framework:** Jest with TypeScript support (ts-jest)
- **Test Location:** `__tests__/` directory
- **Test Files:** `*.test.ts` pattern
- **Coverage:** Tests excluded from TypeScript compilation
- **Commands:**
  - `npm test` - Run test suite
  - `npm run all` - Full CI pipeline (build, format, lint, package, test)

### Git Workflow
- **Primary Branch:** `main`
- **Build Process:**
  1. `npm run build` - Compile TypeScript and copy WASM files
  2. `npm run package` - Bundle with ncc
  3. Distribution in `dist/` directory
- **Pre-commit Checks:**
  - Format check with Prettier
  - Lint with ESLint
  - Type checking with TypeScript
- **GitHub Action Triggers:**
  - `pull_request` or `pull_request_target` events
  - `pull_request_review_comment` for bot interactions

## Domain Context
- **AI Code Review:** Uses dual-model approach - lightweight model (gpt-3.5-turbo) for summaries, heavy model (gpt-4) for detailed reviews
- **Token Management:** Critical for cost control - uses tiktoken for accurate token counting before API calls
- **Incremental Reviews:** Tracks file changes between commits to avoid re-reviewing unchanged code
- **Path Filtering:** Extensive default filters to exclude binary files, generated code, vendor directories, and non-reviewable content
- **GitHub Permissions:** Requires `contents: read` and `pull-requests: write` permissions
- **Bot Identity:** Operates as `@coderabbitai` (github-actions[bot])

## Important Constraints
- **OpenAI API Dependency:** Requires valid `OPENAI_API_KEY` - code and diffs are sent to OpenAI servers
- **Data Privacy:** User code is transmitted to OpenAI - compliance review needed for private repositories
- **Cost Management:** GPT-4 is expensive - typical cost ~$20/day for 20-developer team
- **GitHub Action Limits:**
  - Runs in GitHub Actions environment
  - Subject to GitHub Actions timeout limits
  - Default max 150 files per review
- **Fork Limitations:** Requires `pull_request_target` event to access secrets from forked PRs
- **Node Version:** Requires Node.js 17+ for development, runs on Node 16 in GitHub Actions

## External Dependencies
- **OpenAI API:**
  - Base URL: `https://api.openai.com/v1` (configurable)
  - Models: gpt-3.5-turbo (light), gpt-4 (heavy)
  - Configurable timeout (default 360s) and retries (default 5)
  - Concurrency limit (default 6 concurrent calls)
  
- **GitHub API:**
  - Via Octokit with retry and throttling plugins
  - Concurrency limit (default 6 concurrent calls)
  - Requires `GITHUB_TOKEN` (auto-provided in Actions)
  
- **Optional:**
  - `OPENAI_API_ORG` - For multi-organization OpenAI accounts
  - Custom OpenAI-compatible endpoints via `openai_base_url`
