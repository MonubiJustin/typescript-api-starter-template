import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { config, isProd } from "../config/env";

const queryClient = postgres(config.db.url);

// You can specify any property from the node-postgres connection options
const db = drizzle({
  client: queryClient,
  connection: {
    ssl: isProd,
  },
});

export default db;
