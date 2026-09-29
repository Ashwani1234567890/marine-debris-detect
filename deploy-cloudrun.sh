#!/bin/bash
# ==============================================================================
# JAL LOCHAN - Google Cloud Run Backend Deployment Script
# ==============================================================================

set -e

PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "emergent-woodland-hsmzh")
SERVICE_NAME="jal-lochan-backend"
REGION="asia-southeast1"

echo "======================================================================"
echo "Deploying JAL LOCHAN Backend to Google Cloud Run"
echo "Project ID: ${PROJECT_ID}"
echo "Service:    ${SERVICE_NAME}"
echo "Region:     ${REGION}"
echo "======================================================================"

# Build and deploy directly to Cloud Run from source
gcloud run deploy "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --source="." \
  --platform="managed" \
  --allow-unauthenticated \
  --port=8080 \
  --cpu=1 \
  --memory=512Mi \
  --min-instances=0 \
  --max-instances=10 \
  --set-env-vars="NODE_ENV=production,PORT=8080"

echo ""
echo "======================================================================"
echo "Deployment successful! Service URL:"
gcloud run services describe "${SERVICE_NAME}" --platform=managed --region="${REGION}" --format='value(status.url)'
echo "======================================================================"
