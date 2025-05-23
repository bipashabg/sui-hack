import bs58 from "bs58";
import { Connection, Keypair, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { NATIVE_MINT, getAssociatedTokenAddress } from '@solana/spl-token';
import axios from 'axios';
import { API_URLS } from '@raydium-io/raydium-sdk-v2';
const isV0Tx = true;
const connection = new Connection('https://solana-mainnet.g.alchemy.com/v2/rXoYtmWuCPzwBNl-sdq02');
const owner = Keypair.fromSecretKey(bs58.decode('5HbgHgPxxXwEoL5sJnpyMrvKqpM4PjtNEiB4e6hEo7jvhLyhQo7NXesHy5XtqaroS45a5AB4doAmsqxnvrwnn2P8'));
const slippage = 5;
export async function swap(tokenAddress, amount) {
    const { data } = await axios.get(`${API_URLS.BASE_HOST}${API_URLS.PRIORITY_FEE}`);
    const { data: swapResponse } = await axios.get(`${API_URLS.SWAP_HOST}/compute/swap-base-in?inputMint=${NATIVE_MINT}&outputMint=${tokenAddress}&amount=${amount}&slippageBps=${slippage * 100}&txVersion=V0`);
    const { data: swapTransactions } = await axios.post(`${API_URLS.SWAP_HOST}/transaction/swap-base-in`, {
        computeUnitPriceMicroLamports: String(data.data.default.h),
        swapResponse,
        txVersion: 'V0',
        wallet: owner.publicKey.toBase58(),
        wrapSol: true,
        unwrapSol: false,
    });
    const ata = await getAssociatedTokenAddress(new PublicKey(tokenAddress), owner.publicKey);
    console.log({
        computeUnitPriceMicroLamports: String(data.data.default.h),
        swapResponse,
        txVersion: 'V0',
        wallet: owner.publicKey.toBase58(),
        wrapSol: true,
        unwrapSol: false,
    });
    console.log(swapTransactions);
    const allTxBuf = swapTransactions.data.map((tx) => Buffer.from(tx.transaction, 'base64'));
    const allTransactions = allTxBuf.map((txBuf) => isV0Tx ? VersionedTransaction.deserialize(txBuf) : Transaction.from(txBuf));
    let idx = 0;
    for (const tx of allTransactions) {
        idx++;
        const transaction = tx;
        transaction.sign([owner]);
        const txId = await connection.sendTransaction(tx, { skipPreflight: true });
        console.log("after sending txn");
        const { lastValidBlockHeight, blockhash } = await connection.getLatestBlockhash({
            commitment: 'finalized',
        });
        console.log(`${idx} transaction sending..., txId: ${txId}`);
        await connection.confirmTransaction({
            blockhash,
            lastValidBlockHeight,
            signature: txId,
        }, 'confirmed');
        console.log(`${idx} transaction confirmed`);
    }
}
//# sourceMappingURL=swap.js.map