#!/usr/bin/env bash
set -euo pipefail

BUCKET_NAME="agave-clean"

echo "Checking wrangler authentication..."
npx wrangler login

echo "Starting automated asset deployment to Cloudflare R2 bucket: ${BUCKET_NAME}..."

find downloaded_assets -type f | while read -r filepath; do
    if [[ "$filepath" == *".DS_Store"* || "$filepath" == *"__MACOSX"* || "$(basename "$filepath")" == ._* ]]; then
        continue
    fi

    case "${filepath##*.}" in
        svg) MIME_TYPE="image/svg+xml" ;;
        png) MIME_TYPE="image/png" ;;
        webp) MIME_TYPE="image/webp" ;;
        jsonl|json) MIME_TYPE="application/json" ;;
        gz|tar) MIME_TYPE="application/gzip" ;;
        *) MIME_TYPE="application/octet-stream" ;;
    esac

    R2_KEY="$filepath"
    echo "Uploading [${MIME_TYPE}]: ${filepath} -> R2://${BUCKET_NAME}/${R2_KEY}"

    npx wrangler r2 object put --remote --remote "${BUCKET_NAME}/${R2_KEY}" \
        --file="$filepath" \
        --content-type="$MIME_TYPE"
done

echo "All chain and logo assets have been deployed successfully to Cloudflare R2!"
