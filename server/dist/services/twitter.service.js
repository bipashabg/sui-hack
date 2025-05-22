import { BaseService } from "./base.service.js";
import { Scraper } from "agent-twitter-client";
import fs from "fs/promises";
import { join, dirname } from "path";
const __dirname = dirname(new URL(import.meta.url).pathname);
const twitterCookiesPath = join(__dirname, "..", "..", "..", "twitter-cookies.json");
export class TwitterService extends BaseService {
    constructor() {
        super();
        this.scraper = null;
        this.isConnected = false;
        this.me = undefined;
    }
    static getInstance() {
        if (!TwitterService.instance) {
            TwitterService.instance = new TwitterService();
        }
        return TwitterService.instance;
    }
    async start() {
        try {
            console.log("[TwitterService] Starting service...");
            if (!(await fs.stat(twitterCookiesPath).catch(() => false))) {
                throw new Error("Twitter cookies not found. Please run the `pnpm login-x` script first.");
            }
            console.log("[TwitterService] Loading Twitter cookies from:", twitterCookiesPath);
            const cookieJson = await fs.readFile(twitterCookiesPath, "utf-8");
            const cookiesJSON = JSON.parse(cookieJson);
            this.scraper = new Scraper();
            await this.scraper.setCookies(cookiesJSON.cookies);
            console.log("[TwitterService] Starting service with existing cookies...");
            const connected = await this.scraper.isLoggedIn();
            if (!connected) {
                throw new Error("Failed to login with existing cookies.");
            }
            this.me = await this.scraper.me();
            this.isConnected = true;
        }
        catch (error) {
            console.error("[TwitterService] Error:", error);
            throw new Error("Twitter cookies not found. Please run the `pnpm letsgo` script first.");
        }
    }
    async stop() {
        if (this.isConnected && this.scraper) {
            await this.scraper.clearCookies();
            this.isConnected = false;
        }
    }
    getScraper() {
        if (!this.scraper) {
            throw new Error("Twitter service not started");
        }
        return this.scraper;
    }
}
//# sourceMappingURL=twitter.service.js.map