import json
import os

# =======================================================
# CONFIGURATION
# =======================================================
# Replace with your Cloudflare R2 Public Custom Domain or r2.dev address
R2_PUBLIC_DOMAIN = "https://9dcc6dd59d55b7066026b0962f822e4f.r2.cloudflarestorage.com/agave-clean"
INPUT_FILE = "mainnet_payloads.json"
OUTPUT_FILE = "mainnet_payloads_r2.json"
LOCAL_ASSETS_DIR = os.path.join("downloaded_assets", "chains")

def get_asset_extension(symbol):
    """
    Looks inside downloaded_assets/chains to match the symbol name with 
    its actual extension (.svg, .png, or .webp). Default to .svg if missing.
    """
    if not os.path.exists(LOCAL_ASSETS_DIR):
        return "svg"
        
    symbol_lower = symbol.lower()
    for filename in os.listdir(LOCAL_ASSETS_DIR):
        base, ext = os.path.splitext(filename)
        if base.lower() == symbol_lower:
            return ext.lstrip('.')
            
    return "svg"

def main():
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found in current directory.")
        return

    with open(INPUT_FILE, 'r') as f:
        payloads = json.load(f)

    updated_count = 0

    for tx in payloads:
        # Verify it's an entry function payload matching your contract
        if tx.get("type") == "entry_function_payload" and "arguments" in tx:
            args = tx["arguments"]
            if len(args) >= 4:
                symbol = args[0] # e.g., "BTC", "ETH", "POLYGON"
                ext = get_asset_extension(symbol)
                
                # Construct the clean R2 public endpoint path
                r2_url = f"{R2_PUBLIC_DOMAIN}/downloaded_assets/chains/{symbol.lower()}.{ext}"
                
                print(f"Mapping {symbol} -> {r2_url}")
                tx["arguments"][3] = r2_url
                updated_count += 1

    with open(OUTPUT_FILE, 'w') as f:
        json.dump(payloads, f, indent=2)

    print(f"\nSuccess! Generated {OUTPUT_FILE} with {updated_count} optimized R2 URLs.")

if __name__ == "__main__":
    main()
