import open from "open";
import { Flow, JSONRPCResponse } from "flow-launcher-helper";
import { RequestManager, HTTPTransport, Client } from "@open-rpc/client-js";
import { RPCCommands, RPCEvents } from "./constants";
import { DiscordClient } from "./client";

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

let client = new DiscordClient();

(async () => {
    await client.tryConnect();

    let guild = await client.send(RPCCommands.GetGuild, { guild_id: "662267976984297473" });
    console.log(guild);

    let subscription = await client.subscribe(RPCEvents.GuildStatus, { guild_id: "662267976984297473" });
    console.log(subscription);

    client.on(RPCEvents.GuildStatus, (data) => {
        console.log(data.data);

        //client.unsubscribe(RPCEvents.GuildStatus, { guild_id: "662267976984297473" });
    });
})();
