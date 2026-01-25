#!/bin/bash
# Upload DICOM files to Cloudflare R2
#
# Prerequisites:
# 1. Install AWS CLI: brew install awscli
# 2. Configure R2 credentials:
#    aws configure --profile r2
#    - Access Key ID: (from R2 API tokens)
#    - Secret Access Key: (from R2 API tokens)
#    - Region: auto
#    - Output: json
#
# Usage: ./upload_to_r2.sh

set -e

# R2 Configuration
R2_ENDPOINT="https://aab6220946301d24e9e3932ac9869efc.r2.cloudflarestorage.com"
R2_BUCKET="vtb-dicom"
DICOM_DIR="../apps/web/public/dicom"

echo "=== Uploading DICOM files to Cloudflare R2 ==="
echo "Endpoint: $R2_ENDPOINT"
echo "Bucket: $R2_BUCKET"
echo "Source: $DICOM_DIR"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "ERROR: AWS CLI not installed. Run: brew install awscli"
    exit 1
fi

# Check if r2 profile exists
if ! aws configure list --profile r2 &> /dev/null; then
    echo "ERROR: R2 profile not configured."
    echo "Run: aws configure --profile r2"
    echo "Use your R2 API token credentials"
    exit 1
fi

# Upload each folder
for folder in "$DICOM_DIR"/*/; do
    folder_name=$(basename "$folder")
    echo "Uploading $folder_name..."
    
    aws s3 sync "$folder" "s3://$R2_BUCKET/$folder_name/" \
        --endpoint-url "$R2_ENDPOINT" \
        --profile r2 \
        --content-type "application/dicom" \
        --no-progress
    
    echo "  ✓ $folder_name uploaded"
done

echo ""
echo "=== Upload Complete ==="
echo ""
echo "Next steps:"
echo "1. Enable public access in Cloudflare R2 dashboard"
echo "2. Get the public URL (https://pub-xxx.r2.dev)"
echo "3. Update NEXT_PUBLIC_R2_CDN_URL in .env or dicom-loader.ts"
