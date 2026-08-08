import type { Request, Response } from "express";
import pino from "pino";
import { isProd, isTest} from "./config.js";

export const logger = pino({
    level: isProd() ? "info" : isTest() ? "silent" : "debug",

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

export const pinoHttpOptions = {
    logger,

    customSuccessMessage(req: Request, res: Response) {
      return `${req.method} ${req.url} ${res.statusCode}`;
    },

    serializers: {
      req() {
        return undefined;
      },

      res() {
        return undefined;
      },
    },
  }
