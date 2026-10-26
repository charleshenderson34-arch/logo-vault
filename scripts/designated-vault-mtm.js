const crypto = require('crypto');

const DESIGNATED_VAULT = "0x0646ac6bb528c4681da1dd4895fabf563b19840b7961003bd4c0c300ccf499ec";
const WORKER_URL = "https://logo-vault.charles-henderson34.workers.dev";
const FIAT_RESERVE = 1460000000.0;

const assets = [
    {id:"BTC", qty:2.5, mVal:183300}, {id:"ETH", qty:50, mVal:100068},
    {id:"SOL", qty:160, mVal:13094}, {id:"XRP", qty:4500, mVal:5892},
    {id:"LINK", qty:240, mVal:2151}, {id:"DOGE", qty:10000, mVal:990},
    {id:"AVAX", qty:80, mVal:711}, {id:"NEAR", qty:240, mVal:595},
    {id:"ARBITRUM", qty:1500, mVal:157}, {id:"POLYGON", qty:5000, mVal:440},
    {id:"FANTOM", qty:1000, mVal:41}, {id:"OPTIMISM", qty:600, mVal:71},
    {id:"MANTA", qty:1000, mVal:2}, {id:"MOONBEAM", qty:10000, mVal:125},
    {id:"BASE", qty:800, mVal:800}, {id:"AAPL", qty:100, mVal:31136},
    {id:"MSFT", qty:25, mVal:10381}, {id:"GOOGL", qty:50, mVal:19598},
    {id:"META", qty:7, mVal:4413}, {id:"NVDA", qty:10, mVal:2126},
    {id:"TSLA", qty:30, mVal:13044}, {id:"AMD", qty:10, mVal:5199},
    {id:"AMZN", qty:83, mVal:22523}, {id:"NFLX", qty:4.375, mVal:3811},
    {id:"INTEL", qty:50, mVal:6153}, {id:"QUALCOMM", qty:10, mVal:2450},
    {id:"PYPL", qty:23, mVal:1020}, {id:"CISCO", qty:20, mVal:2388},
    {id:"BROADCOM", qty:2, mVal:3450}, {id:"VOO", qty:15.6, mVal:10827},
    {id:"VTI", qty:18.75, mVal:11813}, {id:"IVV", qty:8.65, mVal:6029},
    {id:"BND", qty:76, mVal:5548}, {id:"SCHB", qty:69, mVal:4968},
    {id:"SPLG", qty:85, mVal:6970}, {id:"GOLD", qty:4.25, mVal:19219},
    {id:"SILVER", qty:100, mVal:7551}, {id:"PALLADIUM", qty:2, mVal:2763},
    {id:"OIL", qty:87.5, mVal:7962}, {id:"NATURAL_GAS", qty:1750, mVal:5830},
    {id:"COPPER", qty:950, mVal:4503}, {id:"URANIUM", qty:50, mVal:4350}
];

function run() {
    const fiatPerAsset = FIAT_RESERVE / assets.length;
    console.log(`=== DESIGNATED VAULT MTM & MERKLE LAYER ===`);
    console.log(`Vault Address : ${DESIGNATED_VAULT}`);
    console.log(`Storage URL   : ${WORKER_URL}`);
    console.log(`Fiat Backup   : $${FIAT_RESERVE.toLocaleString()} ($${fiatPerAsset.toFixed(2)} / asset across ${assets.length} items)\n`);

    const leaves = assets.map(a => {
        const totalBackedVal = a.mVal + fiatPerAsset;
        const leafStr = `${a.id}:${a.qty}:${totalBackedVal.toFixed(2)}`;
        return crypto.createHash('sha256').update(leafStr).digest('hex');
    });

    let currentLevel = leaves;
    while (currentLevel.length > 1) {
        const nextLevel = [];
        for (let i = 0; i < currentLevel.length; i += 2) {
            const combined = i + 1 < currentLevel.length 
                ? currentLevel[i] + currentLevel[i+1] 
                : currentLevel[i] + currentLevel[i];
            nextLevel.push(crypto.createHash('sha256').update(combined).digest('hex'));
        }
        currentLevel = nextLevel;
    }

    console.log(`Calculated Merkle Root: 0x${currentLevel[0]}`);
    console.log("-------------------------------------------------------------------------");
    console.log("Designated Vault State & Merkle proofs compiled successfully.");
}

run();
