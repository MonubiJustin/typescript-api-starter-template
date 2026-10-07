# OpenTelemetry + New Relic instrumentation guide

This guide explains how to plan and implement production-grade observability for this Bun/TypeScript API. It is intentionally a guide rather than a copy-and-paste setup. Use the current OpenTelemetry and New Relic documentation for exact package versions, commands, APIs, and deployment values.

## Target outcome

The service should provide:

- **Traces** for inbound HTTP requests and important outbound calls.
- **Metrics** for request rate, latency, errors, runtime health, and selected business signals.
- **Logs** correlated with traces where the logging pipeline supports it.
- **Consistent resource metadata** so services and environments are easy to identify in New Relic.
- **Safe production behavior** with bounded overhead, no secrets or personal data in telemetry, graceful shutdown, and clear export failures.

OpenTelemetry should remain the instrumentation and telemetry standard. New Relic should be treated as the backend where telemetry is stored, queried, visualized, and alerted on. Keeping these concerns separate makes a future backend or collector change easier.

## 0. Confirm runtime compatibility first

**Importance: critical.** This repository runs on **Bun**, while many JavaScript observability examples target Node.js. Do not assume that the New Relic Node.js agent, Node-only auto-instrumentation packages, or every OpenTelemetry exporter behaves identically under Bun.

Before implementing:

1. Check current OpenTelemetry JavaScript support for Bun, including the SDK, context manager, propagators, instrumentations, and exporters you plan to use.
2. Check New Relic’s current guidance for receiving OpenTelemetry data from a Bun application. Prefer the OTLP path when a vendor-specific Node agent is not supported.
3. Build a small proof of concept that emits one trace and one metric from the actual production runtime.
4. Record unsupported libraries and plan manual instrumentation for those boundaries.

If a required component is not supported, decide explicitly whether to run the service on a supported Node.js runtime or use only the OpenTelemetry components confirmed to work under Bun.

## 1. Establish the telemetry contract

**Importance: high.** Dashboards, alerts, and queries will depend on names and attributes, so define these before adding instrumentation throughout the application.

Decide and document:

- `service.name` for this API.
- `service.version`, normally based on the release or package version.
- `deployment.environment.name`, such as `development`, `staging`, or `production`.
- Region, cluster, namespace, instance, and Git commit attributes where they are stable and useful.
- Which routes, jobs, dependencies, and business operations deserve custom spans or metrics.
- Sampling, retention, and data-classification expectations for each environment.

Use OpenTelemetry semantic conventions wherever they apply. Avoid inventing attributes when an official convention already exists.

## 2. Add validated configuration without committing secrets

**Importance: high.** Telemetry configuration differs by environment, and an exposed ingest key can permit unauthorized data submission.

Extend the existing environment validation in `src/config/env.ts` and `src/config/env.types.ts` with the settings required by the chosen exporter. Typical settings include:

- A telemetry enabled/disabled switch.
- Service name and service version.
- Deployment environment.
- OTLP protocol and endpoint.
- New Relic region-specific endpoint, where applicable.
- New Relic ingest credential supplied by the deployment secret manager.
- Trace sampling policy and rate.
- Optional metric export interval, queue size, and timeout values.

Keep credentials, authorization headers, private collector URLs, customer identifiers, and real request payloads out of Git. Add only safe placeholder names to `.env.example`; inject production values through the deployment platform or a secret manager.

This repository currently validates these baseline variables:

```dotenv
OTEL_ENABLED=true
OTEL_SERVICE_NAME=mpaps-api
OTEL_SERVICE_VERSION=1.0.0
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp.nr-data.net:4318
OTEL_EXPORTER_OTLP_HEADERS=api-key=<new-relic-license-key>
OTEL_METRIC_EXPORT_INTERVAL=60000
```

Use `https://otlp.eu01.nr-data.net:4318` for New Relic's EU endpoint when
applicable. Keep the license key in deployment secrets, not in `.env.example`
or committed files. The endpoint and header are passed to the OTLP/HTTP trace
and metric exporters; New Relic delivery is not considered verified until data
is visible in the target account.

## 3. Create an observability boundary

**Importance: high.** A dedicated boundary keeps initialization, provider-specific configuration, shutdown, testing, and future backend changes manageable.

The current structure can evolve toward:

```text
src/
  config/
    env.ts
    env.types.ts
    logger.ts
  observability/
    index.ts              # public lifecycle API
    instrumentation.ts    # SDK, resources, propagators, instrumentations
    exporters.ts          # OTLP/New Relic exporter wiring
    metrics.ts            # application meters and metric helpers
    tracing.ts            # custom span helpers and attribute policy
    redaction.ts          # telemetry and log sanitization rules
  middleware/
  modules/
  app.ts
  server.ts
```

