import { app } from "./app.js"
import { env } from "./config/config.js";

const PORT = env.PORT;
app.listen(PORT, () => console.log(`API running on port: ${PORT}`))