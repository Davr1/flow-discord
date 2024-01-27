export const TOKEN_ENDPOINT = "https://streamkit.discord.com/overlay/token";
export const OAUTH2_CLIENT_ID = "207646673902501888";
export const ORIGIN = "https://streamkit.discord.com";
export const AUTH = "https://streamkit.discord.com/overlay/token";
import { IEvent } from "./main.js";

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

export type Snowflake = `${number}` | number;
export interface BasicUser {
    id: Snowflake;
    username: string;
    avatar: string | null;
    discriminator: string;
}
export interface Application {
    description: string;
    icon: string;
    id: Snowflake;
    rpc_origins: string[];
    name: string;
}
export interface BasicGuild {
    id: Snowflake;
    name: string;
    icon_url: string;
}
export interface Guild extends BasicGuild {
    members: never[];
    vanity_url_code: string | null;
}
export interface BasicChannel {
    id: Snowflake;
    name: string;
    type: ChannelType;
}
export interface Channel extends BasicChannel {
    guild_id: Snowflake;
    topic: string;
    position: number;
    bitrate: number;
    user_limit: number;
    messages: [];
    voice_states: [];
}
export type Commands = {
    [RPCCommands.Authorize]: {
        client_id: Snowflake;
        scopes: string[];
    };
    [RPCCommands.Authenticate]: {
        access_token: string;
    };
    [RPCCommands.GetGuild]: {
        guild_id: Snowflake;
        timeout?: number;
    };
    [RPCCommands.GetChannels]: {
        guild_id: Snowflake;
    };
    [RPCCommands.GetChannel]: {
        channel_id: Snowflake;
    };
};
export type CommandResponses = {
    [RPCCommands.Authorize]: {
        code: string;
    };
    [RPCCommands.Authenticate]: {
        application: Application;
        expires: string;
        user: BasicUser;
        scopes: string[];
    };
    [RPCCommands.GetGuilds]: {
        guilds: BasicGuild[];
    };
    [RPCCommands.GetGuild]: Guild;
    [RPCCommands.GetChannels]: { channels: BasicChannel[] };
    [RPCCommands.GetChannel]: Channel;
};

export type Events = {
    [RPCEvents.Ready]: {
        config: {
            api_endpoint: string;
            cdn_host: string;
            environment: string;
        };
        user?: BasicUser;
        v: 1;
    };
    [RPCEvents.Error]: {
        code: RPCErrors;
        message: string;
    };
};

export enum RPCEvents {
    Ready = "READY",
    Error = "ERROR",
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
    DM = 1,
    GROUP_DM = 3,
    GUILD_TEXT = 0,
    GUILD_VOICE = 2,
}
