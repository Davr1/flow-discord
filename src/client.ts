import { OAUTH2_CLIENT_ID, RPCCommands, RPCEvents, ORIGIN, AUTH, RPCErrors } from "./constants";
import { randomUUID } from "crypto";
import WebSocket from "ws";
import { Commands, ICommand, ICommandResponse, IEvent, IPayload } from "./types";

class DiscordClient {
    private socket: WebSocket | null = null;
    private accessToken: string | null;
    connected: boolean = false;
    ready: boolean = false;

    constructor(token: string | null = null) {
        this.accessToken = token;
    }

    async tryConnect(): Promise<void> {
        let tries = 0;

        while (!this.connected) {
            if (tries >= 20) return;

            try {
                await this.connect(tries);
            } catch (error) {
                console.log(error);
                tries++;
                await new Promise((resolve) => setTimeout(resolve, 200));
            }
        }

        if (!this.accessToken || !(await this.authenticate())) {
            await this.authorize();
            await this.authenticate();
        }

        //console.log(this.accessToken);
        console.log("Connected and authorized");
    }

    private async connect(tries = 0): Promise<void> {
        const port = 6463 + (tries % 10);
        const url = `ws://localhost:${port}/?v=1&client_id=${OAUTH2_CLIENT_ID}`;

        console.log(`Connecting to ${url} ...`);

        return new Promise((resolve, reject) => {
            this.socket = Object.assign(new WebSocket(url, { origin: ORIGIN }), {
                onclose: () => {
                    this.ready = false;
                    this.connected = false;
                    reject("Connection closed");
                },
                onerror: (ev: ErrorEvent) => {
                    console.log(ev.message);
                    this.disconnect();
                    reject("Connection error");
                },
                onopen: () => {
                    this.connected = true;
                },
                onmessage: (event: MessageEvent) => {
                    this.handleMessage(event);
                    if (this.ready) resolve();
                },
            });
        });
    }

    disconnect(): void {
        this.socket?.close();
        this.ready = false;
        this.connected = false;
    }

    send<T extends RPCCommands>(
        type: T,
        args: T extends keyof Commands ? Commands[T] : {}
    ): Promise<ICommandResponse<T>> {
        return new Promise((resolve, reject) => {
            if (!this.connected || !this.ready) reject("Client is not connected or ready");

            const nonce = randomUUID();
            const command: ICommand<T> = {
                cmd: type,
                nonce,
                args,
            };

            this.socket!.send(JSON.stringify(command));

            let callback = (event: WebSocket.MessageEvent) => {
                try {
                    let data: IPayload<T> = JSON.parse(event.data.toString());

                    if (data.nonce === nonce) {
                        data.evt !== RPCEvents.Error
                            ? resolve(data as ICommandResponse<T>)
                            : reject(data as IEvent<T, RPCEvents.Error>);

                        this.socket!.removeEventListener("message", callback);
                    }
                } catch (error) {
                    reject(error);
                }
            };

            this.socket!.addEventListener("message", callback);
        });
    }

    private handleMessage(event: MessageEvent): void {
        try {
            const { cmd, evt, data }: IPayload = JSON.parse(event.data);

            if (cmd === RPCCommands.Dispatch && evt === RPCEvents.Ready) {
                this.ready = true;
            }

            if (evt === RPCEvents.Error) {
                console.log(data);
            }
        } catch (error) {
            console.log(error);
        }
    }

    private async authorize(): Promise<void> {
        let { data } = await this.send(RPCCommands.Authorize, {
            client_id: OAUTH2_CLIENT_ID,
            scopes: ["rpc"],
        });

        const headers = { method: "POST", body: JSON.stringify(data) };
        let { access_token } = (await fetch(AUTH, headers).then((res) => res.json())) as { access_token: string };

        this.accessToken = access_token;
    }

    private async authenticate(): Promise<boolean> {
        try {
            let { data } = await this.send(RPCCommands.Authenticate, {
                access_token: this.accessToken!,
            });

            console.log(`Logged in as ${data.user.username}`);

            return true;
        } catch {
            return false;
        }
    }
}

export const client = new DiscordClient();

client.tryConnect();
