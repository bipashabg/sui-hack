import { getEmbeddingZeroVector, } from "@ai16z/eliza";
import { CollabLandBaseAction } from "./collabland.action.js";
import { randomUUID } from "crypto";
import { chainMap } from "../../utils.js";
export class GetBotAccountAction extends CollabLandBaseAction {
    constructor() {
        const name = "GET_SMART_ACCOUNT";
        const similes = [
            "GET_ACCOUNT",
            "GET_ETHEREUM_ACCOUNT",
            "ACCOUNT",
            "WALLET",
            "WALLET_ADDRESS",
            "GET_EVM_WALLET",
        ];
        const description = "Get's the agent's smart account details";
        const handler = async (_runtime, _message, _state, _options, _callback) => {
            let chain = null;
            const onChainMemoryManager = _runtime.getMemoryManager("onchain");
            const onChainMemories = await onChainMemoryManager.getMemories({
                roomId: _message.roomId,
                unique: false,
            });
            console.log("[GetBotAccountAction] onChainMemories", onChainMemories);
            for (const memory of onChainMemories) {
                if (memory.content.chain !== undefined) {
                    chain = memory.content.chain;
                    break;
                }
            }
            if (chain == null) {
                _callback === null || _callback === void 0 ? void 0 : _callback({
                    text: "I cannot proceed because I don't know the chain you're looking for. I support Ethereum, Linea, Base, Solana and others.",
                });
                return false;
            }
            const chainId = chainMap[chain];
            if (chainId == null) {
                console.log("[GetBotAccountAction] chainId is null");
                _callback === null || _callback === void 0 ? void 0 : _callback({
                    text: "I cannot proceed because I don't know which chain you're looking for. I support Ethereum, Linea, Base, Solana and others.",
                });
                return false;
            }
            console.log("[GetBotAccountAction] chainId", chainId);
            let account = null;
            for (const memory of onChainMemories) {
                if (memory.content.smartAccount != null &&
                    memory.content.signerAccount != null &&
                    memory.content.type == "evm" &&
                    memory.content.chainId == chainId) {
                    console.log("Account found in memory", memory.content);
                    account = memory.content;
                    break;
                }
                if (memory.content.smartAccount != null &&
                    memory.content.signerAccount != null &&
                    memory.content.type == "solana" &&
                    memory.content.network == chainId) {
                    console.log("Solana account found in memory", memory.content);
                    account = memory.content;
                    break;
                }
            }
            if (account != null) {
                _callback === null || _callback === void 0 ? void 0 : _callback({
                    text: `My Account Details:\nAddress: ${account.smartAccount}\nPKP Signer: ${account.signerAccount}\n` +
                        (account.type == "evm"
                            ? `Chain ID: ${account.chainId} (${chain})`
                            : `Network: ${account.network} (${chain})`),
                });
                return true;
            }
            try {
                console.log("Hitting Collab.Land APIs to get the smart accounts...");
                const response = await this.client.get(`/telegrambot/accounts`, {
                    headers: {
                        "Content-Type": "application/json",
                        "X-TG-BOT-TOKEN": process.env.TELEGRAM_BOT_TOKEN,
                        "X-API-KEY": process.env.COLLABLAND_API_KEY,
                    },
                });
                console.log("[GetBotAccountAction] response from Collab.Land API", response.data);
                _callback === null || _callback === void 0 ? void 0 : _callback({
                    text: `
Provisioned Accounts:
PKP Signer: ${response.data.pkpAddress}
Ethereum:
${response.data.evm.map((evmAccount) => `• ${evmAccount.address} (${evmAccount.chainId})`).join("\n")}
Solana:
${response.data.solana.map((solanaAccount) => `• ${solanaAccount.address} (${solanaAccount.network})`).join("\n")}
`,
                });
                const smartAccountMemories = response.data.evm.map((evmAccount) => {
                    return {
                        id: randomUUID(),
                        agentId: _message.agentId,
                        userId: _message.userId,
                        roomId: _message.roomId,
                        content: {
                            text: "",
                            smartAccount: evmAccount.address,
                            signerAccount: response.data.pkpAddress,
                            chainId: evmAccount.chainId,
                            type: "evm",
                        },
                        createdAt: Date.now(),
                        embedding: getEmbeddingZeroVector(),
                        unique: true,
                    };
                });
                const solanaAccountMemories = response.data.solana.map((solanaAccount) => {
                    return {
                        id: randomUUID(),
                        agentId: _message.agentId,
                        userId: _message.userId,
                        roomId: _message.roomId,
                        content: {
                            text: "",
                            smartAccount: solanaAccount.address,
                            signerAccount: response.data.pkpAddress,
                            network: solanaAccount.network,
                            type: "solana",
                        },
                        createdAt: Date.now(),
                        embedding: getEmbeddingZeroVector(),
                        unique: true,
                    };
                });
                console.log("[GetBotAccountAction] creating smartAccountMemories", smartAccountMemories);
                console.log("[GetBotAccountAction] creating solanaAccountMemories", solanaAccountMemories);
                const onChainMemoryManager = _runtime.getMemoryManager("onchain");
                await Promise.all([...smartAccountMemories, ...solanaAccountMemories].map((memory) => onChainMemoryManager.createMemory(memory, true)));
                return true;
            }
            catch (error) {
                this.handleError(error);
                return false;
            }
        };
        const validate = async () => {
            return true;
        };
        const examples = [
            [
                {
                    user: "{{user1}}",
                    content: {
                        text: "What is your smart account?",
                    },
                },
                {
                    user: "{{agentName}}",
                    content: {
                        text: "",
                        action: "GET_SMART_ACCOUNT",
                    },
                },
            ],
            [
                {
                    user: "{{user1}}",
                    content: {
                        text: "What is your account?",
                    },
                },
                {
                    user: "{{agentName}}",
                    content: {
                        text: "",
                        action: "GET_SMART_ACCOUNT",
                    },
                },
            ],
            [
                {
                    user: "{{user1}}",
                    content: {
                        text: "I don't know the chain but can you get the smart account?",
                    },
                },
                {
                    user: "{{agentName}}",
                    content: {
                        text: "I don't know which chain you're looking for but I support Ethereum, Linea, Base, Solana and others.",
                    },
                },
                {
                    user: "{{user1}}",
                    content: {
                        text: "I will go with Ethereum",
                    },
                },
                {
                    user: "{{agentName}}",
                    content: {
                        text: "",
                        action: "EXTRACT_CHAIN",
                    },
                },
                {
                    user: "{{agentName}}",
                    content: {
                        text: "",
                        action: "GET_SMART_ACCOUNT",
                    },
                },
            ],
        ];
        super(name, description, similes, examples, handler, validate);
    }
}
//# sourceMappingURL=get-bot-account.action.js.map