These names are suggestions. The important rule is to keep New Relic endpoints, headers, and exporter details inside `observability/` rather than spreading vendor-specific code through feature modules.

## 4. Initialize before importing instrumented dependencies

**Importance: critical.** Automatic instrumentation often patches modules when they are loaded. If Express, a database client, or an HTTP client is imported before OpenTelemetry starts, spans may be missing or incomplete.

Choose one startup pattern and verify it with Bun:

- a dedicated instrumentation entry point loaded before the application entry point; or
- an explicit initialization function called before importing or constructing `app`.

The conceptual startup order is:

1. Load and validate configuration.
2. Create the OpenTelemetry resource and provider.
3. Configure context propagation and instrumentations.
4. Register OTLP exporters and metric readers.
5. Start the logger and application.
6. Begin accepting traffic.

Initialize the SDK only once per process. Pay particular attention to tests, workers, and development reloads so providers are not registered repeatedly.

## 5. Instrument the HTTP request lifecycle

**Importance: high.** HTTP server spans are the foundation for request latency, error rate, dependency traces, and trace/log correlation.

For this Express application:

- Use the current OpenTelemetry HTTP and Express instrumentation guidance that is compatible with Bun.
- Prefer route templates over raw URLs to keep span names and attributes low-cardinality.
- Capture method, status code, duration, and error status using current semantic conventions.
- Verify that errors handled by `src/middleware/error-handler.ts` are represented correctly.
- Decide whether `/health` should be excluded or sampled separately so it does not dominate trace volume.

Test successful and failing requests. Confirm that one inbound request produces one coherent server span rather than duplicate spans from overlapping instrumentations.

## 6. Instrument dependencies and important application operations

**Importance: high.** An inbound span without its database, cache, queue, or outbound HTTP children cannot explain where latency and failures originate.

For each dependency, follow its current OpenTelemetry instrumentation documentation and verify Bun support. Add manual spans where automatic instrumentation is unavailable or insufficient.

Prioritize:

- database queries and connection failures;
- outbound HTTP calls;
- cache and queue operations;
- authentication and authorization boundaries;
- expensive or business-critical operations in `src/modules/`;
- background jobs and scheduled work, if introduced.

Keep span names and attributes bounded. Never use raw email addresses, tokens, full request bodies, SQL values, or arbitrary user input as span names or metric labels.

## 7. Define useful, bounded metrics

**Importance: high.** Metrics are efficient for alerting, but high-cardinality labels can create cost and performance problems.

Start with:

- request count by route, method, and status class;
- request duration as a histogram;
- active requests;
- dependency error count and duration;
- runtime/process health metrics supported by the selected Bun-compatible SDK;
- a small number of business outcome counters.

Use stable dimensions such as route template, operation, dependency name, and environment. Do not use request IDs, user IDs, arbitrary URLs, exception messages, or unbounded error text as metric labels.

For every production metric, define its unit, owner, expected range, and alert threshold.

## 8. Correlate Pino logs with traces

**Importance: high.** Traces show the request path while logs provide event details. Correlation lets operators move from a failing span to the relevant log records.

The existing logger is in `src/config/logger.ts` and uses Pino. Decide whether to:

- inject the active trace ID and span ID into structured log records; or
- use a supported logging integration that performs the injection.

Preserve structured JSON output in production and keep `pino-pretty` for local development only.

Use one redaction policy for logs and telemetry. Review authorization headers, cookies, access tokens, passwords, payment data, request bodies, and personal identifiers. Redact before export rather than relying only on New Relic query filters.

Avoid enabling multiple independent log exporters unless there is a deliberate reason; duplicate logs increase cost and complicate incident analysis.

## 9. Configure OTLP delivery to New Relic

**Importance: critical.** Instrumentation produces no useful observability if the exporter, endpoint, protocol, region, or credential is wrong.

Use the current New Relic documentation to select:

- OTLP/HTTP or OTLP/gRPC;
- the correct New Relic region endpoint;
- authentication header format;
- TLS requirements;
- supported traces, metrics, and logs ingestion paths;
- whether a collector or gateway is required.

For production, consider an OpenTelemetry Collector when you need centralized retry, filtering, tail sampling, routing, or multiple destinations. Direct application-to-New-Relic export is simpler but couples every process to exporter and network behavior.

