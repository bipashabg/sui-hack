import { Bot, webhookCallback } from "grammy";
import { BaseService } from "./base.service.js";
import { ElizaService } from "./eliza.service.js";
import { getCollablandApiUrl, getTokenMetadataPath, } from "../utils.js";
import fs from "fs";
import axios, { isAxiosError } from "axios";
import { parse as jsoncParse } from "jsonc-parser";
import path, { resolve } from "path";
import { keccak256, getBytes, toUtf8Bytes } from "ethers";
import { TwitterService } from "./twitter.service.js";
import { NgrokService } from "./ngrok.service.js";
const htmlEscape = (_key, val) => {
    if (typeof val === "string") {
        return val
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }
    return val;
};
const __dirname = path.dirname(new URL(import.meta.url).pathname);
export class TelegramService extends BaseService {
    constructor(webhookUrl) {
        super();
        if (!process.env.TELEGRAM_BOT_TOKEN) {
            throw new Error("TELEGRAM_BOT_TOKEN is required");
        }
        if (webhookUrl != null) {
            this.webhookUrl = `${webhookUrl}/telegram/webhook`;
        }
        this.bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);
        this.elizaService = ElizaService.getInstance(this.bot);
    }
    static getInstance(webhookUrl) {
        if (!TelegramService.instance) {
            TelegramService.instance = new TelegramService(webhookUrl);
        }
        return TelegramService.instance;
    }
    async setWebhook(webhookUrl) {
        this.webhookUrl = `${webhookUrl}/telegram/webhook`;
        await this.bot.api.setWebhook(this.webhookUrl);
        console.log("Telegram webhook set:", this.webhookUrl);
    }
    getWebhookCallback() {
        return webhookCallback(this.bot, "express", {
            timeoutMilliseconds: 10 * 60 * 1000,
            onTimeout: "return",
        });
    }
    async start() {
        var _a;
        const client = axios.create({
            baseURL: getCollablandApiUrl(),
            headers: {
                "X-API-KEY": process.env.COLLABLAND_API_KEY || "",
                "X-TG-BOT-TOKEN": process.env.TELEGRAM_BOT_TOKEN || "",
                "Content-Type": "application/json",
            },
            timeout: 5 * 60 * 1000,
        });
        try {
            this.bot.api.setMyCommands([
                {
                    command: "start",
                    description: "Add any hello world functionality to your bot",
                },
                { command: "mint", description: "Mint a token on Wow.xyz" },
                { command: "eliza", description: "Talk to the AI agent" },
                { command: "lit", description: "Execute a Lit action" },
            ]);
            this.bot.command("start", (ctx) => ctx.reply("Hello!"));
            this.bot.catch(async (error) => {
                console.error("Telegram bot error:", error);
            });
            await this.elizaService.start();
            this.nGrokService = await NgrokService.getInstance();
            try {
                this.twitterService = await TwitterService.getInstance();
                await ((_a = this.twitterService) === null || _a === void 0 ? void 0 : _a.start());
                console.log("Twitter Bot Profile:", JSON.stringify(this.twitterService.me, null, 2));
            }
            catch (err) {
                console.log("[WARN] [telegram.service] Unable to use twitter. Functionality will be disabled", err);
            }
            this.bot.command("mint", async (ctx) => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
                try {
                    ctx.reply("Minting your token...");
                    const tokenPath = getTokenMetadataPath();
                    const tokenInfo = jsoncParse(fs.readFileSync(tokenPath, "utf8"));
                    console.log("TokenInfoToMint", tokenInfo);
                    console.log("Hitting Collab.Land APIs to mint token...");
                    const { data: _tokenData } = await client.post(`/telegrambot/evm/mint?chainId=8453`, {
                        name: tokenInfo.name,
                        symbol: tokenInfo.symbol,
                        metadata: {
                            description: (_a = tokenInfo.description) !== null && _a !== void 0 ? _a : "",
                            website_link: (_b = tokenInfo.websiteLink) !== null && _b !== void 0 ? _b : "",
                            twitter: (_c = tokenInfo.twitter) !== null && _c !== void 0 ? _c : "",
                            discord: (_d = tokenInfo.discord) !== null && _d !== void 0 ? _d : "",
                            telegram: (_e = tokenInfo.telegram) !== null && _e !== void 0 ? _e : "",
                            media: (_f = tokenInfo.image) !== null && _f !== void 0 ? _f : "",
                            nsfw: (_g = tokenInfo.nsfw) !== null && _g !== void 0 ? _g : false,
                        },
                    });
                    console.log("Mint response from Collab.Land:");
                    console.dir(_tokenData, { depth: null });
                    const tokenData = _tokenData.response.contract.fungible;
                    await ctx.reply(`Your token has been minted on wow.xyz 🥳
Token details:
<pre><code class="language-json">${JSON.stringify(tokenData, null, 2)}</code></pre>

You can view the token page below (it takes a few minutes to be visible)`, {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: "View Wow.xyz Token Page",
                                        url: `https://wow.xyz/${tokenData.address}`,
                                    },
                                ],
                            ],
                        },
                        parse_mode: "HTML",
                    });
                    if (this.twitterService) {
                        const twitterBotInfo = this.twitterService.me;
                        const twitterClient = this.twitterService.getScraper();
                        const ngrokURL = this.nGrokService.getUrl();
                        await ctx.reply(`🐦 Posting a tweet about the new token...\n\n` +
                            `Twitter account details:\n<pre lang="json"><code>${JSON.stringify(twitterBotInfo, null, 2)}</code></pre>`, {
                            parse_mode: "HTML",
                        });
                        const claimURL = `${process.env.NEXT_PUBLIC_HOSTNAME}/claim/${tokenData.address}`;
                        const botUsername = twitterBotInfo === null || twitterBotInfo === void 0 ? void 0 : twitterBotInfo.username;
                        console.log("botUsername:", botUsername);
                        console.log("claimURL:", claimURL);
                        const slug = Buffer.from(claimURL).toString("base64url") +
                            ":" +
                            Buffer.from(botUsername).toString("base64url");
                        console.log("slug:", slug);
                        const cardURL = `${ngrokURL}/auth/twitter/card/${slug}/index.html`;
                        console.log("cardURL:", cardURL);
                        const twtRes = await twitterClient.sendTweet(`I just minted a token on Base using Wow!\nThe ticker is $${tokenData.symbol}\nClaim early alpha here: ${cardURL}`);
                        if (twtRes.ok) {
                            const tweetId = (await twtRes.json());
                            console.log("Tweet posted successfully:", tweetId);
                            const tweetURL = `https://twitter.com/${twitterBotInfo === null || twitterBotInfo === void 0 ? void 0 : twitterBotInfo.username}/status/${(_l = (_k = (_j = (_h = tweetId === null || tweetId === void 0 ? void 0 : tweetId.data) === null || _h === void 0 ? void 0 : _h.create_tweet) === null || _j === void 0 ? void 0 : _j.tweet_results) === null || _k === void 0 ? void 0 : _k.result) === null || _l === void 0 ? void 0 : _l.rest_id}`;
                            console.log("Tweet URL:", tweetURL);
                            await ctx.reply(`Tweet posted successfully!\n\n` +
                                `🎉 Tweet details: ${tweetURL}`, {
                                parse_mode: "HTML",
                            });
                        }
                        else {
                            console.error("Failed to post tweet:", await twtRes.json());
                            await ctx.reply("Failed to post tweet");
                        }
                    }
                }
                catch (error) {
                    if (isAxiosError(error)) {
                        console.error("Failed to mint token:", (_m = error.response) === null || _m === void 0 ? void 0 : _m.data);
                    }
                    else {
                        console.error("Failed to mint token:", error);
                    }
                    ctx.reply("Failed to mint token");
                }
            });
            this.bot.command("lit", async (ctx) => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
                try {
                    const action = ctx.match;
                    console.log("action:", action);
                    const actionHashes = JSON.parse((await fs.readFileSync(resolve(__dirname, "..", "..", "..", "lit-actions", "actions", `ipfs.json`))).toString());
                    console.log("actionHashes:", actionHashes);
                    const actionHash = actionHashes[action];
                    console.log("actionHash:", actionHash);
                    if (!actionHash) {
                        ctx.reply(`Action not found: ${action}`);
                        return;
                    }
                    let jsParams;
                    const chainId = 8453;
                    switch (action) {
                        case "hello-action": {
                            const messageToSign = (_d = (_b = (_a = ctx.from) === null || _a === void 0 ? void 0 : _a.username) !== null && _b !== void 0 ? _b : (_c = ctx.from) === null || _c === void 0 ? void 0 : _c.first_name) !== null && _d !== void 0 ? _d : "";
                            const messageToSignDigest = keccak256(toUtf8Bytes(messageToSign));
                            jsParams = {
                                helloName: messageToSign,
                                toSign: Array.from(getBytes(messageToSignDigest)),
                            };
                            break;
                        }
                        case "decrypt-action": {
                            const toEncrypt = `encrypt-decrypt-test-${new Date().toUTCString()}`;
                            ctx.reply(`Invoking encrypt action with ${toEncrypt}`);
                            const { data } = await client.post(`/telegrambot/executeLitActionUsingPKP?chainId=${chainId}`, {
                                actionIpfs: actionHashes["encrypt-action"].IpfsHash,
                                actionJsParams: {
                                    toEncrypt,
                                },
                            });
                            console.log("encrypt response ", data);
                            const { ciphertext, dataToEncryptHash } = JSON.parse(data.response.response);
                            jsParams = {
                                ciphertext,
                                dataToEncryptHash,
                                chain: "base",
                            };
                            break;
                        }
                        case "encrypt-action": {
                            const message = (_h = (_f = (_e = ctx.from) === null || _e === void 0 ? void 0 : _e.username) !== null && _f !== void 0 ? _f : (_g = ctx.from) === null || _g === void 0 ? void 0 : _g.first_name) !== null && _h !== void 0 ? _h : "test data";
                            jsParams = {
                                toEncrypt: `${message}-${new Date().toUTCString()}`,
                            };
                            break;
                        }
                        default: {
                            ctx.reply(`Action not handled: ${action}`);
                            return;
                        }
                    }
                    await ctx.reply("Executing action..." +
                        `\n\nAction Hash: <code>${actionHash.IpfsHash}</code>\n\nParams:\n<pre lang="json"><code>${JSON.stringify(jsParams, htmlEscape, 2)}</code></pre>`, {
                        parse_mode: "HTML",
                    });
                    console.log(`[telegram.service] executing lit action with hash ${actionHash.IpfsHash} on chain ${chainId}`);
                    const { data } = await client.post(`/telegrambot/executeLitActionUsingPKP?chainId=${chainId}`, {
                        actionIpfs: actionHash.IpfsHash,
                        actionJsParams: jsParams,
                    });
                    console.log(`Action with hash ${actionHash.IpfsHash} executed on Lit Nodes 🔥`);
                    console.log("Result:", data);
                    ctx.reply(`Action executed on Lit Nodes 🔥\n\n` +
                        `Action: <code>${actionHash.IpfsHash}</code>\n` +
                        `Result:\n<pre lang="json"><code>${JSON.stringify(data, null, 2)}</code></pre>`, {
                        parse_mode: "HTML",
                    });
                }
                catch (error) {
                    if (isAxiosError(error)) {
                        console.error("Failed to execute Lit action:", (_j = error.response) === null || _j === void 0 ? void 0 : _j.data);
                        ctx.reply("Failed to execute Lit action" +
                            `\n\nError: <pre lang="json"><code>${JSON.stringify((_k = error.response) === null || _k === void 0 ? void 0 : _k.data, null, 2)}</code></pre>`, {
                            parse_mode: "HTML",
                        });
                    }
                    else {
                        console.error("Failed to execute Lit action:", error);
                        ctx.reply("Failed to execute Lit action" +
                            `\n\nError: <pre lang="json"><code>${JSON.stringify(error === null || error === void 0 ? void 0 : error.message, null, 2)}</code></pre>`, {
                            parse_mode: "HTML",
                        });
                    }
                }
            });
        }
        catch (error) {
            console.error("Failed to start Telegram bot:", error);
            throw error;
        }
    }
    getBotInfo() {
        return this.bot.api.getMe();
    }
    async stop() {
        try {
            await this.bot.api.deleteWebhook();
        }
        catch (error) {
            console.error("Error stopping Telegram bot:", error);
        }
    }
}
//# sourceMappingURL=telegram.service.js.map