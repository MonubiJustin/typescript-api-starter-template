import { z } from "zod";

import type { Config } from "./env.types";

const booleanFromString = z
  .enum(["false", "true"])
  .default("true")
  .transform((value) => value === "true");

const otlpHeaders = z
  .string()
  .default("")
  .refine(
    (value) =>
      value === "" ||
      value.split(",").every((header) => {
        const separator = header.indexOf("=");
        return separator > 0 && header.slice(separator + 1).length > 0;
      }),
    "must be comma-separated key=value pairs",
  )
  .transform((value) =>
    Object.fromEntries(
      value
        ? value.split(",").map((header) => {
            const separator = header.indexOf("=");
            return [header.slice(0, separator), header.slice(separator + 1)];
          })
        : [],
    ),
  );

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().positive(),
  OTEL_ENABLED: booleanFromString,
  OTEL_SERVICE_NAME: z.string().min(1).default("node-api"),
  OTEL_SERVICE_VERSION: z.string().min(1).default("1.0.0"),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.url().default("http://localhost:4318"),
  OTEL_EXPORTER_OTLP_HEADERS: otlpHeaders,
  OTEL_METRIC_EXPORT_INTERVAL: z.coerce.number().int().positive().default(60_000),
  DATABASE_URL: z.string().startsWith("postgres://"),
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

export const config = {
  server: {
    port: env.PORT,
    env: env.NODE_ENV,
  },
  telemetry: {
    enabled: env.OTEL_ENABLED,
    serviceName: env.OTEL_SERVICE_NAME,
    serviceVersion: env.OTEL_SERVICE_VERSION,
    otlpEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
    otlpHeaders: env.OTEL_EXPORTER_OTLP_HEADERS,
    metricExportInterval: env.OTEL_METRIC_EXPORT_INTERVAL,
  },
  db: {
    url: env.DATABASE_URL,
  },
} satisfies Config;

// helper functions
export const isDev = env.NODE_ENV === "development";
export const isProd = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
