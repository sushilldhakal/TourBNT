# Google Cloud Run Deployment Guide

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed: https://cloud.google.com/sdk/docs/install
3. **Git repository** pushed to GitHub

## Initial Setup

### 1. Install gcloud CLI

```bash
# macOS
brew install google-cloud-sdk

# Or download from: https://cloud.google.com/sdk/docs/install
```

### 2. Login and Configure

```bash
# Login to Google Cloud
gcloud auth login

# Set your project (create one if needed)
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### 3. Set Environment Variables in Cloud Run

```bash
# Set all your environment variables
gcloud run services update tourbnt \
  --region=us-central1 \
  --update-env-vars="
MONGO_CONNECTION_STRING=your_mongodb_uri,
JWT_SECRET=your_jwt_secret,
CLOUDINARY_CLOUD=your_cloud_name,
CLOUDINARY_API_KEY=your_api_key,
CLOUDINARY_API_SECRET=your_api_secret,
FRONTEND_DOMAIN=https://your-app.run.app,
EMAIL_USER=your_email,
SENDGRID_API_KEY=your_sendgrid_key,
ENCRYPTION_KEY=your_encryption_key
"
```

## Deployment Methods

### Method 1: Deploy from Local (Quick Test)

```bash
# Build and deploy directly
gcloud run deploy tourbnt \
  --source . \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=2Gi \
  --cpu=2
```

### Method 2: Deploy from GitHub (Recommended)

#### A. Connect GitHub Repository

```bash
# Connect your GitHub repo to Cloud Build
gcloud builds triggers create github \
  --repo-name=TourBNT \
  --repo-owner=YOUR_GITHUB_USERNAME \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml
```

#### B. Push to GitHub to Deploy

```bash
git push origin main
# Cloud Build will automatically build and deploy!
```

### Method 3: Manual Build and Deploy

```bash
# 1. Build the image
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/tourbnt

# 2. Deploy to Cloud Run
gcloud run deploy tourbnt \
  --image gcr.io/YOUR_PROJECT_ID/tourbnt \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated
```

## Configuration

### Update Environment Variables

```bash
# Update specific variables
gcloud run services update tourbnt \
  --region=us-central1 \
  --update-env-vars="MONGO_CONNECTION_STRING=new_value"
```

### Scale Configuration

```bash
# Set min/max instances
gcloud run services update tourbnt \
  --region=us-central1 \
  --min-instances=1 \
  --max-instances=10
```

### Memory and CPU

```bash
# Update resources
gcloud run services update tourbnt \
  --region=us-central1 \
  --memory=4Gi \
  --cpu=4
```

## Monitoring

### View Logs

```bash
# Stream logs
gcloud run services logs read tourbnt \
  --region=us-central1 \
  --follow

# View recent logs
gcloud run services logs read tourbnt \
  --region=us-central1 \
  --limit=50
```

### Check Service Status

```bash
# Get service details
gcloud run services describe tourbnt \
  --region=us-central1

# List all services
gcloud run services list
```

## Custom Domain

### 1. Map Custom Domain

```bash
# Map your domain
gcloud run domain-mappings create \
  --service=tourbnt \
  --domain=tourbnt.com \
  --region=us-central1
```

### 2. Update DNS Records

Follow the instructions from the command output to update your DNS records.

## Cost Optimization

### Free Tier Limits
- 2 million requests per month
- 360,000 GB-seconds of memory
- 180,000 vCPU-seconds

### Tips to Reduce Costs
1. Set `--min-instances=0` for development
2. Use `--memory=1Gi` if possible
3. Set appropriate `--max-instances`
4. Enable request timeout: `--timeout=300`

## Troubleshooting

### Build Fails

```bash
# Check build logs
gcloud builds list --limit=5
gcloud builds log BUILD_ID
```

### Service Not Starting

```bash
# Check service logs
gcloud run services logs read tourbnt --region=us-central1 --limit=100

# Check service configuration
gcloud run services describe tourbnt --region=us-central1
```

### Environment Variables Not Working

```bash
# List current env vars
gcloud run services describe tourbnt \
  --region=us-central1 \
  --format="value(spec.template.spec.containers[0].env)"
```

## Rollback

```bash
# List revisions
gcloud run revisions list --service=tourbnt --region=us-central1

# Rollback to previous revision
gcloud run services update-traffic tourbnt \
  --region=us-central1 \
  --to-revisions=REVISION_NAME=100
```

## CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: google-github-actions/setup-gcloud@v1
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: ${{ secrets.GCP_PROJECT_ID }}
      
      - name: Build and Deploy
        run: |
          gcloud builds submit --config cloudbuild.yaml
```

## Security Best Practices

1. **Never commit credentials** - Use Cloud Run environment variables
2. **Use Secret Manager** for sensitive data:
   ```bash
   gcloud secrets create mongodb-uri --data-file=-
   ```
3. **Enable VPC** for database connections
4. **Use IAM** for service-to-service authentication
5. **Enable Cloud Armor** for DDoS protection

## Useful Commands

```bash
# Delete service
gcloud run services delete tourbnt --region=us-central1

# Update service with new image
gcloud run services update tourbnt \
  --image gcr.io/PROJECT_ID/tourbnt:latest \
  --region=us-central1

# Get service URL
gcloud run services describe tourbnt \
  --region=us-central1 \
  --format="value(status.url)"
```

## Support

- Cloud Run Documentation: https://cloud.google.com/run/docs
- Pricing Calculator: https://cloud.google.com/products/calculator
- Community Support: https://stackoverflow.com/questions/tagged/google-cloud-run
