import mongoose from "mongoose";
import { env } from "./config.js";
import { logger } from "./logger.js";

export async function connectDB() {
   
        const dbURI = env.DB_URI;
        await mongoose.connect(dbURI);
        logger.info(`Mongodb connected: ${dbURI}`);
   
}