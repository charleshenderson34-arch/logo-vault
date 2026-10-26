import * as fs from 'fs';
import * as path from 'path';
import { AptosClient, AptosAccount, FaucetClient, Types } from 'aptos';

// ==========================================
// CONFIGURATION
// ==========================================
// Replace these with your live project values
const R2_PUBLIC_DOMAIN = "https://bluelighttechcompany.com"; 
const CONTRACT_ADDRESS = "0x2b4122bf49602fbe61a53d8448ab4000cdce568c716ca002eb18b94070756c37";
const MODULE_NAME = "logo_vault";
const FUNCTION_NAME = "mint_and_register_asset"; // Update if your Move entry function matches another identifier

const NODE_URL = process.env.APTOS_NODE_URL || "https://api.mainnet.aptoslabs.com";
const PACE_MS = parseInt(process.env.PACE_MS || "1500", 10);

// Load deployment account credentials (assumed setup from your active pipeline)
// e.g., process.env.APTOS_PRIVATE_KEY or reading from your local .aptos/config.yaml
const PRIVATE_KEY_HEX = process.env.APTOS_PRIVATE_KEY || "0x..."; 

// ==========================================
// MAIN IMPLEMENTATION
// ==========================================
async function main() {
    console.log("Initializing Aptos Client...");
    const client = new AptosClient(NODE_URL);
    
    const privateKeyBytes = HexString.ensure(PRIVATE_KEY_HEX).toUint8Array();
    const account = new AptosAccount(privateKeyBytes);
    console.log(`Using execution account: ${account.address().hex()}`);

    const chainsDir = path.join(__dirname, 'downloaded_assets', 'chains');
    if (!fs.existsSync(chainsDir)) {
        console.error(`Error: Directory not found at ${chainsDir}`);
        process.exit(1);
    }

    // Read and filter all valid chain assets from your directory manifest
    const files = fs.readdirSync(chainsDir).filter(file => {
        const ext = path.extname(file).toLowerCase();
        const base = path.basename(file);
        return (ext === '.svg' || ext === '.png' || ext === '.webp') && !base.startsWith('._');
    });

    console.log(`Found ${files.length} valid assets to process in storage vault pipeline.`);

    for (let i = 0; i < files.length; i++) {
        const filename = files[i];
        const assetKey = path.parse(filename).name; // e.g., "bitcoin", "ethereum", "movement"
        
        // Construct formatting clean-names
        const assetName = assetKey.split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ') + " Asset";

        // Map directly to your public Cloudflare R2 edge route structure
        const r2Uri = `${R2_PUBLIC_DOMAIN}/downloaded_assets/chains/${filename}`;
        const description = `On-chain verified token asset tracking record for the ${assetKey} ecosystem.`;

        console.log(`[${i + 1}/${files.length}] Preparing registration payload for: ${assetKey}`);
        console.log(` -> URI: ${r2Uri}`);

        // Construct the Move entry function payload format
        const payload: Types.TransactionPayload = {
            type: "entry_function_payload",
            function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::${FUNCTION_NAME}`,
            type_arguments: [],
            arguments: [
                assetKey,     // Unique string identifier key
                assetName,    // Asset clean token name
                description,  // Metadata description string
                r2Uri         // Publicly readable R2 HTTPS pointer link
            ]
        };

        try {
            // Generate, sign, and submit the single transaction instance
            const txnRequest = await client.generateTransaction(account.address(), payload);
            const signedTxn = await client.signTransaction(account, txnRequest);
            const transactionRes = await client.submitTransaction(signedTxn);
            
            console.log(` -> Transaction Submitted. Hash: ${transactionRes.hash}`);
            
            // Wait for confirmation to guarantee registry storage persistence
            await client.waitForTransaction(transactionRes.hash);
            console.log(` -> Confirmed! Saved successfully.`);
        } catch (error) {
            console.error(` -> Failed executing upload transaction block for ${assetKey}:`, error);
        }

        // Apply strict script pacing parameter to safeguard sequencing consistency
        if (i < files.length - 1) {
            console.log(`Waiting ${PACE_MS}ms for sequence synchronization...`);
            await new Promise(resolve => setTimeout(resolve, PACE_MS));
        }
    }

    console.log("All asset records have been successfully mapped to the on-chain registry!");
}

// Utility wrapper helper for Hex conversions
class HexString {
    static ensure(hexString: string): HexString {
        return new HexString(hexString);
    }
    constructor(private hex: string) {
        if (this.hex.startsWith("0x")) {
            this.hex = this.hex.slice(2);
        }
    }
    toUint8Array(): Uint8Array {
        return Uint8Array.from(Buffer.from(this.hex, 'hex'));
    }
}

main().catch(console.error);
