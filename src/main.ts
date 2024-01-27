import open from "open";
import { Flow, JSONRPCResponse } from "flow-launcher-helper";
import { RequestManager, HTTPTransport, Client } from "@open-rpc/client-js";
import {
    OAUTH2_CLIENT_ID,
    RPCCommands,
    RPCEvents,
    ORIGIN,
    Commands,
    Events,
    CommandResponses,
    Snowflake,
} from "./constants";
import { randomUUID } from "crypto";
import WebSocket from "ws";

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

// The events are the custom events that you define in the flow.on() method.
/*type Methods = "query" | "search";

const flow = new Flow<Methods>("assets/npm.png");

flow.on("query", (params) => {


	const [query] = params;

	const url = `https://www.npmjs.com/search?${query}`;

	flow.showResult({
		title: `Search NPM packagexe: ${query}`,
		subtitle: url,
		method: "search",
		params: [url],
		dontHideAfterAction: true,
	});

	//flow.copyToClipboard({ text: JSON.stringify(params) });
});

flow.on("search", () => {
	open("https://google.com");
});

flow.run();
*/

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
    evt: R;
    data: R extends keyof Events ? Events[R] : null;
}

class DiscordClient {
    private socket: WebSocket | null = null;
    connected: boolean = false;
    ready: boolean = false;

    constructor() {}

    async tryConnect(): Promise<void> {
        let tries = 0;

        while (!this.connected && tries < 20) {
            try {
                await this.connect(tries);
            } catch (error) {
                console.log(error);
                tries++;
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        }
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
                    console.log("Connected");
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
                    const data: ICommandResponse<T> = JSON.parse(event.data.toString());

                    if (data.nonce === nonce) {
                        resolve(data);
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

            if (cmd === RPCCommands.Dispatch && evt === RPCEvents.READY) {
                this.ready = true;
            }

            if (evt === RPCEvents.ERROR) {
                console.log(data);
                this.disconnect();
            }
        } catch (error) {
            console.log(error);
        }
    }
}

console.log(11111111111111);

(async () => {
    let client = new DiscordClient();
    await client.tryConnect();

    let response = await client.send(RPCCommands.Authorize, {
        client_id: OAUTH2_CLIENT_ID as Snowflake,
        scopes: ["rpc"],
    });

    console.log(response);
})();
