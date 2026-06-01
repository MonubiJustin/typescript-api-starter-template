import mongoose from "mongoose";
import { env } from "./config.js";

export async function connectDB() {
    try {
        const dbURI = env.DB_URI;
        await mongoose.connect(dbURI);
        console.log("Mongodb connected: ", dbURI);
    } catch (err) {
        console.error("MongoDB connection failed, ", err);
    }
}