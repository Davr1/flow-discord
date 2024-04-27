export const OAUTH2_CLIENT_ID = "207646673902501888";
export const ORIGIN = "https://streamkit.discord.com";
export const AUTH = `${ORIGIN}/overlay/token`;

export enum RPCCommands {
    Dispatch = "DISPATCH",

    Authorize = "AUTHORIZE",
    Authenticate = "AUTHENTICATE",

    GetGuild = "GET_GUILD",
    GetGuilds = "GET_GUILDS",
    GetChannel = "GET_CHANNEL",
    GetChannels = "GET_CHANNELS",

    Subscribe = "SUBSCRIBE",
    Unsubscribe = "UNSUBSCRIBE",
}

export enum RPCEvents {
    Ready = "READY",
    Error = "ERROR",

    GuildStatus = "GUILD_STATUS",
    GuildCreate = "GUILD_CREATE",
    ChannelCreate = "CHANNEL_CREATE",

    MessageCreate = "MESSAGE_CREATE",
    MessageUpdate = "MESSAGE_UPDATE",
    MessageDelete = "MESSAGE_DELETE",
}

export enum RPCErrors {
    UNKNOWN_ERROR = 1000,

    INVALID_PAYLOAD = 4000,
    INVALID_VERSION = 4001,
    INVALID_COMMAND = 4002,
    INVALID_GUILD = 4003,
    INVALID_EVENT = 4004,
    INVALID_CHANNEL = 4005,
    INVALID_PERMISSIONS = 4006,
    INVALID_CLIENTID = 4007,
    INVALID_ORIGIN = 4008,
    INVALID_TOKEN = 4009,
    INVALID_USER = 4010,

    OAUTH2_ERROR = 5000,
}

export enum ChannelType {
    GUILD_TEXT = 0,
    DM = 1,
    GUILD_VOICE = 2,
    GROUP_DM = 3,
}

export enum Scopes {
    RPC = "rpc",
    IDENTIFY = "identify",
    RPC_NOTIFICATIONS_READ = "rpc.notifications.read",
    MESSAGES_READ = "messages.read",
    DM_CHANNELS_READ = "dm_channels.read",
}
