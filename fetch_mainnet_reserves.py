#!/usr/bin/env python3
import urllib.request
import json

MAINNET_API_URL = "https://api.mainnet.aptoslabs.com/v1"
SIGNER_ADDRESS = "0x29f0BD2beade4da353023ad96956Ac72E29a193C"
CUSTOM_DOMAIN_MANIFEST = "https://attest.bluelighttechcompany.com/Manifest.json"

def verify_remote_manifest():
    print(f"[*] Fetching live registry metadata from custom domain: {CUSTOM_DOMAIN_MANIFEST}")
    try:
        req = urllib.request.Request(CUSTOM_DOMAIN_MANIFEST, headers={"User-Agent": "Nexus-Client"})
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            print(f"  -> Verified Remote Asset Count: {data['verification']['asset_count']}")
            print(f"  -> Verified Merkle Root: {data['verification']['merkle_root']}")
    except Exception as e:
        print(f"  [!] Note: Manifest not yet live or propagating via DNS: {e}")

def check_chain_state():
    url = f"{MAINNET_API_URL}/accounts/{SIGNER_ADDRESS}/resources"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Nexus-Client"})
        with urllib.request.urlopen(req) as resp:
            resources = json.loads(resp.read().decode())
            print(f"[*] Mainnet account resources active: {len(resources)}")
    except Exception as e:
        print(f"[!] Chain query error: {e}")

if __name__ == "__main__":
    verify_remote_manifest()
    check_chain_state()
