import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";

import { config } from "../config/env.js";

const endpoint = config.telemetry.otlpEndpoint.replace(/\/$/, "");

// OpenTelemetry's own diagnostics are useful while wiring instrumentation up,
// but they are far too noisy to ship to production logs.
if (config.server.env !== "production") {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
}

const sdk = config.telemetry.enabled
  ? new NodeSDK({
      resource: resourceFromAttributes({
        "deployment.environment.name": config.server.env,
        "service.name": config.telemetry.serviceName,
        "service.version": config.telemetry.serviceVersion,
      }),
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
    })
  : undefined;

export function initializeObservability() {
  sdk?.start();
}

export async function shutdownObservability() {
  await sdk?.shutdown();
}

initializeObservability();
