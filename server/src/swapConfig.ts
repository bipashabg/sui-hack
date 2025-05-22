export const swapConfig = {
    executeSwap: false, // Send tx when true, simulate tx when false
    useVersionedTransaction: true,
    tokenAAmount: 0.001, // Swap 0.01 SOL for USDC in this example
    tokenAAddress: "So11111111111111111111111111111111111111112", // solana
    tokenBAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // memecoin
    maxLamports: 1500000, // Micro lamports for priority fee
    direction: "in" as "in" | "out", // Swap direction: 'in' or 'out'
    liquidityFile: "trimmed_mainnet.json",
    maxRetries: 20,
  };