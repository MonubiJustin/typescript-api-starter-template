/*instrumentation.ts*/
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";

import { config } from "../config/env.js";

if (config.telemetry.enabled) {
  const endpoint = config.telemetry.otlpEndpoint.replace(/\/$/, "");

  const sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({
      headers: config.telemetry.otlpHeaders,
      url: `${endpoint}/v1/traces`,
    }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        headers: config.telemetry.otlpHeaders,
        url: `${endpoint}/v1/metrics`,
      }),
      exportIntervalMillis: config.telemetry.metricExportInterval,
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();
}
