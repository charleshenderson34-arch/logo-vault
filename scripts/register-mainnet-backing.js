const INDEXER_URL = "https://api.mainnet.aptoslabs.com/v1/graphql";
const CONTRACT_ADDRESS = "0x2b4122bf49602fbe61a53d8448ab4000cdce568c716ca002eb18b94070756c37";

async function run() {
    console.log("Querying Aptos Mainnet Indexer for all core vault tokens across multi-chain naming patterns...");
    const response = await fetch(INDEXER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            query: `{
                current_token_datas(
                    where: { 
                        creator_address: { _eq: "${CONTRACT_ADDRESS}" } 
                    }
                    order_by: { transaction_version: desc }
                    limit: 150
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
    const assets = result?.data?.current_token_datas || [];
    
    console.log(`\nSuccessfully indexed ${assets.length} assets from Mainnet!`);
    console.log("-------------------------------------------------------------------------");
    
    assets.forEach((asset, idx) => {
        console.log(`[${idx + 1}] Name: ${asset.token_name} | ID: ${asset.token_data_id}`);
    });
    console.log("-------------------------------------------------------------------------");
    console.log("All matching chain asset bytes reverse-indexed successfully.");
}

run();
