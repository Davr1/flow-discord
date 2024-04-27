import { appendFileSync } from "fs";
import { StreamMessageReader } from "vscode-jsonrpc/node";

const logFile: string = "latest.log";

export class Logger {
    static log(value: any) {
        appendFileSync(logFile, JSON.stringify(value) + "\n");
    }
}

var a = new StreamMessageReader(process.stdin);
a.listen((x) => {
    appendFileSync("stdin.txt", JSON.stringify(x) + "\n");
});
