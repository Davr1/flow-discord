import { ChannelType, RPCCommands, RPCEvents, RPCErrors } from "./constants";

export type Snowflake = `${number}` | number;

export interface User {
    id: Snowflake;
    username: string;
    avatar: string | null;
    discriminator: string;

    public_flags: number;
    premium_type: number;
    flags: number;
    banner: string | null;
    accent_color: number | null;
    global_name: string;
    avatar_decoration_data: string | null;
    banner_color: string;
}

export type BasicUser = Pick<User, "id" | "username" | "avatar" | "discriminator">;

export interface Application {
    description: string;
    icon: string;
    id: Snowflake;
    rpc_origins: string[];
    name: string;
}

export interface Guild {
    id: Snowflake;
    name: string;
    icon_url: string;

    members: never[];
    vanity_url_code: string | null;
}

export type BasicGuild = Pick<Guild, "id" | "name" | "icon_url">;

export interface Channel {
    id: Snowflake;
    name: string;
    type: ChannelType;

    guild_id: Snowflake;
    topic: string;
    position: number;
    bitrate: number;
    user_limit: number;
    messages: Message[];
    voice_states: [];
}

export interface Message {
    id: Snowflake;
    blocked: boolean;
    content: string;
    content_parsed: any[];
    author_color: string;
    edited_timestamp: string | null;
    timestamp: string;
    tts: boolean;
    mentions: any[];
    mention_roles: any[];
    mention_everyone: boolean;
    embeds: any[];
    attachments: any[];
    type: number;
    pinned: boolean;
    author: User;
}

export type BasicChannel = Pick<Channel, "id" | "name" | "type">;

export type Command = {
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

    [RPCEvents.GuildStatus]: {
        guild_id: Snowflake;
    };
    [RPCEvents.MessageCreate]: {
        channel_id: Snowflake;
    };
    [RPCEvents.MessageUpdate]: {
        channel_id: Snowflake;
    };
    [RPCEvents.MessageDelete]: {
        channel_id: Snowflake;
    };
};

export type CommandResponse = {
    [RPCCommands.Authorize]: {
        code: string;
    };
    [RPCCommands.Authenticate]: {
        application: Application;
        expires: string;
        user: User;
        scopes: string[];
    };
    [RPCCommands.GetGuilds]: {
        guilds: BasicGuild[];
    };
    [RPCCommands.GetGuild]: Guild;
    [RPCCommands.GetChannels]: { channels: BasicChannel[] };
    [RPCCommands.GetChannel]: Channel;
    [RPCCommands.Subscribe]: {
        evt: RPCEvents;
    };
    [RPCCommands.Unsubscribe]: {
        evt: RPCEvents;
    };
};

export type Event = {
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
    [RPCEvents.GuildStatus]: {
        guild: BasicGuild;
        online: number;
    };
    [RPCEvents.GuildCreate]: BasicGuild;
    [RPCEvents.ChannelCreate]: BasicChannel;
    [RPCEvents.MessageCreate]: {
        channel_id: Snowflake;
        message: Message;
    };
    [RPCEvents.MessageUpdate]: {
        channel_id: Snowflake;
        message: Message;
    };
    [RPCEvents.MessageDelete]: {
        channel_id: Snowflake;
        message: Message;
    };
};

export interface IPayload<TCmd extends RPCCommands = RPCCommands, TEvt extends RPCEvents | null = RPCEvents> {
    cmd: TCmd;
    nonce?: string | null;
    evt?: TEvt;
    data?: Record<string, any> | null;
    args?: Record<string, any>;
}

export interface ICommand<TCmd extends RPCCommands, TEvt extends RPCEvents | null = null> extends IPayload<TCmd, TEvt> {
    nonce: string;
    args: TEvt extends keyof Command ? Command[TEvt] : TCmd extends keyof Command ? Command[TCmd] : Record<string, any>;
}

export interface ICommandResponse<TCmd extends RPCCommands> extends IPayload<TCmd, null> {
    nonce: string;
    data: TCmd extends keyof CommandResponse ? CommandResponse[TCmd] : null;
}

export interface IEvent<TCmd extends RPCCommands, TEvt extends RPCEvents | null> extends IPayload<TCmd, TEvt> {
    cmd: TCmd;
    evt: TEvt;
    data: TEvt extends keyof Event ? Event[TEvt] : null;
}

export type EventCallback = {
    [K in RPCEvents]: (event: IEvent<RPCCommands.Dispatch, K>) => void;
};
