import {
    MessageConnection,
    StreamMessageReader,
    StreamMessageWriter,
    createMessageConnection,
} from "vscode-jsonrpc/node";
import { Logger } from "../logger";
import { Methods } from "./constants";
import { Command, CommandResponse, Init } from "./types";

export class FlowClient {
    private reader: StreamMessageReader;
    private writer: StreamMessageWriter;
    config: Init | null = null;
    connection: MessageConnection | null = null;
    connected: boolean = false;
    get ready(): boolean {
        return Boolean(this.config);
    }

    constructor() {
        this.reader = new StreamMessageReader(process.stdin);
        this.writer = new StreamMessageWriter(process.stdout);
    }

    async tryConnect(): Promise<Init> {
        if (!this.connected) {
            await this.connect();
        }

        Logger.log("Connected");
        return this.config!;
    }

    private async connect(): Promise<Init> {
        const { promise, resolve, reject } = Promise.withResolvers<Init>();

        this.connection = createMessageConnection(this.reader, this.writer);

        this.connection.onClose(() => {
            this.connected = false;
            this.config = null;
            reject("Connection closed");
        });
        this.connection.onError((error) => {
            Logger.log(error);
            this.disconnect();
            reject("Connection error");
        });
        this.connection.onRequest("initialize", (config: Init) => {
            Logger.log(config);
            this.config = config;
            resolve(config);
        });

        this.connection.listen();
        this.connected = true;

        return promise;
    }

    disconnect(): void {
        if (this.connection) {
            this.connection.dispose();
            this.connection = null;
        }
        this.config = null;
        this.connected = false;
    }

    async request<T extends Methods>(
        method: T,
        ...args: T extends keyof Command ? [params: Command[T]] : []
    ): Promise<T extends keyof CommandResponse ? CommandResponse[T] : {}> {
        return new Promise(async (resolve, reject) => {
            if (!this.connected || !this.ready) reject("Client is not connected or ready");

            await this.connection!.sendRequest<T extends keyof CommandResponse ? CommandResponse[T] : {}>(
                method,
                ...args
            )
                .then(resolve)
                .catch(reject);
        });
    }

    onRequest<T, R>(method: string, handler: (params: T) => R): void {
        if (!this.connected || !this.ready) throw new Error("Client is not connected or ready");

        this.connection!.onRequest(method, handler);
    }
}
