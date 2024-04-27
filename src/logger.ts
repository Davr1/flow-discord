import { appendFileSync } from "fs";

const logFile: string = "latest.log";

export class Logger {
    static log(value: any) {
        appendFileSync(logFile, JSON.stringify(value) + "\n");
    }
}
