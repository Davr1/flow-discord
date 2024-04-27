import { Cache, DiscordChannel, DiscordGuild } from "./cache";
import { DiscordClient } from "./discord/client";
import { RPCEvents, Scopes } from "./discord/constants";
import { FlowClient } from "./flow/client";
import { Init, Query, QueryResponse } from "./flow/types";

export class Plugin {
    #discord: DiscordClient;
    #flow: FlowClient;
    #cache: Cache;
    config: Init | null = null;

    constructor() {
        this.#flow = new FlowClient();
        this.#discord = new DiscordClient(null, [Scopes.RPC, Scopes.MESSAGES_READ]);

        this.#cache = new Cache(this.#discord);
    }

    async init(): Promise<void> {
        this.config = await this.#flow.tryConnect();

        this.#flow.onRequest("query", this.#queryHandler.bind(this));
        this.#flow.onRequest("reconnect", this.#reconnect.bind(this));

        await this.#reconnect();
    }

    async #reconnect(): Promise<void> {
        const { promise, resolve, reject } = Promise.withResolvers<void>();

        await this.#discord.tryConnect();

        if (this.#discord.connected && this.#discord.ready) {
            this.#discord.subscribe(RPCEvents.GuildCreate, {});
            this.#discord.subscribe(RPCEvents.ChannelCreate, {});

            this.#discord.on(RPCEvents.GuildCreate, async (guild) => {
                this.#cache.addGuild(DiscordGuild.fromBasicGuild(guild));
            });
            this.#discord.on(RPCEvents.ChannelCreate, async ({ id }) => {
                let channel = await this.#cache.getFullChannel(id);
                this.#cache.addChannel(DiscordChannel.fromChannel(channel!));
            });

            resolve();
        } else {
            reject();
        }

        return promise;
    }

    #queryHandler(query: Query): QueryResponse {
        if (!this.#discord.connected || !this.#discord.ready)
            return {
                result: [
                    {
                        title: "Connect to discord",
                        jsonRPCAction: {
                            method: "reconnect",
                        },
                    },
                ],
            };

        return {
            result: [],
        };
    }
}
