import { ChannelType, RPCCommands, RPCEvents, RPCErrors } from "./constants";

export type Snowflake = `${number}` | number;

export interface User {
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

export interface Guild {
    id: Snowflake;
    name: string;
    icon_url: string;

    members: never[];
    vanity_url_code: string | null;
}

export interface Channel {
    id: Snowflake;
    name: string;
    type: ChannelType;

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
        user: User;
        scopes: string[];
    };
    [RPCCommands.GetGuilds]: {
        guilds: Pick<Guild, "id" | "name" | "icon_url">[];
    };
    [RPCCommands.GetGuild]: Guild;
    [RPCCommands.GetChannels]: { channels: Pick<Channel, "id" | "name" | "type">[] };
    [RPCCommands.GetChannel]: Channel;
};

export type Events = {
    [RPCEvents.Ready]: {
        config: {
            api_endpoint: string;
            cdn_host: string;
            environment: string;
        };
        user?: User;
        v: 1;
    };
    [RPCEvents.Error]: {
        code: RPCErrors;
        message: string;
    };
};

export interface IPayload<T extends RPCCommands = RPCCommands, R extends RPCEvents | null = RPCEvents> {
    cmd: T;
    nonce?: string | null;
    evt?: R;
    data?: Record<string, any> | null;
    args?: Record<string, any>;
}

export interface ICommand<T extends RPCCommands> extends IPayload<T, null> {
    nonce: string;
    args: T extends keyof Commands ? Commands[T] : Record<string, any>;
}

export interface ICommandResponse<T extends RPCCommands> extends IPayload<T, null> {
    nonce: string;
    data: T extends keyof CommandResponses ? CommandResponses[T] : null;
}

export interface IEvent<T extends RPCCommands, R extends RPCEvents | null> extends IPayload<T, R> {
    cmd: T;
    nonce: string;
    evt: R;
    data: R extends keyof Events ? Events[R] : null;
}
