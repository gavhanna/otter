import { config as loadDotEnv } from 'dotenv';

let envLoaded = false;

export type AppConfig = {
  host: string;
  port: number;
  corsOrigin: string | boolean;
  cookieSecure: boolean;
  logLevel: 'info' | 'error' | 'warn' | 'debug';
  databasePath: string;
  storageDir: string;
};

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

export function loadConfig(): AppConfig {
  if (!envLoaded) {
    loadDotEnv();
    envLoaded = true;
  }

  const port = Number(process.env.PORT ?? '4000');

  return {
    host: process.env.HOST ?? '0.0.0.0',
    port: Number.isFinite(port) ? port : 4000,
    corsOrigin: process.env.CORS_ORIGIN ?? true,
    cookieSecure: parseBoolean(process.env.COOKIE_SECURE, false),
    logLevel: (process.env.LOG_LEVEL as AppConfig['logLevel']) ?? 'info',
    databasePath: process.env.DATABASE_PATH ?? './data/otter.sqlite',
    storageDir: process.env.STORAGE_DIR ?? './data/audio'
  };
}
