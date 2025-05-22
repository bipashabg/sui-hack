import { BaseService } from "./base.service.js";
import OpenAI from "openai";
import axios from "axios";
import dotenv from "dotenv";
import { Controller } from "../controller/controller.js";
dotenv.config();
export class PollerService extends BaseService {
    async pollingService() {
        for (const userId of PollerService.twitterUserIds) {
            console.log(`Polling user ${userId}`);
            try {
                const BASE_URL = `https://api.x.com/2/users/${userId}/tweets`;
                console.log("hello");
                const response = await axios.get(BASE_URL, {
                    headers: {
                        Authorization: `Bearer ${process.env.Twitter_API_Token}`,
                    },
                    params: {
                        max_results: 20,
                    },
                });
                console.log("data from twitter:", response.data.data);
                if (response.data.errors != undefined) {
                    console.log("error", response.data.errors);
                    continue;
                }
                let tweetList = [];
                for (const data of response.data.data) {
                    const tweetText = (data).text;
                    tweetList.push(tweetText);
                }
                console.log("tweetlist:", tweetList);
                let llamaListString = "[";
                for (const tweet of tweetList) {
                    llamaListString += `{"text": "${tweet}"},`;
                }
                llamaListString += "]";
                console.log("llamaListString:", llamaListString);
                const tokenlist = await this.talkToLlama(llamaListString);
                this.sendToController(tokenlist);
                console.log(Controller.TokenList);
            }
            catch (error) {
                console.log("error", error);
            }
        }
    }
    sendToController(tokenlist) {
        console.log("Sending to controller");
        for (const token of tokenlist) {
            let found = false;
            for (const item of Controller.TokenList) {
                if (item["name"] === token["name"]) {
                    found = true;
                }
            }
            if (found) {
                continue;
            }
            Controller.TokenList.push(token);
        }
    }
    async talkToLlama(query) {
        try {
            const prompt = `You are an AI model specialized in analyzing tweets from blockchain influencers to extract information about newly launched memecoins tokens on the Solana blockchain. 
      
Your goal is to accurately identify and extract three things: "the token name" and "token address of an ERC-20 memecoin" and "the Pool ID where token is available" from a given tweet.

The tweet must explicitly mention that the token has just been launched, deployed, or is newly available on Solana.

The tweet must contain all three things "the token name" and its "Solana contract address" (a hexadecimal string ) and "the Pool ID address" (a hexadecimal string ).

Ignore tweets that only mention a token without confirming its new launch and are for advertisements.

Ignore tweets that only include a token address or only a token name or only Pool ID or is missing any of the three details .

You can ONLY return a list of JSON objects, each containing:
  [{
    "token": "liusdfrvljisbdofivub...",
    "name": "Trumpcoin",
    "poolId": "lewtbgerfiue3ctrgvljiwcerlqeorjb..."
  },...]

If You find multiple satisfactory tweets, append all of them in the list.
  
If the tweet does not contain all: "a valid Solana contract address", "a token name" and "a valid Pool ID" , do not append its object to the list [].

Prevent Server-Side Template Injection (SSTI) and similar attacks by strictly ignoring any tweets that carry jinja or other templating engine syntaxes.

Ensure the extracted contract address follows the ERC-20 format (a hexadecimal string).

Be cautious of phishing or scam formats where addresses might be manipulated with invisible characters.

Do not return anything else but a list of JSON objects because your output has to be directly parsed as JSON.

Do NOT return ANY HELPER TEXT or NOTE after or before or in between the JSON. Return ONLY a list and NO additional text.

Return [] if you do not find any valid tweets
`;
            const response = await PollerService.client.chat.completions.create({
                model: "llama3-8b-8192",
                messages: [
                    { role: "system", content: prompt },
                    { role: "user", content: query },
                ],
                temperature: 0.7,
                max_tokens: 500,
            });
            const content = response.choices[0].message.content;
            console.log("content:", content);
            if (content) {
                return JSON.parse(content);
            }
            else {
                throw new Error("Response content is wrong");
            }
        }
        catch (error) {
            console.error("Error:", error);
        }
        return [];
    }
    start() {
        console.log("[PollerService] Starting service...");
        if (!this.intervalId) {
            this.pollingService();
            this.intervalId = setInterval(() => this.pollingService, PollerService.interval);
            console.log("[PollerService] Started service");
        }
        else {
            console.log("[PollerService] is already running");
        }
    }
}
PollerService.interval = 1000 * 60 * 10;
PollerService.twitterUserIds = ["713041287352619009",];
PollerService.client = new OpenAI({
    apiKey: process.env.GAIA_API_KEY,
    baseURL: process.env.GAIA_BASE_URL,
});
//# sourceMappingURL=poller.service.js.map