export type RuntimeEnvironment =
  | "development"
  | "test"
  | "staging"
  | "production";

export interface RuntimeConfig {
  nodeEnv: RuntimeEnvironment;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  apiPort: number;
  apiHost: string;
  apiBasePath: string;
  enableJobWorkers: boolean;
  redisUrl?: string;
  redisHost: string;
  redisPort: number;
  redisDb: number;
  redisUsername?: string;
  redisPassword?: string;
  redisHealthcheckEnabled: boolean;
  corsAllowedOrigins: string[];
}

const VALID_NODE_ENVS = new Set<RuntimeEnvironment>([
  "development",
  "test",
  "staging",
  "production",
]);

let cachedRuntimeConfig: RuntimeConfig | null = null;

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === "") {
    return defaultValue;
  }

  return value === "true";
}

function parseInteger(
  value: string | undefined,
  fallback: number,
  fieldName: string,
): number {
  const parsed = Number(value ?? fallback);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }

  return parsed;
}

function normalizeApiBasePath(value: string | undefined): string {
  const normalized = (value ?? "api").replace(/^\/+|\/+$/g, "");

  if (!normalized) {
    throw new Error("API_BASE_PATH must not be empty.");
  }

  return normalized;
}

function validateRuntimeConfig(config: RuntimeConfig) {
  if (!config.databaseUrl.trim()) {
    throw new Error("DATABASE_URL is required.");
  }

  if (!config.jwtSecret.trim()) {
    throw new Error("JWT_SECRET is required.");
  }

  if (
    (config.nodeEnv === "staging" || config.nodeEnv === "production") &&
    (config.jwtSecret === "development-only-secret" ||
      config.jwtSecret.length < 24)
  ) {
    throw new Error(
      "JWT_SECRET must be a strong non-default value in staging and production.",
    );
  }

  if (
    config.enableJobWorkers &&
    !config.redisUrl &&
    !config.redisHost.trim() &&
    !config.redisPort
  ) {
    throw new Error(
      "Redis connection settings are required when ENABLE_JOB_WORKERS=true.",
    );
  }
}

export function loadRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env,
): RuntimeConfig {
  if (env === process.env && cachedRuntimeConfig) {
    return cachedRuntimeConfig;
  }

  const nodeEnv = (env.NODE_ENV ?? "development") as RuntimeEnvironment;

  if (!VALID_NODE_ENVS.has(nodeEnv)) {
    throw new Error(
      `NODE_ENV must be one of: ${Array.from(VALID_NODE_ENVS).join(", ")}.`,
    );
  }

  const hasRedisUrl = Boolean(env.REDIS_URL?.trim());
  const hasRedisHost = Boolean(env.REDIS_HOST?.trim());
  const hasRedisConfig = hasRedisUrl || hasRedisHost;
  const defaultDatabaseUrl =
    nodeEnv === "development" || nodeEnv === "test"
      ? "postgresql://postgres:postgres@localhost:5432/influencer_manager"
      : "";
  const defaultJwtSecret =
    nodeEnv === "development" || nodeEnv === "test"
      ? "development-only-secret"
      : "";

  const config: RuntimeConfig = {
    nodeEnv,
    databaseUrl: env.DATABASE_URL ?? defaultDatabaseUrl,
    jwtSecret: env.JWT_SECRET ?? defaultJwtSecret,
    jwtExpiresIn: env.JWT_EXPIRES_IN ?? "1h",
    apiPort: parseInteger(env.API_PORT, 3000, "API_PORT"),
    apiHost: env.API_HOST ?? "0.0.0.0",
    apiBasePath: normalizeApiBasePath(env.API_BASE_PATH),
    enableJobWorkers: parseBoolean(env.ENABLE_JOB_WORKERS, false),
    redisUrl: env.REDIS_URL,
    redisHost: env.REDIS_HOST ?? "127.0.0.1",
    redisPort: parseInteger(env.REDIS_PORT, 6379, "REDIS_PORT"),
    redisDb: Number(env.REDIS_DB ?? 0),
    redisUsername: env.REDIS_USERNAME || undefined,
    redisPassword: env.REDIS_PASSWORD || undefined,
    redisHealthcheckEnabled: parseBoolean(
      env.REDIS_HEALTHCHECK_ENABLED,
      hasRedisConfig || parseBoolean(env.ENABLE_JOB_WORKERS, false),
    ),
    corsAllowedOrigins: env.CORS_ALLOWED_ORIGINS
      ? env.CORS_ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
      : nodeEnv === "development" || nodeEnv === "test"
        ? ["http://localhost:5173", "http://localhost:3000"]
        : [],
  };

  if (!Number.isInteger(config.redisDb) || config.redisDb < 0) {
    throw new Error("REDIS_DB must be a non-negative integer.");
  }

  validateRuntimeConfig(config);

  if (env === process.env) {
    cachedRuntimeConfig = config;
  }

  return config;
}

export function resetRuntimeConfigForTests() {
  cachedRuntimeConfig = null;
}
