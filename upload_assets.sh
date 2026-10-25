
echo "$RAW_DATA" | grep -oE '(chains|logo)/[a-zA-Z0-9_\-\.]+\.(svg|png|webp)' | sort -u | while read -r asset_path; do
    source_url="https://assets.sentio.xyz/$asset_path"
    target_object="s3://$BUCKET_NAME/$DEST_PREFIX/$asset_path"
    
    echo "Processing: $asset_path"
    curl -sL "$source_url" | aws s3 cp - "$target_object"
done

echo "All assets successfully uploaded to s3://$BUCKET_NAME/$DEST_PREFIX/!"

echo "$RAW_DATA" | grep -oE '(chains|logo)/[a-zA-Z0-9_\-\.]+\.(svg|png|webp)' | sort -u | while read -r asset_path; do
    source_url="https://assets.sentio.xyz/$asset_path"
    
    echo "Processing: $asset_path"
    curl -sL "$source_url" | aws s3 cp - "$target_object"
done

echo "All assets successfully uploaded to s3://$BUCKET_NAME/$DEST_PREFIX/!"
