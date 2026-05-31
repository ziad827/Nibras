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

export interface NibrasConfig {
  app: AppConfig;
  mongo: MongoConfig;
  redis: RedisConfig;
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
});
