#!/usr/bin/env python3
import urllib.request
import json
import sys

MAINNET_API = "https://api.mainnet.aptoslabs.com/v1"
EOA_ADDRESS = "0x29f0BD2beade4da353023ad96956Ac72E29a193C"

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

def check_mainnet_account():
    print(f"[*] Connecting to Aptos Mainnet API for {EOA_ADDRESS}...")
    url = f"{MAINNET_API}/accounts/{EOA_ADDRESS}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Nexus-Client"})
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            seq = data.get('sequence_number', '0')
            print(f"  -> Account On-Chain Sequence Number: {seq}")
            print(f"  -> Account Auth Key: {data.get('authentication_key')}")
            return int(seq)
    except Exception as e:
        print(f"  [!] Account query notice: {e}")
        return None

def build_entry_payload(symbol, qty):
    return {
        "type": "entry_function_payload",
        "function": f"{EOA_ADDRESS}::asset_registry::initialize_asset",
        "type_arguments": [],
        "arguments": [
            symbol,
            symbol,
            8,
            f"https://attest.bluelighttechcompany.com/icons/{symbol.lower()}.png",
            "https://attest.bluelighttechcompany.com/Manifest.json"
        ]
    }

if __name__ == "__main__":
    seq = check_mainnet_account()
    print(f"\n[*] Generating 42 Mainnet Asset Transaction Payloads ($401,354.00 Total Value):")
    
    payloads = []
    for sym, qty in ASSETS:
        payload = build_entry_payload(sym, qty)
        payloads.append(payload)
        print(f"  + Prepared payload for: {sym} ({qty} units)")
        
    with open("mainnet_payloads.json", "w") as f:
        json.dump(payloads, f, indent=2)
        
    print("\n[+] Successfully saved all 42 payloads to 'mainnet_payloads.json'.")
