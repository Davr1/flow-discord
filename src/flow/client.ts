import {
    MessageConnection,
    StreamMessageReader,
    StreamMessageWriter,
    createMessageConnection,
} from "vscode-jsonrpc/node";
import { Command, CommandResponse, Init, Query, QueryResult } from "./types";
import { Methods } from "./constants";

type QueryHandler = (query: Query) => {
    result: QueryResult[];
};

export class FlowClient {
    private queryHandler: QueryHandler;
    private reader: StreamMessageReader;
    private writer: StreamMessageWriter;
    connection: MessageConnection | null = null;
    connected: boolean = false;
    ready: boolean = false;

    constructor(queryHandler: QueryHandler) {
        this.queryHandler = queryHandler;

        this.reader = new StreamMessageReader(process.stdin);
        this.writer = new StreamMessageWriter(process.stdout);
    }

    async tryConnect(): Promise<void> {
        if (!this.connected) {
            await this.connect();
        }

        console.log("Connected");
    }

    private async connect(): Promise<Init> {
        const { promise, resolve, reject } = Promise.withResolvers<Init>();

        this.connection = createMessageConnection(this.reader, this.writer);

        this.connection.onClose(() => {
            this.ready = false;
            this.connected = false;
            reject("Connection closed");
        });
        this.connection.onError((error) => {
            console.log(error[0]);
            this.disconnect();
            reject("Connection error");
        });
        this.connection.onRequest("initialize", (config: Init) => {
            this.ready = true;
            resolve(config);
        });
        this.connection.onRequest("query", this.queryHandler);

        this.connection.listen();
        this.connected = true;

        return promise;
    }

    disconnect(): void {
        if (this.connection) {
            this.connection.dispose();
            this.connection = null;
        }
        this.ready = false;
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
}
