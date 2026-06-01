import { app } from "./app.js";
import { env } from "./config/config.js";
import { connectDB } from "./config/db.js";
import { logger } from "./config/logger.js";

process.on("uncaughtException", (error) => {
  logger.fatal(error, "Uncaught Exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.fatal(reason, "Unhandled Rejection");
  process.exit(1);
});

const PORT = env.PORT;

async function start() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.fatal(error, "Application startup failed");
    process.exit(1);
  }
}


start();