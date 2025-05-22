import fs from 'fs';
import { swapConfig } from './swapConfig.js';
function trimMainnetJson() {
    const mainnetData = JSON.parse(fs.readFileSync('../mainnet.json', 'utf-8'));
    const { tokenAAddress, tokenBAddress } = swapConfig;
    const relevantPool = [...mainnetData.official, ...(mainnetData.unOfficial || [])].find((pool) => (pool.baseMint === tokenAAddress && pool.quoteMint === tokenBAddress) ||
        (pool.baseMint === tokenBAddress && pool.quoteMint === tokenAAddress));
    if (!relevantPool) {
        console.error('No matching pool found for the given token pair');
        return;
    }
    const trimmedData = {
        official: [relevantPool]
    };
    fs.writeFileSync('trimmed_mainnet.json', JSON.stringify(trimmedData, null, 2));
    console.log('Trimmed mainnet.json file has been created as trimmed_mainnet.json');
}
trimMainnetJson();
//# sourceMappingURL=trimMainnet.js.map