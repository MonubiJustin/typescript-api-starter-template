import express, { type Request, type Response } from "express";
import {pinoHttp} from "pino-http";

import { logger } from "./config/logger.js";

const app = express();

const pinoHttpOptions = {
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

app.use(
  pinoHttp(pinoHttpOptions)
);


app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: "API running successfully"
    })
})


export { app };