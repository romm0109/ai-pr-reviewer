# Easy Docker Setup for GitLab CI/CD

This guide shows you how to use the AI PR Reviewer with a simple Docker container - no complex configuration needed!

## 🚀 Quick Start (3 Steps)

### Step 1: Build the Docker Image

Build the Docker image and push it to your GitLab Container Registry:

```bash
# Login to GitLab Container Registry
docker login registry.gitlab.com

# Build the image
docker build -t registry.gitlab.com/YOUR-USERNAME/YOUR-PROJECT/ai-pr-reviewer:latest .

# Push to registry
docker push registry.gitlab.com/YOUR-USERNAME/YOUR-PROJECT/ai-pr-reviewer:latest
```

**Or use GitLab CI/CD to build it automatically** - see the build job in `.gitlab-ci.simple.yml`

### Step 2: Add CI/CD Variables

In your GitLab project, go to **Settings → CI/CD → Variables** and add:

1. **`GITLAB_TOKEN`**
   - Value: Create a token at Settings → Access Tokens
   - Scopes: `api`
   - Protected: ✓
   - Masked: ✓

2. **`OPENAI_API_KEY`**
   - Value: Your OpenAI API key from https://platform.openai.com/account/api-keys
   - Protected: ✓
   - Masked: ✓

### Step 3: Add to Your `.gitlab-ci.yml`

Copy this simple configuration to your repository's `.gitlab-ci.yml`:

```yaml
stages:
  - review

ai-code-review:
  stage: review
  image: registry.gitlab.com/YOUR-USERNAME/YOUR-PROJECT/ai-pr-reviewer:latest
  
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
  
  variables:
    PLATFORM: "gitlab"
    OPENAI_LIGHT_MODEL: "gpt-3.5-turbo"
    OPENAI_HEAVY_MODEL: "gpt-4"
  
  script:
    - echo "Running AI code review..."
```

**That's it!** 🎉

---

## 📦 Using Docker Hub (Alternative)

If you prefer Docker Hub over GitLab Container Registry:

```bash
# Build and push to Docker Hub
docker build -t YOUR-DOCKERHUB-USERNAME/ai-pr-reviewer:latest .
docker push YOUR-DOCKERHUB-USERNAME/ai-pr-reviewer:latest
```

Then use in `.gitlab-ci.yml`:
```yaml
image: YOUR-DOCKERHUB-USERNAME/ai-pr-reviewer:latest
```

---

## 🏢 For Self-Hosted GitLab

Add these additional variables in **Settings → CI/CD → Variables**:

- **`GITLAB_BASE_URL`**: Your GitLab URL (e.g., `https://gitlab.company.com`)
- **`GITLAB_CA_CERT`**: Path to CA certificate (if needed)

---

## 🔧 Customization Options

You can customize the review behavior by adding these variables:

```yaml
variables:
  PLATFORM: "gitlab"
  
  # AI Models
  OPENAI_LIGHT_MODEL: "gpt-3.5-turbo"  # For summaries
  OPENAI_HEAVY_MODEL: "gpt-4"          # For detailed reviews
  OPENAI_MODEL_TEMPERATURE: "0.05"
  
  # Review Settings
  MAX_FILES: "150"                      # Max files to review
  REVIEW_SIMPLE_CHANGES: "false"        # Skip simple changes
  REVIEW_COMMENT_LGTM: "false"          # Skip commenting on good code
  DISABLE_REVIEW: "false"               # Only summarize, no review
  DISABLE_RELEASE_NOTES: "false"        # Skip release notes
  
  # Debug
  DEBUG: "false"                        # Enable debug logging
```

---

## 🐳 Building with GitLab CI/CD (Automated)

Add this to your `.gitlab-ci.yml` to automatically build and publish the Docker image:

```yaml
stages:
  - build
  - review

build-reviewer-image:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build -t ${CI_REGISTRY_IMAGE}/ai-pr-reviewer:latest .
    - docker push ${CI_REGISTRY_IMAGE}/ai-pr-reviewer:latest
  only:
    - main

ai-code-review:
  stage: review
  image: ${CI_REGISTRY_IMAGE}/ai-pr-reviewer:latest
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
  variables:
    PLATFORM: "gitlab"
    OPENAI_LIGHT_MODEL: "gpt-3.5-turbo"
    OPENAI_HEAVY_MODEL: "gpt-4"
  script:
    - echo "Running AI code review..."
```

This will:
1. Build the Docker image when you push to `main`
2. Use that image for all merge request reviews

---

## 📝 What the Container Does

The Docker container:
- ✅ Contains all the code and dependencies
- ✅ Automatically runs the reviewer on merge requests
- ✅ Posts comments and summaries to your MR
- ✅ No need to copy files or install dependencies

---

## 🆚 Comparison: Before vs After

### Before (Complex):
```yaml
ai-code-review:
  image: node:18-alpine
  before_script:
    - npm ci --production  # Install dependencies every time
  script:
    - node dist/index.js   # Need dist/ folder in repo
  cache:
    paths:
      - node_modules/      # Manage caching
```

### After (Simple):
```yaml
ai-code-review:
  image: registry.gitlab.com/YOUR-USERNAME/YOUR-PROJECT/ai-pr-reviewer:latest
  script:
    - echo "Running AI code review..."  # That's it!
```

---

## 🔍 Troubleshooting

### Image not found
Make sure you've built and pushed the image to your registry.

### Permission denied
Check that `GITLAB_TOKEN` has the `api` scope.

### Reviews not appearing
1. Check that the job runs on merge requests: `$CI_PIPELINE_SOURCE == "merge_request_event"`
2. Verify `GITLAB_TOKEN` and `OPENAI_API_KEY` are set correctly
3. Enable `DEBUG: "true"` to see detailed logs

---

## 💡 Pro Tips

1. **Use image tags** for version control:
   ```yaml
   image: registry.gitlab.com/YOUR-USERNAME/YOUR-PROJECT/ai-pr-reviewer:v1.0.0
   ```

2. **Build once, use everywhere**: Build the image in one project, use it in multiple projects

3. **Cache the image**: GitLab runners cache Docker images automatically

4. **Update easily**: Just rebuild and push the image when you want to update
