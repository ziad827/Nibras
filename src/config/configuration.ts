export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  swaggerPath: string;
}

export interface MongoConfig {
  uri: string;
  maxPoolSize: number;
  serverSelectionTimeoutMs: number;
  retryAttempts: number;
  retryDelayMs: number;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  ttlSeconds: number;
}

export interface AuthConfig {
  secret: string;
  webBaseUrl: string;
  githubClientId?: string;
  githubClientSecret?: string;
  resendApiKey?: string;
  emailFrom: string;
  sessionTtlDays: number;
  magicLinkTtlSeconds: number;
  apiBaseUrl: string;
}

export interface NibrasConfig {
  app: AppConfig;
  mongo: MongoConfig;
  redis: RedisConfig;
  auth: AuthConfig;
}

export const configuration = (): NibrasConfig => ({
  app: {
    nodeEnv: (process.env.NODE_ENV as AppConfig['nodeEnv']) ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    swaggerPath: process.env.SWAGGER_PATH ?? 'api/docs',
  },
  mongo: {
    uri: process.env.MONGO_URI ?? 'mongodb://localhost:27017/nibras',
    maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE ?? '10', 10),
    serverSelectionTimeoutMs: parseInt(
      process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS ?? '5000',
      10,
    ),
    retryAttempts: parseInt(process.env.MONGO_RETRY_ATTEMPTS ?? '5', 10),
    retryDelayMs: parseInt(process.env.MONGO_RETRY_DELAY_MS ?? '3000', 10),
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD,
    ttlSeconds: parseInt(process.env.REDIS_TTL_SECONDS ?? '60', 10),
  },
  auth: {
    secret:
      process.env.AUTH_SECRET ??
      (process.env.NODE_ENV === 'production' ? '' : 'nibras-dev-auth-secret'),
    webBaseUrl: process.env.WEB_BASE_URL ?? 'http://localhost:3000',
    githubClientId: process.env.GITHUB_APP_CLIENT_ID,
    githubClientSecret: process.env.GITHUB_APP_CLIENT_SECRET,
    resendApiKey: process.env.RESEND_API_KEY,
    emailFrom: process.env.NIBRAS_EMAIL_FROM ?? 'Nibras <noreply@nibras.dev>',
    sessionTtlDays: parseInt(process.env.SESSION_TTL_DAYS ?? '30', 10),
    magicLinkTtlSeconds: parseInt(
      process.env.MAGIC_LINK_TTL_SECONDS ?? '300',
      10,
    ),
    apiBaseUrl:
      process.env.API_BASE_URL ??
      `http://localhost:${process.env.PORT ?? '3000'}`,
  },
});
