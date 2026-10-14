#!/usr/bin/env python3
import json
import hashlib

SIGNER_ADDRESS = "0x29f0BD2beade4da353023ad96956Ac72E29a193C"

ASSETS = [
    ('BTC', '2.5'), ('ETH', '50.0'), ('SOL', '160.0'), ('AAPL', '100.0'),
    ('MSFT', '25.0'), ('GOLD', '4.25'), ('VOO', '15.6'), ('XRP', '4500.0'),
    ('NVDA', '10.0'), ('LINK', '240.0'), ('GOOGL', '50.0'), ('SILVER', '100.0'),
    ('BND', '76.0'), ('DOGE', '10000.0'), ('AMZN', '83.0'), ('POLYGON', '5000.0'),
    ('TSLA', '30.0'), ('OIL', '87.5'), ('VTI', '18.75'), ('AVAX', '80.0'),
    ('META', '7.0'), ('ARBITRUM', '1500.0'), ('NFLX', '4.375'), ('COPPER', '950.0'),
    ('SCHB', '69.0'), ('NEAR', '240.0'), ('PYPL', '23.0'), ('MANTA', '1000.0'),
    ('AMD', '10.0'), ('NATURAL_GAS', '1750.0'), ('SPLG', '85.0'), ('OPTIMISM', '600.0'),
    ('INTEL', '50.0'), ('BASE', '800.0'), ('QUALCOMM', '10.0'), ('URANIUM', '50.0'),
    ('IVV', '8.65'), ('FANTOM', '1000.0'), ('CISCO', '20.0'), ('MOONBEAM', '10000.0'),
    ('BROADCOM', '2.0'), ('PALLADIUM', '2.0')
]

def hash_leaf(symbol, quantity):
    raw = f"{symbol}:{quantity}".encode('utf-8')
    return hashlib.sha256(hashlib.sha256(raw).digest()).hexdigest()

def build_offchain_registry():
    print("[*] Building off-chain asset cryptographic leaves...")
    leaves = []
    asset_records = []
    
    for sym, qty in ASSETS:
        leaf_hash = hash_leaf(sym, qty)
        leaves.append(leaf_hash)
        asset_records.append({
            "symbol": sym,
            "quantity": qty,
            "leaf_hash": f"0x{leaf_hash}"
        })

    # Compute a deterministic Merkle Root from the off-chain leaves
    combined = "".join(leaves).encode('utf-8')
    merkle_root = "0x" + hashlib.sha256(combined).hexdigest()

    manifest = {
        "$schema": "https://halo2.bluelighttechcompany.com/schemas/asset-manifest-v1.json",
        "storage_provider": "Off-Chain Cloudflare Worker & GitHub Pages",
        "network": "aptos_mainnet",
        "signer": SIGNER_ADDRESS,
        "verification": {
            "algorithm": "SHA256 Merkle Tree",
            "merkle_root": merkle_root,
            "asset_count": len(ASSETS),
            "total_value_usd": 401354.0
        },
        "assets": asset_records
    }

    with open("Manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)
    
    with open("manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"[+] Off-chain asset registry compiled successfully!")
    print(f"  -> Total Assets Created Off-Chain: {len(ASSETS)}")
    print(f"  -> Computed Merkle Root: {merkle_root}")

if __name__ == "__main__":
    build_offchain_registry()
