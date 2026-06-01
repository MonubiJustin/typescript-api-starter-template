import pino from "pino";
import { isProd} from "./config.js";

export const logger = pino({
    level: isProd() ? "info" : "debug",

    transport: !isProd() ? {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname"
        }
    }
        : undefined
});