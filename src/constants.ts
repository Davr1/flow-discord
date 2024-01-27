export const TOKEN_ENDPOINT = "https://streamkit.discord.com/overlay/token";
export const OAUTH2_CLIENT_ID = "207646673902501888";
export const ORIGIN = "https://streamkit.discord.com";
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

export type Commands = {
    [RPCCommands.Authorize]: {
        client_id: Snowflake;
        scopes: string[];
    };
    [RPCCommands.Authenticate]: {
        access_token: string;
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
};

export type Events = {
    [RPCEvents.READY]: {
        config: {
            api_endpoint: string;
            cdn_host: string;
            environment: string;
        };
        user?: BasicUser;
        v: 1;
    };
    [RPCEvents.ERROR]: {
        code: RPCErrors;
        message: string;
    };
};

export enum RPCEvents {
    GUILD_STATUS = "GUILD_STATUS",

    VOICE_STATE_CREATE = "VOICE_STATE_CREATE",
    VOICE_STATE_DELETE = "VOICE_STATE_DELETE",
    VOICE_STATE_UPDATE = "VOICE_STATE_UPDATE",
    SPEAKING_START = "SPEAKING_START",
    SPEAKING_STOP = "SPEAKING_STOP",

    MESSAGE_CREATE = "MESSAGE_CREATE",
    MESSAGE_UPDATE = "MESSAGE_UPDATE",
    MESSAGE_DELETE = "MESSAGE_DELETE",

    READY = "READY",
    ERROR = "ERROR",
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

export enum ChannelTypes {
    DM = 1,
    GROUP_DM = 3,
    GUILD_TEXT = 0,
    GUILD_VOICE = 2,
}
