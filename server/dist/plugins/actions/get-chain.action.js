import { composeContext, generateObject, getEmbeddingZeroVector, ModelClass, } from "@ai16z/eliza";
import { CollabLandBaseAction } from "./collabland.action.js";
import { randomUUID } from "crypto";
import { chainMap } from "../../utils.js";
const extractChainTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "chain": "string"
}
\`\`\`

These are only the available chains to find
{{availableChains}}

These are the recent messages
{{recentMessages}}

Given the recent messages and the available, extract the chain. Use the available chains only, if not available return null!

Always prioritize the chain from the recent messages, and then the older messages. If the user had recently mentioned to switch to a chain, then use that chain.

Respond with a JSON markdown block containing only the extracted values.`;
export class GetChainAction extends CollabLandBaseAction {
    constructor() {
        const name = "EXTRACT_CHAIN";
        const similes = ["GET_CHAIN", "CHAIN", "GET_CHAIN_ID", "CHAIN_ID"];
        const description = "Extracts the chain from the recent messages and the available chains are ethereum, base, linea and solana.";
        const handler = async (_runtime, message, _state, _options, _callback) => {
            try {
                console.log("[GetChainAction] message", message);
                console.log("[GetChainAction] options", _options);
                const availableChains = Object.entries(chainMap)
                    .map(([chain]) => {
                    return `${chain}`;
                })
                    .join("\n");
                console.log("[GetChainAction] availableChains", availableChains);
                const extractContext = composeContext({
                    state: Object.assign(Object.assign({}, _state), { availableChains: availableChains }),
                    template: extractChainTemplate,
                });
                console.log("[GetChainAction] extractContext", extractContext);
                const extractedChain = await generateObject({
                    context: extractContext,
                    modelClass: ModelClass.SMALL,
                    runtime: _runtime,
                });
                console.log("[GetChainAction] extractedChain", extractedChain);
                if (!extractedChain.chain) {
                    _callback === null || _callback === void 0 ? void 0 : _callback({
                        text: "I couldn't identify a valid chain name. Please specify a supported chain like Ethereum, Base, Linea or Solana.",
                    });
                    return false;
                }
                const chainMemory = {
                    id: randomUUID(),
                    agentId: message.agentId,
                    userId: message.userId,
                    roomId: message.roomId,
                    content: {
                        text: "",
                        chain: extractedChain.chain,
                    },
                    createdAt: Date.now(),
                    embedding: getEmbeddingZeroVector(),
                    unique: true,
                };
                console.log("[GetChainAction] creating chainMemory", chainMemory);
                const onChainMemoryManager = _runtime.getMemoryManager("onchain");
                await onChainMemoryManager.createMemory(chainMemory, true);
                _callback === null || _callback === void 0 ? void 0 : _callback({
                    text: `Your current chain is now ${extractedChain.chain} `,
                });
                return true;
            }
            catch (error) {
                this.handleError(error);
                return false;
            }
        };
        const validate = async (_, _message, _state) => {
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
                        text: "What chain are you looking for?",
                    },
                },
                {
                    user: "{{user1}}",
                    content: {
                        text: "Linea",
                    },
                },
                {
                    user: "{{agentName}}",
                    content: {
                        text: "",
                        action: "EXTRACT_CHAIN",
                    },
                },
            ],
            [
                {
                    user: "{{user1}}",
                    content: {
                        text: "Hi",
                    },
                },
                {
                    user: "{{agentName}}",
                    content: {
                        text: "What chain are you looking for?",
                    },
                },
                {
                    user: "{{user1}}",
                    content: {
                        text: "I am on ethereum",
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
                    user: "{{user1}}",
                    content: {
                        text: "What is your account on solana?",
                    },
                },
                {
                    user: "{{agentName}}",
                    content: {
                        text: "",
                        action: "EXTRACT_CHAIN",
                    },
                },
            ],
        ];
        super(name, description, similes, examples, handler, validate);
    }
}
//# sourceMappingURL=get-chain.action.js.map