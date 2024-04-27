import { Cache, DiscordChannel, DiscordGuild } from "./cache";
import { DiscordClient } from "./discord/client";
import { ChannelType, RPCEvents, Scopes } from "./discord/constants";
import { BasicChannel, BasicGuild } from "./discord/types";
import { FlowClient } from "./flow/client";
import { Methods } from "./flow/constants";
import { Init, Query, QueryResponse, QueryResult } from "./flow/types";
import { Logger } from "./logger";

interface SearchResult extends QueryResult {
    channelType: ChannelType | null;
}

export class Plugin {
    #discord: DiscordClient;
    #flow: FlowClient;
    #cache: Cache;
    #searchCache: SearchResult[] = [];

    config: Init | null = null;

    constructor() {
        this.#flow = new FlowClient();
        this.#discord = new DiscordClient(null, [Scopes.RPC]);

        this.#cache = new Cache(this.#discord);
    }

    async init(): Promise<void> {
        this.config = await this.#flow.tryConnect();

        this.#flow.onRequest("query", this.#queryHandler.bind(this));
        this.#flow.onRequest("reconnect", this.#reconnect.bind(this));

        await this.#reconnect().catch(Logger.log);
    }

    async #reconnect(): Promise<void> {
        const { promise, resolve, reject } = Promise.withResolvers<void>();

        await this.#discord.tryConnect().catch(reject);

        if (this.#discord.connected && this.#discord.ready) {
            await this.#discord.subscribe(RPCEvents.GuildCreate, {});
            await this.#discord.subscribe(RPCEvents.ChannelCreate, {});

            this.#discord.on(RPCEvents.GuildCreate, this.#handleGuildCreate);
            this.#discord.on(RPCEvents.ChannelCreate, this.#handleChannelCreate);

            await this.#resetSearchCache();

            this.#flow.request(Methods.ShowMsg, {
                title: "Connected to discord",
                subTitle: "You can now search for guilds and channels",
            });

            resolve();
        } else {
            reject();
        }

        Logger.log(this);
        return promise;
    }

    async #handleGuildCreate(guild: BasicGuild): Promise<void> {
        this.#cache.addGuild(DiscordGuild.fromBasicGuild(guild));

        await this.#resetSearchCache();
    }

    async #handleChannelCreate({ id }: BasicChannel): Promise<void> {
        const channel = await this.#cache.getFullChannel(id);
        const guild = await this.#cache.getGuild(channel!.guild_id);
        this.#cache.addChannel(DiscordChannel.fromBasicChannel(channel!, guild!));

        await this.#resetSearchCache();
    }

    #queryHandler(query: Query): QueryResponse {
        Logger.log(query);
        if (!this.#discord.ready)
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
            result: this.#getSearchResults(query.searchTerms),
        };
    }

    async #resetSearchCache() {
        this.#searchCache = [];

        const guilds = await this.#cache.getGuilds();

        for (const [_, guild] of guilds) {
            this.#searchCache.push({
                title: guild.name,
                icoPath: guild.icon,
                channelType: null,
            });

            const channels = await this.#cache.getChannels(guild.id);

            for (const [_, channel] of channels!) {
                this.#searchCache.push({
                    title: channel.name,
                    subtitle: guild.name,
                    icoPath: guild.icon,
                    channelType: channel.type,
                });
            }
        }
    }

    *#search(query: string[]): Generator<QueryResult> {
        let filter: string | null = null;

        if (["#", "!", "@"].includes(query[0]?.[0])) {
            filter = query[0][0];
            query[0] = query[0].slice(1);
        }

        for (const result of this.#searchCache) {
            let { title, subtitle, channelType: type } = result;

            if (filter === "#" && type !== ChannelType.GUILD_TEXT) continue;
            if (filter === "!" && type !== ChannelType.GUILD_VOICE) continue;
            if (filter === "@" && type !== ChannelType.DM && type !== ChannelType.GROUP_DM) continue;

            if (
                query.some((q) => title.toLowerCase().includes(q)) ||
                (result.subtitle && query.some((q) => subtitle!.toLowerCase().includes(q)))
            )
                yield result;
        }
    }

    #getSearchResults(query: string[], count: number = 100): QueryResult[] {
        query = query.map((q) => q.trim().toLowerCase()).filter(Boolean);

        return (
            query.length
                ? Array.from(
                      { length: count },
                      function (this: Generator<QueryResult>) {
                          return this.next().value;
                      },
                      this.#search(query)
                  )
                : this.#searchCache.slice(0, count)
        ).filter(Boolean);
    }
}
