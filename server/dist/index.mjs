
import { getTokenFromLLM } from "./get-token-from-llm.js";
import { getTweets } from "./get-tweets.js";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { swap } from "./swap.js";
const SOL_AMOUNT = 0.001 * LAMPORTS_PER_SOL;
async function main(userName) {
    const newTweets = await getTweets(userName);
    console.log(newTweets);
    for (let tweet of newTweets) {
        const tokenAddress = await getTokenFromLLM(tweet.contents);
        if (tokenAddress !== "null") {
            console.log(`trying to execute tweet => ${tweet.contents}`);
            await swap(tokenAddress, SOL_AMOUNT);
        }
    }
}
main("rocketcoin36");
//# sourceMappingURL=index.js.map