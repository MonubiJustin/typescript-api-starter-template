import express, { type Request, type Response } from "express";
import {pinoHttp} from "pino-http";

import { logger } from "./config/logger.js";
import { notFound } from "./middleware/not-found.js";
import { errorHandler } from "./middleware/error-handler.js";
import { HttpStatus } from "./utils/http-status.js";

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
    res.status(HttpStatus.OK).json({
        success: true,
        message: "API running successfully"
    })
})

app.use(notFound);
app.use(errorHandler);

export { app };