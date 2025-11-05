import { config as loadDotEnv } from 'dotenv';

let envLoaded = false;

export type AppConfig = {
  host: string;
  port: number;
  corsOrigin: string | boolean;
  cookieSecure: boolean;
  sessionCookieName: string;
  sessionTTLSeconds: number;
  logLevel: 'info' | 'error' | 'warn' | 'debug';
  databasePath: string;
  storageDir: string;
  jwtSecret: string;
  bootstrapAdmin: BootstrapAdminConfig | null;
};

export type BootstrapAdminConfig = {
  email: string;
  password: string;
  displayName?: string;
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
  const sessionTtl = Number(process.env.SESSION_TTL_SECONDS ?? 60 * 60 * 24 * 7);

  return {
    host: process.env.HOST ?? '0.0.0.0',
    port: Number.isFinite(port) ? port : 4000,
    corsOrigin: process.env.CORS_ORIGIN ?? true,
    cookieSecure: parseBoolean(process.env.COOKIE_SECURE, false),
    sessionCookieName: process.env.SESSION_COOKIE_NAME ?? 'otter_session',
    sessionTTLSeconds: Number.isFinite(sessionTtl) ? sessionTtl : 60 * 60 * 24 * 7,
    logLevel: (process.env.LOG_LEVEL as AppConfig['logLevel']) ?? 'info',
    databasePath: process.env.DATABASE_PATH ?? './data/otter.sqlite',
    storageDir: process.env.STORAGE_DIR ?? './data/audio',
    jwtSecret: process.env.JWT_SECRET ?? 'change-me-super-secret',
    bootstrapAdmin: readBootstrapAdmin()
  };
}

function readBootstrapAdmin(): BootstrapAdminConfig | null {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!email || !password) {
    return null;
  }

  return {
    email,
    password,
    displayName: process.env.BOOTSTRAP_ADMIN_NAME?.trim() || undefined
  };
}
