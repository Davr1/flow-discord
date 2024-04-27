import { DiscordClient } from "./discord/client";
import { RPCCommands } from "./discord/constants";
import { BasicChannel, BasicGuild, Channel, Snowflake } from "./discord/types";
import { Logger } from "./logger";

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export class Cache {
    #client: DiscordClient;
    #guildCache: Map<Snowflake, DiscordGuild> | null = null;

    constructor(client: DiscordClient) {
        this.#client = client;
    }

    async getGuilds(withChannels: boolean = true): Promise<Map<Snowflake, DiscordGuild>> {
        if (!this.#guildCache) {
            this.#guildCache = new Map();

            await this.#client
                .send(RPCCommands.GetGuilds, {})
                .then(({ guilds }) => guilds.map(DiscordGuild.fromBasicGuild))
                .then(async (guilds) => {
                    for (const guild of guilds) {
                        await this.addGuild(guild, withChannels);
                        await wait(500);
                    }
                })
                .catch(Logger.log);
        }

        return this.#guildCache!;
    }

    async getGuild(id: Snowflake, withChannels: boolean = true): Promise<DiscordGuild | null> {
        const guild = await this.getGuilds().then((guilds) => guilds.get(id));

        if (!guild) {
            await this.#client
                .send(RPCCommands.GetGuild, { guild_id: id })
                .then(DiscordGuild.fromBasicGuild)
                .then((guild) => this.addGuild(guild, withChannels))
                .catch(Logger.log);
        }

        return guild ?? null;
    }

    async addGuild(guild: DiscordGuild, withChannels: boolean = true): Promise<void> {
        await this.getGuilds().then((guilds) => guilds.set(guild.id, guild));

        if (withChannels) await this.getChannels(guild.id);
    }

    async getChannels(guildId: Snowflake): Promise<Map<Snowflake, DiscordChannel> | null> {
        const guild = await this.getGuild(guildId);
        if (!guild) return null;

        if (!guild.channels || guild.channels.size === 0) {
            await this.#client
                .send(RPCCommands.GetChannels, { guild_id: guildId })
                .then(({ channels }) => channels.map((channel) => DiscordChannel.fromBasicChannel(channel, guild)))
                .then((channels) => channels.forEach((channel) => this.addChannel(channel)))
                .catch(Logger.log);
        }

        return guild.channels;
    }

    async getFullChannel(channelId: Snowflake, guildId?: Snowflake): Promise<Channel | null> {
        let fullChannel: Channel | null = null;
        await this.#client
            .send(RPCCommands.GetChannel, { channel_id: channelId })
            .then(async (channel) => {
                fullChannel = channel;
                const guild = await this.getGuild(guildId ?? channel.guild_id);
                this.addChannel(DiscordChannel.fromBasicChannel(channel, guild!));
            })
            .catch(Logger.log);

        return fullChannel;
    }

    async getChannel(channelId: Snowflake, guildId?: Snowflake): Promise<DiscordChannel | null> {
        if (guildId) {
            const guild = await this.getGuild(guildId);

            if (!guild) return null;

            const channel = await this.getChannels(guildId).then((channels) => channels?.get(channelId));

            if (!channel) {
                await this.#client
                    .send(RPCCommands.GetChannel, { channel_id: channelId })
                    .then((channel) => this.addChannel(DiscordChannel.fromBasicChannel(channel, guild)))
                    .catch(Logger.log);
            }
        }

        const guilds = await this.getGuilds();
        for (const guild of guilds.values()) {
            const channel = guild.channels?.get(channelId);
            if (channel) return channel;
        }

        return null;
    }

    async addChannel(channel: DiscordChannel, guildId?: Snowflake): Promise<void> {
        let guild: DiscordGuild | null = channel.guild;

        if (!channel.guild) {
            guildId ??= await this.getFullChannel(channel.id).then((channel) => channel?.guild_id);
            if (!guildId) return;

            guild = await this.getGuild(guildId);
        }

        if (!guild) return;

        guild.channels ??= new Map();
        guild.channels.set(channel.id, new DiscordChannel(channel.id, channel.name, channel.type, guild));
    }
}

export class DiscordGuild {
    id: Snowflake;
    name: string;
    icon: string | null;
    channels: Map<Snowflake, DiscordChannel> | null = null;

    static fromBasicGuild(guild: BasicGuild): DiscordGuild {
        return new DiscordGuild(guild.id, guild.name, guild.icon_url);
    }

    constructor(
        id: Snowflake,
        name: string,
        icon: string | null = null,
        channels: Map<Snowflake, DiscordChannel> | null = null
    ) {
        this.id = id;
        this.name = name;
        this.icon = icon;
        this.channels = channels;
    }
}

export class DiscordChannel {
    id: Snowflake;
    name: string;
    type: number;
    guild: DiscordGuild;

    static fromBasicChannel(channel: BasicChannel, guild: DiscordGuild): DiscordChannel {
        return new DiscordChannel(channel.id, channel.name, channel.type, guild);
    }

    constructor(id: Snowflake, name: string, type: number, guild: DiscordGuild) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.guild = guild;
    }
}
