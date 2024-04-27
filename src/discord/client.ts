import { randomUUID } from "crypto";
import { EventEmitter } from "stream";
import TypedEventEmitter from "typed-emitter";
import WebSocket from "ws";
import { Logger } from "../logger";
import { AUTH, OAUTH2_CLIENT_ID, ORIGIN, RPCCommands, RPCEvents, Scopes } from "./constants";
import { Command, EventCallback, ICommand, ICommandResponse, IEvent, IPayload } from "./types";

type CustomEventEmitter = new () => TypedEventEmitter<EventCallback> & {
    emit: (event: RPCEvents, ...args: any[]) => boolean;
};

export class DiscordClient extends (EventEmitter as CustomEventEmitter) {
    #socket: WebSocket | null = null;
    #accessToken: string | null;
    connected: boolean = false;
    ready: boolean = false;
    scopes: Scopes[];

    constructor(token: string | null = null, scopes: Scopes[] = []) {
        super();
        this.#accessToken = token;
        this.scopes = scopes;
    }

    async tryConnect(): Promise<void> {
        let tries = 0;

        while (!this.connected) {
            if (tries >= 20) return;

            try {
                await this.#connect(tries);
            } catch (error) {
                Logger.log(error);
                tries++;
                await new Promise((resolve) => setTimeout(resolve, 200));
            }
        }

        if (!this.#accessToken || !(await this.#authenticate())) {
            await this.#authorize();
            await this.#authenticate();
        }

        Logger.log(`Connected and authorized (token: ${this.#accessToken})`);
    }

    async #connect(tries = 0): Promise<void> {
        const port = 6463 + (tries % 10);
        const url = `ws://localhost:${port}/?v=1&client_id=${OAUTH2_CLIENT_ID}`;

        Logger.log(`Connecting to ${url} ...`);

        return new Promise((resolve, reject) => {
            this.#socket = Object.assign(new WebSocket(url, { origin: ORIGIN }), {
                onclose: () => {
                    this.ready = false;
                    this.connected = false;
                    reject("Connection closed");
                },
                onerror: (ev: ErrorEvent) => {
                    Logger.log(ev.message);
                    this.disconnect();
                    reject("Connection error");
                },
                onopen: () => {
                    this.connected = true;
                },
                onmessage: (event: MessageEvent) => {
                    Logger.log(event);
                    this.#handleMessage(event);
                    if (this.ready) resolve();
                },
            });
        });
    }

    disconnect(): void {
        this.#socket?.close();
        this.ready = false;
        this.connected = false;
    }

    send<TCmd extends RPCCommands, TEvt extends RPCEvents | null = null>(
        type: TCmd,
        args: TEvt extends keyof Command
            ? Command[TEvt]
            : TCmd extends keyof Command
            ? Command[TCmd]
            : Record<string, any>,
        event?: TEvt
    ): Promise<ICommandResponse<TCmd>["data"]> {
        return new Promise((resolve, reject) => {
            if (!this.connected || !this.ready) reject("Client is not connected or ready");

            const nonce = randomUUID();

            let command: ICommand<TCmd, TEvt> = {
                cmd: type,
                nonce,
                args,
            };
            if (event) command.evt = event;

            this.#socket!.send(JSON.stringify(command));

            let callback = (event: WebSocket.MessageEvent) => {
                try {
                    let payload: IPayload<TCmd> = JSON.parse(event.toString());

                    if (payload.nonce !== nonce) return;

                    payload.evt !== RPCEvents.Error
                        ? resolve(payload.data as ICommandResponse<TCmd>["data"])
                        : reject(payload.data as IEvent<TCmd, RPCEvents.Error>["data"]);

                    this.#socket!.off("message", callback);
                } catch (error) {
                    reject(error);
                }
            };

            this.#socket!.on("message", callback);
        });
    }

    subscribe<TEvt extends RPCEvents>(
        event: TEvt,
        args: TEvt extends keyof Command ? Command[TEvt] : Record<string, any>
    ): Promise<ICommandResponse<RPCCommands.Subscribe>["data"]> {
        return this.send(RPCCommands.Subscribe, args, event);
    }

    unsubscribe<TEvt extends RPCEvents>(
        event: TEvt,
        args: TEvt extends keyof Command ? Command[TEvt] : Record<string, any>
    ): Promise<ICommandResponse<RPCCommands.Unsubscribe>["data"]> {
        return this.send(RPCCommands.Unsubscribe, args, event);
    }

    #handleMessage(event: MessageEvent): void {
        try {
            let payload: IPayload = JSON.parse(event.data);

            if (payload.cmd === RPCCommands.Dispatch) {
                this.emit(payload.evt!, payload.data);

                if (payload.evt === RPCEvents.Ready) this.ready = true;
            }

            if (payload.evt === RPCEvents.Error) {
                Logger.log(payload.data);
            }
        } catch (error) {
            Logger.log(error);
        }
    }

    async #authorize(): Promise<void> {
        let data = await this.send(RPCCommands.Authorize, {
            client_id: OAUTH2_CLIENT_ID,
            scopes: this.scopes,
        });
        Logger.log(data);

        const headers = { method: "POST", body: JSON.stringify(data) };
        let { access_token } = (await fetch(AUTH, headers).then((res) => res.json())) as { access_token: string };

        this.#accessToken = access_token;
    }

    async #authenticate(): Promise<boolean> {
        try {
            let { user } = await this.send(RPCCommands.Authenticate, {
                access_token: this.#accessToken!,
            });

            Logger.log(`Logged in as ${user.username}`);

            return true;
        } catch {
            return false;
        }
    }
}
