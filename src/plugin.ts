import { DiscordClient } from "./discord/client";
import { RPCCommands, Scopes } from "./discord/constants";
import { BasicChannel, BasicGuild } from "./discord/types";
import { FlowClient } from "./flow/client";
import { Init, Query, QueryResponse } from "./flow/types";

export class Plugin {
    private discord: DiscordClient;
    private flow: FlowClient;
    config: Init | null = null;
    guilds: BasicGuild[] = [];
    channels: BasicChannel[] = [];

    constructor() {
        this.flow = new FlowClient();
        this.discord = new DiscordClient(null, [Scopes.RPC, Scopes.MESSAGES_READ]);
    }

    async init(): Promise<void> {
        this.config = await this.flow.tryConnect();
        await this.discord.tryConnect();

        this.flow.onRequest("query", this.queryHandler.bind(this));
        this.flow.onRequest("owo", this.loadServers.bind(this));
    }

    async loadServers() {
        let { guilds } = await this.discord.send(RPCCommands.GetGuilds, {});
        this.guilds = guilds;

        for (const guild of this.guilds) {
            let { channels } = await this.discord.send(RPCCommands.GetChannels, { guild_id: guild.id });
            this.channels.push(...channels);
        }
    }

    private queryHandler(query: Query): QueryResponse {
        if (this.guilds.length === 0)
            return {
                result: [
                    {
                        title: query.search + "x" + this.flow.connected,
                        jsonRPCAction: {
                            method: "owo",
                            parameters: ["a"],
                        },
                    },
                ],
            };
        else
            return {
                result: [
                    ...this.guilds.map((g) => ({
                        title: g.name,
                        subtitle: g.id.toString(),
                        icoPath: "",
                    })),
                    ...this.channels.map((c) => ({
                        title: c.name,
                        subtitle: c.id.toString(),
                    })),
                ],
            };
    }
}
