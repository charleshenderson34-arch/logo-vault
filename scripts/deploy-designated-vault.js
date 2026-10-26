const { Account, Aptos, AptosConfig, Network } = require("aptos");

const NEW_VAULT_ADDRESS = "0xc3c57104b5f8b6ccb06168b2ac5efa3591beaafb79d80b0cf16d426a21c5fd10";
const WORKER_URL = "https://logo-vault.charles-henderson34.workers.dev";

async function run() {
    console.log("Initializing separate designated object vault deployment...");
    console.log(`Target Vault Address: ${NEW_VAULT_ADDRESS}`);
    console.log(`Linked Cloudflare R2 Storage: ${WORKER_URL}`);

    const config = new AptosConfig({ network: Network.MAINNET });
    const aptos = new Aptos(config);

    console.log("Verifying network connection to Aptos Mainnet...");
    const ledgerInfo = await aptos.getLedgerInfo();
    console.log(`Connected to Chain ID: ${ledgerInfo.chain_id}`);

    console.log("\nReady to bind designated object vault and r2 storage mapping.");
}

run().catch(console.error);
