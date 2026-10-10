interface ServerConfig {
  port: number;
  env: string;
}

interface TelemetryConfig {
  enabled: boolean;
  serviceName: string;
  serviceVersion: string;
  otlpEndpoint: string;
  otlpHeaders: Record<string, string>;
  metricExportInterval: number;
}

interface DatabaseConfig {
  url: string;
}

export interface Config {
  server: ServerConfig;
  telemetry: TelemetryConfig;
  db: DatabaseConfig;
}
