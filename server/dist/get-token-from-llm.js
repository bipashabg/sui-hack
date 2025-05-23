import OpenAI from "openai";
import 'dotenv/config'; 
const openai = new OpenAI({
    apiKey: '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'
});
export async function getTokenFromLLM(contents) {
    var _a;
    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        store: true,
        messages: [
            { "role": "system", "content": "You are an AI agent that needs to tell me if this tweet is about buying a token. Return me either the address of the solana token, or return me null if you cant find a solana token address in this tweet. Only return if it says it is a bull post. The token address will be very visible in the tweet." },
            { "role": "user", "content": contents }
        ]
    });
    return (_a = completion.choices[0].message.content) !== null && _a !== void 0 ? _a : "null";
}
//# sourceMappingURL=get-token-from-llm.js.map