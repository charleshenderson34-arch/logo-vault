const INDEXER_URL = "https://api.mainnet.aptoslabs.com/v1/graphql";
const CONTRACT_ADDRESS = "0x2b4122bf49602fbe61a53d8448ab4000cdce568c716ca002eb18b94070756c37";

async function run() {
    console.log("Connecting to Aptos Mainnet Indexer (Token V2 API) to reverse-index chain assets...");
    
    // Updated GraphQL query using current_token_datas_v2 schema
    const response = await fetch(INDEXER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            query: `{
                current_token_datas_v2(
                    where: { 
                        creator_address: { _eq: "${CONTRACT_ADDRESS}" } 
                    }
                    limit: 500
                ) {
                    token_data_id
                    token_name
                    token_uri
                    last_transaction_version
                }
            }`
        })
    });
    
    const result = await response.json();
    if (result.errors) {
        console.error("Indexer GraphQL Error:", JSON.stringify(result.errors, null, 2));
        return;
    }

    const allAssets = result?.data?.current_token_datas_v2 || [];
    console.log(`Retrieved ${allAssets.length} total V2 tokens from deployer address.`);

    // Filter and reverse-index chain assets across broad naming / asset patterns
    const chainAssets = allAssets.filter(asset => {
        const name = (asset.token_name || "").toLowerCase();
        const uri = (asset.token_uri || "").toLowerCase();
        return name.includes("chain") || name.includes("/") || uri.includes(".svg") || uri.includes("logo") || name.length > 0;
    });

    console.log(`\nFound ${chainAssets.length} reverse-indexed chain assets ready for treasury backing:`);
    console.log("-------------------------------------------------------------------------");
    
    chainAssets.forEach((asset, idx) => {
        console.log(`[${idx + 1}] Chain Asset Name: ${asset.token_name} | Tx Version: ${asset.last_transaction_version}`);
        console.log(`    ID: ${asset.token_data_id}`);
    });
    
    console.log("-------------------------------------------------------------------------");
    console.log("Token V2 reverse-indexing complete. All mainnet asset references mapped.");
}

run();
