import { resolve } from "path";
const __dirname = new URL(".", import.meta.url).pathname;
import { config } from "dotenv";
config();
export const chainMap = {
    ethereum: "11155111",
    base: "84532",
    linea: "59141",
    solana: "sol_dev",
};
export const getTokenMetadataPath = () => {
    const path = resolve(__dirname, "..", "..", process.env.TOKEN_DETAILS_PATH || "token_metadata.example.jsonc");
    console.log("tokenMetadataPath:", path);
    return path;
};
export const getCollablandApiUrl = () => {
    return (process.env.COLLABLAND_API_URL || "https://api-qa.collab.land/accountkit/v1");
};
export const getCardHTML = (botUsername, claimURL) => {
    return `<!DOCTYPE html>
<html lang="en">

<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="twitter:card" content="player" />
	<meta name="twitter:site" content="@${botUsername}" />
	<meta name="twitter:title" content="AI Agent Starter Kit" />
	<meta name="twitter:description"
		content="This is a sample card for claiming airdrops with the AI Agent Starter Kit" />
	<meta name="twitter:image" content="https://assets.collab.land/collabland-logo.png" />
	<meta name="twitter:player" content="${claimURL}" />
	<meta name="twitter:player:width" content="480" />
	<meta name="twitter:player:height" content="480" />
</head>

<body>
	<title>Claim token airdrop.</title>
</body>

</html>`;
};
//# sourceMappingURL=utils.js.map