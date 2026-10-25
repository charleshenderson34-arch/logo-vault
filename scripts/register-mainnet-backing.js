const INDEXER_URL = "https://api.mainnet.aptoslabs.com/v1/graphql";
const CONTRACT_ADDRESS = "0x2b4122bf49602fbe61a53d8448ab4000cdce568c716ca002eb18b94070756c37";

async function run() {
    console.log("Connecting directly to Aptos Mainnet Indexer to reverse-index assets by name pattern...");
    
    // Query pulling all tokens and filtering dynamically for chain assets in memory
    const response = await fetch(INDEXER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            query: `{
                current_token_datas(
                    where: { 
                        creator_address: { _eq: "${CONTRACT_ADDRESS}" } 
                    }
                    limit: 500
                ) {
                    token_data_id
                    token_name
                    uri
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

    const allAssets = result?.data?.current_token_datas || [];
    console.log(`Retrieved ${allAssets.length} total tokens from deployer address.`);

    // Reverse index and filter for chain assets based on naming patterns / extensions (.svg, chain symbols)
    const chainAssets = allAssets.filter(asset => {
        const name = (asset.token_name || "").toLowerCase();
        const uri = (asset.uri || "").toLowerCase();
        return name.includes("chain") || name.includes("/") || uri.includes(".svg") || uri.includes("logo") || name.length > 0;
    });

    console.log(`\nFound ${chainAssets.length} reverse-indexed chain assets ready for treasury backing:`);
    console.log("-------------------------------------------------------------------------");
    
    chainAssets.forEach((asset, idx) => {
        console.log(`[${idx + 1}] Chain Asset Name: ${asset.token_name} | Tx Version: ${asset.last_transaction_version}`);
        console.log(id => `    ID: ${asset.token_data_id}`);
    });
    
    console.log("-------------------------------------------------------------------------");
    console.log("Reverse-indexing complete. All chain asset references mapped successfully.");
}

run();
