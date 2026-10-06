interface ServerConfig {
  port: number;
  env: string;
}

export interface Config {
  server: ServerConfig;
}
