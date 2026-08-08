import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().positive(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  parsed.error.issues.forEach((err) => {
    const path = err.path.join(".");
    console.error(`${path}: ${err.message}`);
  });

  process.exit(1);
}

const env = parsed.data;

type ApiConfig = {
  port: number;
  env: string;
};

type Config = {
  api: ApiConfig;
};

export const config = {
  api: {
    port: env.PORT,
    env: env.NODE_ENV,
  },
} satisfies Config;

// helper functions
export const isDev = () => env.NODE_ENV === "development";
export const isProd = () => env.NODE_ENV === "production";
export const isTest = () => env.NODE_ENV === "test";
