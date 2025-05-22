import RaydiumSwap from './RaydiumSwap.js';
import 'dotenv/config';
import { swapConfig } from './swapConfig.js';
const RPC_URL = process.env.RPC_URL;
const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
const swap = async () => {
    const raydiumSwap = new RaydiumSwap(RPC_URL, WALLET_PRIVATE_KEY);
    console.log(`Raydium swap initialized`);
    console.log(`Swapping ${swapConfig.tokenAAmount} of ${swapConfig.tokenAAddress} for ${swapConfig.tokenBAddress}...`);
    await raydiumSwap.loadPoolKeys(swapConfig.liquidityFile);
    console.log(`Loaded pool keys`);
    const poolInfo = raydiumSwap.findPoolInfoForTokens(swapConfig.tokenAAddress, swapConfig.tokenBAddress);
    if (!poolInfo) {
        console.error('Pool info not found');
        return 'Pool info not found';
    }
    else {
        console.log('Found pool info');
    }
    const tx = await raydiumSwap.getSwapTransaction(swapConfig.tokenBAddress, swapConfig.tokenAAmount, poolInfo, swapConfig.maxLamports, swapConfig.useVersionedTransaction, swapConfig.direction);
    if (swapConfig.executeSwap) {
        const txid = swapConfig.useVersionedTransaction
            ? await raydiumSwap.sendVersionedTransaction(tx, swapConfig.maxRetries)
            : await raydiumSwap.sendLegacyTransaction(tx, swapConfig.maxRetries);
        console.log(`https://solscan.io/tx/${txid}`);
    }
    else {
        const simRes = swapConfig.useVersionedTransaction
            ? await raydiumSwap.simulateVersionedTransaction(tx)
            : await raydiumSwap.simulateLegacyTransaction(tx);
        console.log(simRes);
    }
};
swap();
//# sourceMappingURL=index.js.map