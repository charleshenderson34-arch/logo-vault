const NODE_URL = "https://fullnode.mainnet.aptoslabs.com/v1";
const INDEXER_URL = "https://api.mainnet.aptoslabs.com/v1/graphql";
const CONTRACT_ADDRESS = "0x2b4122bf49602fbe61a53d8448ab4000cdce568c716ca002eb18b94070756c37";

async function run() {
    console.log("Querying Aptos Mainnet Indexer for core vault tokens...");
    const response = await fetch(INDEXER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            query: `{ current_token_datas(where: { creator_address: { _eq: "${CONTRACT_ADDRESS}" } } limit: 111) { token_data_id token_name } }`
        })
    });
    const data = await response.json();
    console.log("Mainnet assets indexed successfully:", data?.data?.current_token_datas?.length || 0);
}
run();
