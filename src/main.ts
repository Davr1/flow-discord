import open from "open";
import { Flow, JSONRPCResponse } from "flow-launcher-helper";
import { RequestManager, HTTPTransport, Client } from "@open-rpc/client-js";
import { RPCCommands, RPCEvents, Scopes } from "./constants";
import { DiscordClient } from "./client";
import { Snowflake } from "./types";

// The events are the custom events that you define in the flow.on() method.
// type Methods = "query" | "search";

// const flow = new Flow<Methods>("assets/npm.png");

// flow.on("query", (params) => {
//     const [query] = params;

//     const url = `https://www.npmjs.com/search?${query}`;

//     flow.showResult({
//         title: `Search NPM packagexe: ${query} ${client.connected}`,
//         subtitle: url,
//         method: "search",
//         params: [url],
//         dontHideAfterAction: true,
//     });

//     //flow.copyToClipboard({ text: JSON.stringify(params) });
// });

// flow.on("search", () => {
//     open("https://google.com");
// });

// flow.run();

let client = new DiscordClient(null, [Scopes.RPC, Scopes.MESSAGES_READ]);

async function logMessages(channelId: Snowflake) {
    let channel = await client.send(RPCCommands.GetChannel, { channel_id: channelId });

    console.log(`Listening for messages in #${channel.data.name}...`);

    await client.subscribe(RPCEvents.MessageCreate, { channel_id: channelId });

    client.on(RPCEvents.MessageCreate, ({ data: { message } }) => {
        console.log(`${message.author.username}: ${message.content}`);
    });
}

(async () => {
    await client.tryConnect();

    await logMessages("1");
})();
