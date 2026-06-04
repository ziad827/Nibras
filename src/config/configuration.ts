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

export interface ExecutorConfig {
  enabled: boolean;
  maxConcurrent: number;
  defaultMemoryMb: number;
  defaultTimeMs: number;
  defaultDiskMb: number;
}

export interface MossConfig {
  userId?: string;
}

export interface CompetitionsConfig {
  syncEnabled: boolean;
  contestSyncCron: string;
  problemSyncCron: string;
  accountStatsSyncCron: string;
  rankingCalcCron: string;
  contestReminderCron: string;
  postContestCron: string;
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
  competitions: CompetitionsConfig;
  executor: ExecutorConfig;
  moss: MossConfig;
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
  executor: {
    enabled: process.env.EXECUTOR_ENABLED === 'true',
    maxConcurrent: parseInt(process.env.EXECUTOR_MAX_CONCURRENT ?? '4', 10),
    defaultMemoryMb: parseInt(
      process.env.EXECUTOR_DEFAULT_MEMORY_MB ?? '256',
      10,
    ),
    defaultTimeMs: parseInt(process.env.EXECUTOR_DEFAULT_TIME_MS ?? '5000', 10),
    defaultDiskMb: parseInt(process.env.EXECUTOR_DEFAULT_DISK_MB ?? '50', 10),
  },
  moss: {
    userId: process.env.MOSS_USER_ID,
  },
  competitions: {
    syncEnabled: process.env.COMPETITIONS_SYNC_ENABLED !== 'false',
    contestSyncCron: process.env.CONTEST_SYNC_CRON ?? '*/15 * * * *',
    problemSyncCron: process.env.PROBLEM_SYNC_CRON ?? '0 */6 * * *',
    accountStatsSyncCron: process.env.ACCOUNT_STATS_SYNC_CRON ?? '0 */6 * * *',
    rankingCalcCron: process.env.RANKING_CALC_CRON ?? '*/30 * * * *',
    contestReminderCron: process.env.CONTEST_REMINDER_CRON ?? '* * * * *',
    postContestCron: process.env.POST_CONTEST_CRON ?? '*/10 * * * *',
  },
});
