# MedGemma 27B on Vertex AI - Complete Setup Guide

## Overview

This guide walks through deploying **MedGemma 27B** (multimodal medical AI model) on **Google Cloud Vertex AI Model Garden** for production inference.

**Estimated Time:** 30-45 minutes  
**Cost:** ~$2-4/hour for A100 GPU (pay-per-use)  
**Prerequisites:** GCP Account with billing enabled

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Create GCP Project](#2-create-gcp-project)
3. [Enable Required APIs](#3-enable-required-apis)
4. [Accept MedGemma License](#4-accept-medgemma-license)
5. [Deploy MedGemma via Model Garden](#5-deploy-medgemma-via-model-garden)
6. [Create Service Account](#6-create-service-account)
7. [Configure Environment Variables](#7-configure-environment-variables)
8. [Test the Deployment](#8-test-the-deployment)
9. [Integrate with Virtual Tumor Board](#9-integrate-with-virtual-tumor-board)
10. [Cost Optimization](#10-cost-optimization)

---

## 1. Prerequisites

### Required Accounts
- [ ] Google Cloud Platform account
- [ ] Billing enabled on GCP
- [ ] HuggingFace account (for license acceptance)

### Required Tools
```bash
# Install Google Cloud CLI
# macOS
brew install google-cloud-sdk

# Linux
curl https://sdk.cloud.google.com | bash

# Windows - download installer from:
# https://cloud.google.com/sdk/docs/install
```

### Verify Installation
```bash
gcloud --version
# Should show: Google Cloud SDK 4xx.x.x or higher
```

---

## 2. Create GCP Project

### Option A: Via Console (Recommended for First Time)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click the project dropdown (top-left, next to "Google Cloud")
3. Click **"New Project"**
4. Enter:
   - **Project name:** `virtual-tumor-board` (or your preferred name)
   - **Organization:** Select your org or "No organization"
   - **Location:** Select folder or leave default
5. Click **"Create"**
6. Wait for project creation (30-60 seconds)
7. Select the new project from the dropdown

### Option B: Via CLI
```bash
# Create project
gcloud projects create virtual-tumor-board-prod --name="Virtual Tumor Board"

# Set as default
gcloud config set project virtual-tumor-board-prod
```

### Enable Billing
1. Go to [Billing](https://console.cloud.google.com/billing)
2. Link your project to a billing account
3. If no billing account exists, create one with a credit card

---

## 3. Enable Required APIs

### Via Console
1. Go to [APIs & Services > Library](https://console.cloud.google.com/apis/library)
2. Search and enable each of these APIs:
   - **Vertex AI API**
   - **Cloud Storage API**
   - **IAM API**
   - **Compute Engine API**

### Via CLI (Faster)
```bash
# Set your project
gcloud config set project YOUR_PROJECT_ID

# Enable all required APIs
gcloud services enable \
  aiplatform.googleapis.com \
  storage.googleapis.com \
  iam.googleapis.com \
  compute.googleapis.com
```

### Verify APIs are Enabled
```bash
gcloud services list --enabled | grep -E "(aiplatform|storage|iam|compute)"
```

---

## 4. Accept MedGemma License

MedGemma requires accepting the **Health AI Developer Foundations License**.

### Step 4.1: Accept on HuggingFace
1. Go to [MedGemma 27B on HuggingFace](https://huggingface.co/google/medgemma-27b-it)
2. Log in to your HuggingFace account
3. Click **"Acknowledge license"** button
4. Read and accept the terms

### Step 4.2: Accept on Vertex AI Model Garden
1. Go to [Vertex AI Model Garden](https://console.cloud.google.com/vertex-ai/model-garden)
2. Search for **"MedGemma"**
3. Click on **"MedGemma 27B IT"**
4. Click **"Enable"** or **"Accept License"**
5. Read the Health AI Developer Foundations terms
6. Click **"Accept"**

---

## 5. Deploy MedGemma via Model Garden

### Step 5.1: Navigate to Model Garden
1. Go to [Vertex AI Model Garden](https://console.cloud.google.com/vertex-ai/publishers/google/model-garden/medgemma)
2. Or search "MedGemma" in the Model Garden search

### Step 5.2: Select Model Variant
Choose **MedGemma 27B IT (Multimodal)** for:
- Medical image analysis (X-ray, CT, MRI, pathology)
- Medical text understanding
- Best accuracy for radiology tasks

### Step 5.3: Deploy to Endpoint

1. Click **"Deploy"** button
2. Configure deployment:

```yaml
Deployment Settings:
  Endpoint name: medgemma-27b-prod
  Region: us-central1  # Recommended for availability
  
Machine Configuration:
  Machine type: a2-highgpu-1g  # 1x A100 40GB
  # Alternative: a2-ultragpu-1g for A100 80GB (better for batch)
  
  Accelerator: NVIDIA A100
  Accelerator count: 1
  
Scaling:
  Min replicas: 0  # Scale to zero when not in use (cost saving)
  Max replicas: 1  # Increase for production load
  
Advanced:
  Service account: [Create new or use default]
  Enable access logging: Yes (recommended)
```

3. Click **"Deploy"**
4. Wait 10-15 minutes for deployment

### Step 5.4: Verify Deployment
1. Go to [Vertex AI > Online Prediction > Endpoints](https://console.cloud.google.com/vertex-ai/online-prediction/endpoints)
2. Find your endpoint `medgemma-27b-prod`
3. Status should show **"Ready"** (green checkmark)
4. Note the **Endpoint ID** (you'll need this)

---

## 6. Create Service Account

### Step 6.1: Create Service Account
```bash
# Create service account
gcloud iam service-accounts create medgemma-inference \
  --display-name="MedGemma Inference Service Account" \
  --description="Service account for MedGemma API calls"
```

### Step 6.2: Grant Permissions
```bash
PROJECT_ID=$(gcloud config get-value project)

# Grant Vertex AI User role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:medgemma-inference@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Grant Storage Object Viewer (for model artifacts)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:medgemma-inference@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"
```

### Step 6.3: Create and Download Key
```bash
# Create key file
gcloud iam service-accounts keys create medgemma-key.json \
  --iam-account=medgemma-inference@${PROJECT_ID}.iam.gserviceaccount.com

# IMPORTANT: Keep this file secure! Don't commit to git!
echo "medgemma-key.json" >> .gitignore
```

### Step 6.4: Verify Key
```bash
cat medgemma-key.json | head -5
# Should show JSON with "type": "service_account"
```

---

## 7. Configure Environment Variables

### For Local Development
```bash
# Add to .env.local
echo "GOOGLE_CLOUD_PROJECT=${PROJECT_ID}" >> .env.local
echo "VERTEX_AI_LOCATION=us-central1" >> .env.local
echo "VERTEX_AI_ENDPOINT_ID=YOUR_ENDPOINT_ID" >> .env.local

# Option A: Use key file path
echo "GOOGLE_APPLICATION_CREDENTIALS=./medgemma-key.json" >> .env.local

# Option B: Use key content (for serverless)
KEY_CONTENT=$(cat medgemma-key.json | base64)
echo "GOOGLE_SERVICE_ACCOUNT_KEY=${KEY_CONTENT}" >> .env.local
```

### For Railway Deployment
1. Go to your Railway project
2. Navigate to **Variables**
3. Add these environment variables:

| Variable | Value |
|----------|-------|
| `GOOGLE_CLOUD_PROJECT` | `your-project-id` |
| `VERTEX_AI_LOCATION` | `us-central1` |
| `VERTEX_AI_ENDPOINT_ID` | `your-endpoint-id` |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | `{"type":"service_account",...}` (full JSON) |

### For Vercel Deployment
```bash
# Use Vercel CLI
vercel env add GOOGLE_CLOUD_PROJECT
vercel env add VERTEX_AI_LOCATION
vercel env add VERTEX_AI_ENDPOINT_ID
vercel env add GOOGLE_SERVICE_ACCOUNT_KEY
```

---

## 8. Test the Deployment

### Test via Console
1. Go to your endpoint in [Vertex AI Endpoints](https://console.cloud.google.com/vertex-ai/online-prediction/endpoints)
2. Click **"Test"** tab
3. Enter a test prompt:
```json
{
  "contents": [{
    "role": "user",
    "parts": [{"text": "What are the key findings to look for in a chest X-ray for lung cancer?"}]
  }]
}
```
4. Click **"Send"**
5. Verify you get a medical response

### Test via CLI
```bash
# Set up authentication
export GOOGLE_APPLICATION_CREDENTIALS="./medgemma-key.json"

# Test with curl
PROJECT_ID=$(gcloud config get-value project)
LOCATION="us-central1"
ENDPOINT_ID="your-endpoint-id"

curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  "https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/endpoints/${ENDPOINT_ID}:predict" \
  -d '{
    "instances": [{
      "content": "Describe the key features of adenocarcinoma on CT imaging."
    }]
  }'
```

### Test with Image (Multimodal)
```bash
# Convert image to base64
IMAGE_B64=$(base64 -i chest_xray.png)

curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  "https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/medgemma-27b-it:generateContent" \
  -d "{
    \"contents\": [{
      \"role\": \"user\",
      \"parts\": [
        {\"inline_data\": {\"mime_type\": \"image/png\", \"data\": \"${IMAGE_B64}\"}},
        {\"text\": \"Analyze this chest X-ray and describe any abnormalities.\"}
      ]
    }],
    \"generationConfig\": {
      \"temperature\": 0.3,
      \"maxOutputTokens\": 2048
    }
  }"
```

---

## 9. Integrate with Virtual Tumor Board

### Required Environment Variables
Add these to your deployment:

```bash
# .env.local or Railway/Vercel variables
GOOGLE_CLOUD_PROJECT=your-project-id
VERTEX_AI_LOCATION=us-central1
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Optional: HuggingFace token for fallback
HF_TOKEN=hf_xxxxx
```

### Verify Integration
```bash
# Start the app
pnpm dev

# Navigate to /demo
# Upload an image in "My Scans" tab
# Check console for: "[MedGemma] Attempting Vertex AI (Primary)..."
```

---

## 10. Cost Optimization

### Scale to Zero
Set `Min replicas: 0` to avoid charges when not in use:
- First request after idle: ~30-60 second cold start
- Subsequent requests: <5 seconds

### Use Preemptible/Spot VMs
For non-production workloads:
1. Edit endpoint configuration
2. Enable "Use Spot VMs"
3. Save ~60-70% on compute costs

### Monitor Usage
```bash
# View recent predictions
gcloud ai endpoints describe $ENDPOINT_ID \
  --region=$LOCATION \
  --format="value(deployedModels)"

# Check billing
gcloud billing accounts list
```

### Cost Estimates

| Usage | Machine | Cost/Hour | Monthly (8hr/day) |
|-------|---------|-----------|-------------------|
| Dev/Test | a2-highgpu-1g (A100 40GB) | ~$3.67 | ~$580 |
| Production | a2-ultragpu-1g (A100 80GB) | ~$5.50 | ~$880 |
| With Scale-to-Zero | a2-highgpu-1g | ~$1.50 | ~$240 |

---

## Troubleshooting

### Error: "Permission denied"
```bash
# Re-grant permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:medgemma-inference@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

### Error: "Model not found"
- Verify you accepted the MedGemma license on both HuggingFace and Model Garden
- Check the model name: `medgemma-27b-it` (not `medgemma-27b`)

### Error: "Quota exceeded"
```bash
# Request quota increase
gcloud compute regions describe us-central1 --format="value(quotas)"

# Or use a different region: us-east1, europe-west4
```

### Cold Start Too Slow
- Set `Min replicas: 1` (increases cost but eliminates cold start)
- Use endpoint with "Warm-up" configuration

---

## Quick Reference

### API Endpoint Format
```
https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/publishers/google/models/medgemma-27b-it:generateContent
```

### Environment Variables Summary
```bash
GOOGLE_CLOUD_PROJECT=your-project-id
VERTEX_AI_LOCATION=us-central1
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

### Useful Commands
```bash
# List endpoints
gcloud ai endpoints list --region=us-central1

# Get access token
gcloud auth print-access-token

# Describe endpoint
gcloud ai endpoints describe ENDPOINT_ID --region=us-central1

# Delete endpoint (to stop charges)
gcloud ai endpoints delete ENDPOINT_ID --region=us-central1
```

---

## Next Steps

1. **Fine-tune for your use case**: See [MedGemma fine-tuning guide](https://github.com/google-health/medgemma/blob/main/notebooks/fine_tune_with_hugging_face.ipynb)
2. **Add monitoring**: Set up Cloud Monitoring dashboards
3. **Implement caching**: Cache common queries to reduce costs
4. **Set up alerts**: Configure budget alerts in GCP Billing

---

## Support

- **MedGemma Issues**: https://github.com/google-health/medgemma/issues
- **Vertex AI Docs**: https://cloud.google.com/vertex-ai/docs
- **Model Garden**: https://cloud.google.com/vertex-ai/docs/model-garden/overview