Configure batching, queue limits, retry behavior, and timeouts. Export must not block request handling indefinitely or prevent shutdown. If New Relic is unavailable, the API should normally remain available while exporters report failures and discard telemetry according to bounded limits.

## 10. Handle errors and graceful shutdown

**Importance: critical.** Processes often lose the final spans and metrics when they exit without flushing exporters.

Integrate observability shutdown with the lifecycle in `src/server.ts`:

- handle `SIGTERM` and `SIGINT`;
- stop accepting new requests;
- allow in-flight requests a bounded drain period;
- flush and shut down tracer providers and metric readers;
- close server and dependency connections;
- exit with the correct status;
- log exporter and shutdown failures instead of silently swallowing them.

Review this alongside the existing `uncaughtException` and `unhandledRejection` handlers. Fatal errors should still terminate the process after best-effort final telemetry.

## 11. Verify locally before production

**Importance: high.** Observability failures are commonly startup-order or deployment-configuration failures that a type check cannot detect.

Follow the official examples for exact commands, then verify:

1. The service starts with telemetry disabled and enabled.
2. A request creates a trace with the expected service and environment attributes.
3. A failing request records an error and correct status.
4. Outbound dependency spans appear as children of the request span.
5. Logs contain trace correlation fields without sensitive data.
6. Metrics arrive with expected names, units, and bounded attributes.
7. The app remains responsive when the telemetry endpoint is slow or unavailable.
8. Shutdown flushes telemetry within the deployment grace period.
9. Tests do not leak providers between cases or send test data to production New Relic.
10. The built artifact and actual Bun production command use the same instrumentation startup path as development.

Use a disposable New Relic service/environment or a local OpenTelemetry Collector for validation. Confirm data in New Relic, not only in application logs.

## 12. Operate instrumentation as a production feature

**Importance: high.** Instrumentation has its own cost, failure modes, and maintenance requirements.

Before rollout:

- use lower sampling for high-volume production traffic while preserving error traces;
- document expected telemetry volume and cost;
- create dashboards for traffic, latency, errors, dependency health, saturation, and runtime health;
- alert on user-impacting symptoms, not exporter noise alone;
- monitor dropped spans, queue saturation, export latency, and authentication failures;
- review sensitive-data and retention requirements;
- pin compatible package versions and update them deliberately;
- document how to reduce or disable telemetry during an incident.

Roll out gradually, compare overhead and telemetry volume with a baseline, and keep service names stable across deployments.

## Repository-specific implementation checklist

- [ ] Confirm Bun compatibility for every selected OpenTelemetry component.
- [ ] Add validated telemetry configuration to `src/config/env.ts` and `src/config/env.types.ts`.
- [ ] Add an `src/observability/` boundary for SDK lifecycle, exporters, metrics, tracing, and redaction.
- [ ] Load instrumentation before `src/app.ts` and other instrumented dependencies.
- [ ] Configure resource attributes and a sampling strategy.
- [ ] Instrument Express, outbound HTTP, databases, queues, and important module operations.
- [ ] Correlate Pino logs with active trace and span IDs.
- [ ] Configure the New Relic OTLP endpoint, region, and secret through deployment configuration.
- [ ] Add graceful shutdown and bounded exporter behavior to `src/server.ts`.
- [ ] Update `.env.example` with placeholders only.
- [ ] Verify traces, metrics, logs, error handling, shutdown, and exporter outage behavior.
- [ ] Add New Relic dashboards, alerts, ownership, and a telemetry runbook.

## Official documentation starting points

Use the current versions of these documents for exact installation commands and APIs:

- [OpenTelemetry JavaScript documentation](https://opentelemetry.io/docs/languages/js/)
- [OpenTelemetry JavaScript Node.js getting started guide](https://opentelemetry.io/docs/languages/js/getting-started/nodejs/)
- [OpenTelemetry JavaScript instrumentation guide](https://opentelemetry.io/docs/languages/js/instrumentation/)
- [OpenTelemetry semantic conventions](https://opentelemetry.io/docs/specs/semconv/)
- [OpenTelemetry Collector documentation](https://opentelemetry.io/docs/collector/)
- [New Relic OpenTelemetry documentation](https://docs.newrelic.com/docs/opentelemetry/)
- [New Relic OTLP endpoint and authentication guidance](https://docs.newrelic.com/docs/opentelemetry/otlp/otlp-endpoint-configuration/)

Runtime support, package APIs, and New Relic endpoints can change. Treat official documentation as authoritative and keep this file focused on this repository’s decisions and implementation order.
