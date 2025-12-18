# 🚀 GitLab Quick Start Guide

Get AI code reviews on your GitLab merge requests in 5 minutes!

## Option 1: Use Pre-built Image (Easiest)

If someone has already built and published the Docker image:

### Step 1: Add `.gitlab-ci.yml` to your repository

```yaml
stages:
  - review

ai-code-review:
  stage: review
  image: registry.gitlab.com/YOUR-USERNAME/ai-pr-reviewer/ai-pr-reviewer:latest
  
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
  
  variables:
    PLATFORM: "gitlab"
    OPENAI_LIGHT_MODEL: "gpt-3.5-turbo"
    OPENAI_HEAVY_MODEL: "gpt-4"
  
  script:
    - echo "Running AI code review..."
```

### Step 2: Add CI/CD Variables

Go to **Settings → CI/CD → Variables** and add:

| Variable | Value | Protected | Masked |
|----------|-------|-----------|--------|
| `GITLAB_TOKEN` | Your GitLab access token (with `api` scope) | ✓ | ✓ |
| `OPENAI_API_KEY` | Your OpenAI API key | ✓ | ✓ |

**Done!** Create a merge request and watch the AI review your code.

---

## Option 2: Build Your Own Image

If you want to build and host the image yourself:

### Step 1: Clone this repository

```bash
git clone https://github.com/coderabbitai/ai-pr-reviewer.git
cd ai-pr-reviewer
```

### Step 2: Build and push to GitLab Container Registry

```bash
# Login to GitLab Container Registry
docker login registry.gitlab.com

# Build the image
docker build -t registry.gitlab.com/YOUR-USERNAME/YOUR-PROJECT/ai-pr-reviewer:latest .

# Push to registry
docker push registry.gitlab.com/YOUR-USERNAME/YOUR-PROJECT/ai-pr-reviewer:latest
```

### Step 3: Use in your project

Add this to your project's `.gitlab-ci.yml`:

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

### Step 4: Add CI/CD Variables

Same as Option 1 - add `GITLAB_TOKEN` and `OPENAI_API_KEY` in Settings → CI/CD → Variables.

---

## Option 3: Auto-build in Your Repository

Let GitLab build the image automatically:

### Step 1: Copy files to your repository

Copy these files from this repository to yours:
- `Dockerfile`
- `.dockerignore`
- `src/` folder
- `package.json`
- `package-lock.json`
- `tsconfig.json`

### Step 2: Add `.gitlab-ci.yml`

```yaml
stages:
  - build
  - review

# Build the image when you push to main
build-ai-reviewer:
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

# Use the image for reviews
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

### Step 3: Add CI/CD Variables

Same as before - add `GITLAB_TOKEN` and `OPENAI_API_KEY`.

### Step 4: Push to main branch

The image will build automatically, then be used for all future merge requests.

---

## 🔑 Getting Your Tokens

### GitLab Token

1. Go to **Settings → Access Tokens** (or your profile → Access Tokens)
2. Create a new token with:
   - Name: `AI Reviewer`
   - Scopes: `api` ✓
   - Expiration: Set as needed
3. Copy the token and add it to CI/CD variables as `GITLAB_TOKEN`

### OpenAI API Key

1. Go to https://platform.openai.com/account/api-keys
2. Create a new API key
3. Copy it and add to CI/CD variables as `OPENAI_API_KEY`

---

## 🎨 Customization

You can customize the review by changing variables:

```yaml
variables:
  PLATFORM: "gitlab"
  
  # Models
  OPENAI_LIGHT_MODEL: "gpt-3.5-turbo"    # For summaries (cheap)
  OPENAI_HEAVY_MODEL: "gpt-4"            # For reviews (better quality)
  
  # Settings
  MAX_FILES: "150"                        # Max files to review
  REVIEW_SIMPLE_CHANGES: "false"          # Skip simple changes
  REVIEW_COMMENT_LGTM: "false"            # Skip commenting on good code
  DEBUG: "false"                          # Enable debug logs
```

---

## 🏢 Self-Hosted GitLab

For self-hosted GitLab, add these variables:

| Variable | Value | Example |
|----------|-------|---------|
| `GITLAB_BASE_URL` | Your GitLab URL | `https://gitlab.company.com` |
| `GITLAB_CA_CERT` | Path to CA cert | `/etc/ssl/certs/ca.crt` |

---

## ❓ Troubleshooting

### "Image not found"
- Make sure you've built and pushed the image
- Check the image name matches in your `.gitlab-ci.yml`

### "Permission denied"
- Verify `GITLAB_TOKEN` has `api` scope
- Check token hasn't expired

### "No reviews appearing"
- Ensure the job runs on merge requests: `$CI_PIPELINE_SOURCE == "merge_request_event"`
- Check both tokens are set correctly
- Enable `DEBUG: "true"` to see logs

### "OpenAI API error"
- Verify your `OPENAI_API_KEY` is correct
- Check you have credits in your OpenAI account
- Try with `gpt-3.5-turbo` only to reduce costs

---

## 💰 Cost Estimate

- **gpt-3.5-turbo**: ~$0.01 per review (summaries)
- **gpt-4**: ~$0.50-$2 per review (detailed review)
- **Typical**: ~$20/day for 20 developers

You can reduce costs by:
- Using only `gpt-3.5-turbo` for both models
- Setting `REVIEW_SIMPLE_CHANGES: "false"`
- Setting `MAX_FILES: "50"`

---

## 📚 More Information

- Full Docker setup guide: [DOCKER_SETUP.md](./DOCKER_SETUP.md)
- Example configurations: [.gitlab-ci.example.yml](./.gitlab-ci.example.yml)
- GitHub setup: [README.md](./README.md)

---

## 🎉 That's It!

Create a merge request and watch the AI review your code automatically!
