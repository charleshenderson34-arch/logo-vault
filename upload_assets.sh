#!/usr/bin/env bash
set -euo pipefail

# Define your verified target credentials
BUCKET_NAME="agave-clean"

echo "Checking wrangler remote authentication..."
npx wrangler login

# Extract and clean up asset paths from raw data, processing them cleanly
echo "$RAW_DATA" | grep -oE '(chains|logo)/[a-zA-Z0-9_\-\.]+\.(svg|png|webp)' | sort -u | while read -r asset_path; do
    source_url="https://sentio.xyz"
    local_file="temp_$(basename "$asset_path")"
    
    echo "Processing upstream fetch: $asset_path"
    curl -sL "$source_url" -o "$local_file"
    
    # Dynamically match content types to preserve formatting on-chain
    case "${asset_path##*.}" in
        svg) MIME_TYPE="image/svg+xml" ;;
        png) MIME_TYPE="image/png" ;;
        webp) MIME_TYPE="image/webp" ;;
        *) MIME_TYPE="application/octet-stream" ;;
    esac

    # Explicitly upload straight to remote cloud instances with content keys preserved
    echo "Deploying to Cloudflare R2: downloaded_assets/$asset_path"
    npx wrangler r2 object put "${BUCKET_NAME}/downloaded_assets/${asset_path}" \
        --file="$local_file" \
        --content-type="$MIME_TYPE" \
        --remote

    # Clean up local memory footprint
    rm -f "$local_file"
done

echo "All assets successfully synchronized and uploaded to remote Cloudflare R2 bucket: $BUCKET_NAME"
