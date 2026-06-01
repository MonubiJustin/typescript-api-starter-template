import { app } from "./app.js"
import { env } from "./config/config.js";
import { connectDB } from "./config/db.js";

const PORT = env.PORT;

async function start() {
    await connectDB();

    app.listen(PORT, () => console.log(`API running on port: ${PORT}`))
}

start();
