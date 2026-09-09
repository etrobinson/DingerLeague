#!/usr/bin/env bash
set -euo pipefail

BUCKET_NAME="${BUCKET_NAME:-dinger-league-app-prod-etrobinson}"
DISTRIBUTION_ID="${DISTRIBUTION_ID:-E1RV02VMDQUOL4}"
AWS_CLI="${AWS_CLI:-aws}"

if ! command -v "$AWS_CLI" >/dev/null 2>&1; then
  if [ -x "$HOME/.local/bin/aws" ]; then
    AWS_CLI="$HOME/.local/bin/aws"
  else
    echo "Unable to find AWS CLI. Install it or set AWS_CLI=/path/to/aws."
    exit 1
  fi
fi

echo "Building production assets..."
npm run build

echo "Uploading dist/ to s3://$BUCKET_NAME..."
"$AWS_CLI" s3 sync dist/ "s3://$BUCKET_NAME" --delete

echo "Invalidating CloudFront distribution $DISTRIBUTION_ID..."
"$AWS_CLI" cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*"

echo "Deploy requested successfully."
