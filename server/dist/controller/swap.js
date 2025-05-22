import DLMM from "@meteora-ag/dlmm";
import { PublicKey, sendAndConfirmTransaction, Connection, clusterApiUrl, Keypair, } from "@solana/web3.js";
import { BN } from "bn.js";
import dotenv from "dotenv";
import bs58 from "bs58";
dotenv.config();
export async function swap(poolId = "3SFQjmDsi5NsjJeZfz7fgJ6VddX3TcuZkv2eUibWJN8N", tokenX = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", tokenY = "So11111111111111111111111111111111111111112", amount = 5) {
    const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
    const poolKey = new PublicKey(poolId);
    const dlmm = DLMM.default;
    const dlmmPool = await dlmm.create(connection, poolKey);
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    const secretKey = Uint8Array.from(bs58.decode(PRIVATE_KEY));
    const user = Keypair.fromSecretKey(secretKey);
    const swapAmount = new BN(amount);
    const slippage = new BN(200);
    const swapYtoX = true;
    const binArrays = await dlmmPool.getBinArrayForSwap(swapYtoX);
    const swapQuote = await dlmmPool.swapQuote(swapAmount, swapYtoX, slippage, binArrays);
    const swapTx = await dlmmPool.swap({
        inToken: new PublicKey(tokenX),
        binArraysPubkey: swapQuote.binArraysPubkey,
        inAmount: swapAmount,
        lbPair: dlmmPool.pubkey,
        user: user.publicKey,
        minOutAmount: swapQuote.minOutAmount,
        outToken: new PublicKey(tokenY),
    });
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized");
    swapTx.recentBlockhash = blockhash;
    swapTx.lastValidBlockHeight = lastValidBlockHeight;
    try {
        const swapTxHash = await sendAndConfirmTransaction(connection, swapTx, [
            user,
        ]);
        console.log("Swap Transaction Hash:", swapTxHash);
        return null;
    }
    catch (error) {
        console.log("Error");
        return null;
    }
}
//# sourceMappingURL=swap.js.map