import { Cache, DiscordChannel, DiscordGuild } from "./cache";
import { DiscordClient } from "./discord/client";
import { ChannelType, DISCORD, RPCCommands, RPCEvents, Scopes } from "./discord/constants";
import { BasicChannel, BasicGuild, Channel, Event, Snowflake } from "./discord/types";
import { FlowClient } from "./flow/client";
import { Methods } from "./flow/constants";
import { CommandResponse, Init, Query, QueryResponse, QueryResult } from "./flow/types";
import { Logger } from "./logger";

export class Plugin {
    #discord: DiscordClient;
    #flow: FlowClient;
    #cache: Cache;
    #cached: boolean = false;
    #searchCache: QueryResult[] = [];

    config: Init | null = null;

    constructor() {
        this.#flow = new FlowClient();
        this.#discord = new DiscordClient(null, [Scopes.RPC]);

        this.#cache = new Cache(this.#discord);
    }

    async run(): Promise<void> {
        this.config = await this.#flow.tryConnect();

        this.#flow.onRequest("query", this.#queryHandler.bind(this));
        this.#flow.onRequest("reconnect", this.#reconnect.bind(this));
        this.#flow.onRequest("switch", this.#switch.bind(this));
        this.#flow.onRequest("filter_guild", this.#filterGuild.bind(this));

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

    async #queryHandler(query: Query): Promise<QueryResponse> {
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

        if (!this.#cached)
            return {
                result: [
                    {
                        title: "Loading data...",
                    },
                ],
            };

        return {
            result: await this.#getSearchResults(query.searchTerms),
        };
    }

    async #resetSearchCache() {
        this.#searchCache = [];

        const guilds = await this.#cache.getGuilds();

        for (const [_, guild] of guilds) {
            this.#searchCache.push({
                title: guild.name,
                icoPath: guild.icon,
                contextData: { ...guild, channels: [] },
                copyText: `${DISCORD}/channels/${guild.id}`,
                jsonRPCAction: {
                    method: "filter_guild",
                    parameters: [guild.id.toString()],
                },
            });

            const channels = await this.#cache.getChannels(guild.id);

            for (const [_, channel] of channels!) {
                this.#searchCache.push({
                    title: `#${channel.name}`,
                    subtitle: guild.name,
                    icoPath: guild.icon,
                    contextData: { ...channel, guild: channel.guild.id },
                    copyText: `${DISCORD}/channels/${guild.id}/${channel.id}`,
                    jsonRPCAction: {
                        method: "switch",
                        parameters: [channel.id.toString(), channel.type.toString()],
                    },
                });
            }
        }

        this.#cached = true;
    }

    static #filterMap: Partial<Record<ChannelType, string>> = {
        [ChannelType.DM]: "@",
        [ChannelType.GROUP_DM]: "@",
        [ChannelType.GUILD_STAGE_VOICE]: "!",
        [ChannelType.GUILD_VOICE]: "!",
    };

    async *#search(query: string[]): AsyncGenerator<QueryResult> {
        let filter: string | null = null;

        if (["#", "!", "@", "*"].includes(query[0]?.[0])) {
            filter = query[0][0];
            query[0] = query[0].slice(1);
        }

        Logger.log(query);
        let guild = Plugin.#getFilter(/guild:(?<id>\d{16,})/i, query)?.groups?.id as Snowflake | undefined;
        Logger.log(query);
        Logger.log(guild);

        const fullQuery = query.filter(Boolean).join(" ");

        for (const result of this.#searchCache) {
            const { title, subtitle, contextData: context } = result;
            const type: ChannelType | null = context.type;
            const isGuild = context.channels && !type;

            if (guild && (isGuild || context.guild !== guild)) continue;
            if (filter && filter !== (isGuild ? "*" : Plugin.#filterMap[type!] ?? "#")) continue;

            if (!fullQuery) {
                yield result;
                continue;
            }

            const matchTitle = await this.#fuzzyMatch(fullQuery, title);
            if (matchTitle.success) {
                yield { ...result, titleHighlightData: matchTitle.matchData!, score: matchTitle.score };
                continue;
            }

            if (!subtitle) continue;

            const matchSubtitle = await this.#fuzzyMatch(fullQuery, subtitle);
            if (matchSubtitle.success) {
                yield { ...result, score: (matchSubtitle.score / 2) | 0 };
            }
        }
    }

    async #getSearchResults(query: string[], count: number = 50): Promise<QueryResult[]> {
        query = query.map((q) => q.trim().toLowerCase()).filter(Boolean);

        if (!query.length) return this.#searchCache.filter((item) => item.contextData.channels);

        const results = [];

        for await (const result of this.#search(query)) {
            results.push(result);
            if (results.length >= count) break;
        }

        return results;
    }

    async #switch(params: [id: Snowflake, channelType: `${ChannelType}`]): Promise<void> {
        const id = params[0];
        const type = Number(params[1]);

        let promise: Promise<Channel> | null =
            type === ChannelType.GUILD_VOICE || type === ChannelType.GUILD_STAGE_VOICE
                ? this.#discord.send(RPCCommands.SelectVoiceChannel, {
                      channel_id: id,
                      force: true,
                      navigate: true,
                  })
                : this.#discord.send(RPCCommands.SelectTextChannel, {
                      channel_id: id,
                  });

        await promise
            ?.then(async () => {
                await this.#flow.request(Methods.HideMainWindow);
            })
            .catch(async (err: Event[RPCEvents.Error]) => {
                await this.#flow.request(Methods.ShowMsgError, { title: "An error occurred", subTitle: err.message });
            });
    }

    async #filterGuild(params: [id: Snowflake]): Promise<void> {
        const id = params[0];
        await this.#flow.request(Methods.ChangeQuery, {
            query: `${this.config?.currentPluginMetadata.actionKeyword} guild:${id}`,
        });
    }

    async #fuzzyMatch(query: string, stringToCompare: string): Promise<CommandResponse[Methods.FuzzySearch]> {
        return await this.#flow.request(Methods.FuzzySearch, { query, stringToCompare });
    }

    static #getFilter(regex: RegExp, query: string[]): RegExpMatchArray | null {
        const filter = query.map(regex.exec.bind(regex));
        const index = filter.findIndex(Boolean);
        if (index === -1) return null;

        query.splice(index, 1);
        return filter[index]!;
    }
}
