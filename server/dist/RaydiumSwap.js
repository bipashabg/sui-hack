import { Connection, PublicKey, Keypair, Transaction, VersionedTransaction, TransactionMessage } from '@solana/web3.js';
import { Liquidity, jsonInfo2PoolKeys, Token, TokenAmount, TOKEN_PROGRAM_ID, Percent, SPL_ACCOUNT_LAYOUT, } from '@raydium-io/raydium-sdk';
import { Wallet } from '@coral-xyz/anchor';
import bs58 from 'bs58';
import fs from 'fs';
import path from 'path';
class RaydiumSwap {
    constructor(RPC_URL, WALLET_PRIVATE_KEY) {
        this.connection = new Connection(RPC_URL, { commitment: 'confirmed' });
        this.wallet = new Wallet(Keypair.fromSecretKey(Uint8Array.from(bs58.decode(WALLET_PRIVATE_KEY))));
    }
    async loadPoolKeys(liquidityFile) {
        var _a, _b;
        let liquidityJson;
        if (liquidityFile.startsWith('http')) {
            const liquidityJsonResp = await fetch(liquidityFile);
            if (!liquidityJsonResp.ok)
                return;
            liquidityJson = await liquidityJsonResp.json();
        }
        else {
            liquidityJson = JSON.parse(fs.readFileSync(path.join(__dirname, liquidityFile), 'utf-8'));
        }
        const allPoolKeysJson = [...((_a = liquidityJson === null || liquidityJson === void 0 ? void 0 : liquidityJson.official) !== null && _a !== void 0 ? _a : []), ...((_b = liquidityJson === null || liquidityJson === void 0 ? void 0 : liquidityJson.unOfficial) !== null && _b !== void 0 ? _b : [])];
        this.allPoolKeysJson = allPoolKeysJson;
    }
    findPoolInfoForTokens(mintA, mintB) {
        const poolData = this.allPoolKeysJson.find((i) => (i.baseMint === mintA && i.quoteMint === mintB) || (i.baseMint === mintB && i.quoteMint === mintA));
        if (!poolData)
            return null;
        return jsonInfo2PoolKeys(poolData);
    }
    async getOwnerTokenAccounts() {
        const walletTokenAccount = await this.connection.getTokenAccountsByOwner(this.wallet.publicKey, {
            programId: TOKEN_PROGRAM_ID,
        });
        return walletTokenAccount.value.map((i) => ({
            pubkey: i.pubkey,
            programId: i.account.owner,
            accountInfo: SPL_ACCOUNT_LAYOUT.decode(i.account.data),
        }));
    }
    async getSwapTransaction(toToken, amount, poolKeys, maxLamports = 100000, useVersionedTransaction = true, fixedSide = 'in') {
        const directionIn = poolKeys.quoteMint.toString() == toToken;
        const { minAmountOut, amountIn } = await this.calcAmountOut(poolKeys, amount, directionIn);
        console.log({ minAmountOut, amountIn });
        const userTokenAccounts = await this.getOwnerTokenAccounts();
        const swapTransaction = await Liquidity.makeSwapInstructionSimple({
            connection: this.connection,
            makeTxVersion: useVersionedTransaction ? 0 : 1,
            poolKeys: Object.assign({}, poolKeys),
            userKeys: {
                tokenAccounts: userTokenAccounts,
                owner: this.wallet.publicKey,
            },
            amountIn: amountIn,
            amountOut: minAmountOut,
            fixedSide: fixedSide,
            config: {
                bypassAssociatedCheck: false,
            },
            computeBudgetConfig: {
                microLamports: maxLamports,
            },
        });
        const recentBlockhashForSwap = await this.connection.getLatestBlockhash();
        const instructions = swapTransaction.innerTransactions[0].instructions.filter(Boolean);
        if (useVersionedTransaction) {
            const versionedTransaction = new VersionedTransaction(new TransactionMessage({
                payerKey: this.wallet.publicKey,
                recentBlockhash: recentBlockhashForSwap.blockhash,
                instructions: instructions,
            }).compileToV0Message());
            versionedTransaction.sign([this.wallet.payer]);
            return versionedTransaction;
        }
        const legacyTransaction = new Transaction({
            blockhash: recentBlockhashForSwap.blockhash,
            lastValidBlockHeight: recentBlockhashForSwap.lastValidBlockHeight,
            feePayer: this.wallet.publicKey,
        });
        legacyTransaction.add(...instructions);
        return legacyTransaction;
    }
    async sendLegacyTransaction(tx, maxRetries) {
        const txid = await this.connection.sendTransaction(tx, [this.wallet.payer], {
            skipPreflight: true,
            maxRetries: maxRetries,
        });
        return txid;
    }
    async sendVersionedTransaction(tx, maxRetries) {
        const txid = await this.connection.sendTransaction(tx, {
            skipPreflight: true,
            maxRetries: maxRetries,
        });
        return txid;
    }
    async simulateLegacyTransaction(tx) {
        const txid = await this.connection.simulateTransaction(tx, [this.wallet.payer]);
        return txid;
    }
    async simulateVersionedTransaction(tx) {
        const txid = await this.connection.simulateTransaction(tx);
        return txid;
    }
    getTokenAccountByOwnerAndMint(mint) {
        return {
            programId: TOKEN_PROGRAM_ID,
            pubkey: PublicKey.default,
            accountInfo: {
                mint: mint,
                amount: 0,
            },
        };
    }
    async calcAmountOut(poolKeys, rawAmountIn, swapInDirection) {
        const poolInfo = await Liquidity.fetchInfo({ connection: this.connection, poolKeys });
        let currencyInMint = poolKeys.baseMint;
        let currencyInDecimals = poolInfo.baseDecimals;
        let currencyOutMint = poolKeys.quoteMint;
        let currencyOutDecimals = poolInfo.quoteDecimals;
        if (!swapInDirection) {
            currencyInMint = poolKeys.quoteMint;
            currencyInDecimals = poolInfo.quoteDecimals;
            currencyOutMint = poolKeys.baseMint;
            currencyOutDecimals = poolInfo.baseDecimals;
        }
        const currencyIn = new Token(TOKEN_PROGRAM_ID, currencyInMint, currencyInDecimals);
        const amountIn = new TokenAmount(currencyIn, rawAmountIn, false);
        const currencyOut = new Token(TOKEN_PROGRAM_ID, currencyOutMint, currencyOutDecimals);
        const slippage = new Percent(5, 100);
        const { amountOut, minAmountOut, currentPrice, executionPrice, priceImpact, fee } = Liquidity.computeAmountOut({
            poolKeys,
            poolInfo,
            amountIn,
            currencyOut,
            slippage,
        });
        return {
            amountIn,
            amountOut,
            minAmountOut,
            currentPrice,
            executionPrice,
            priceImpact,
            fee,
        };
    }
}
export default RaydiumSwap;
//# sourceMappingURL=RaydiumSwap.js.map