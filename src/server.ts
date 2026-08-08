import { app } from "./app.js";
import { config } from "./config/config.js";
import { logger } from "./config/logger.js";

process.on("uncaughtException", (error) => {
  logger.fatal(error, "Uncaught Exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.fatal(reason, "Unhandled Rejection");
  process.exit(1);
});

const PORT = config.api.port;

function start() {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

start();
