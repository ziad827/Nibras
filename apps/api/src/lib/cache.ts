/**
 * Read-through cache backed by Redis (ioredis via BullMQ) when REDIS_URL is set,
 * otherwise in-memory LRU.
 */
import Redis from 'ioredis';

const DEFAULT_TTL_SECONDS = 60;
const MEMORY_MAX_ENTRIES = 500;

type MemoryEntry = { value: string; expiresAt: number };

const memoryCache = new Map<string, MemoryEntry>();

let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    redisClient.on('error', () => {
      // Redis optional — fall back to memory cache
    });
  }
  return redisClient;
}

function memoryGet(key: string): string | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

function memorySet(key: string, value: string, ttlSeconds: number): void {
  if (memoryCache.size >= MEMORY_MAX_ENTRIES) {
    const oldest = memoryCache.keys().next().value;
    if (oldest) memoryCache.delete(oldest);
  }
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

function memoryDel(key: string): void {
  memoryCache.delete(key);
}

function memoryDelPattern(pattern: string): void {
  const prefix = pattern.endsWith('*') ? pattern.slice(0, -1) : pattern;
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
}

async function redisGet(key: string): Promise<string | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  try {
    if (redis.status !== 'ready') {
      await redis.connect().catch(() => null);
    }
    if (redis.status !== 'ready') return null;
    return await redis.get(key);
  } catch {
    return null;
  }
}

async function redisSet(
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;
  try {
    if (redis.status !== 'ready') {
      await redis.connect().catch(() => null);
    }
    if (redis.status !== 'ready') return false;
    await redis.set(key, value, 'EX', ttlSeconds);
    return true;
  } catch {
    return false;
  }
}

async function redisDel(key: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    if (redis.status === 'ready') {
      await redis.del(key);
    }
  } catch {
    // ignore
  }
}

async function redisDelPattern(pattern: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    if (redis.status !== 'ready') {
      await redis.connect().catch(() => null);
    }
    if (redis.status !== 'ready') return;
    const prefix = pattern.endsWith('*') ? pattern.slice(0, -1) : pattern;
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        'MATCH',
        `${prefix}*`,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  } catch {
    // ignore
  }
}

function logCacheEvent(
  event: 'hit' | 'miss' | 'set' | 'del',
  key: string,
): void {
  if (process.env.NIBRAS_CACHE_LOG !== '1') return;
  console.log(JSON.stringify({ level: 'debug', msg: 'cache', event, key }));
}

export async function cacheGet(key: string): Promise<string | null> {
  const fromRedis = await redisGet(key);
  if (fromRedis !== null) {
    logCacheEvent('hit', key);
    return fromRedis;
  }
  const fromMemory = memoryGet(key);
  if (fromMemory !== null) {
    logCacheEvent('hit', key);
    return fromMemory;
  }
  logCacheEvent('miss', key);
  return null;
}

export async function cacheSet(
  key: string,
  value: string,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<void> {
  const stored = await redisSet(key, value, ttlSeconds);
  if (!stored) {
    memorySet(key, value, ttlSeconds);
  }
  logCacheEvent('set', key);
}

export async function cacheDel(key: string): Promise<void> {
  await redisDel(key);
  memoryDel(key);
  logCacheEvent('del', key);
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  await redisDelPattern(pattern);
  memoryDelPattern(pattern);
}

export async function cacheGetOrSet<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  const cached = await cacheGet(key);
  if (cached !== null) {
    try {
      return JSON.parse(cached) as T;
    } catch {
      await cacheDel(key);
    }
  }
  const value = await fn();
  await cacheSet(key, JSON.stringify(value), ttlSeconds);
  return value;
}

export async function invalidateUserDashboardCache(
  userId: string,
): Promise<void> {
  await cacheDelPattern(`nibras:dashboard:home:${userId}:`);
}

export async function invalidateUserProgramPlanCache(
  userId: string,
): Promise<void> {
  await cacheDel(`nibras:program:plan:${userId}`);
}

export async function invalidateProgramBundleCache(
  versionId: string,
): Promise<void> {
  await cacheDel(`nibras:program:bundle:${versionId}`);
}

export async function invalidateUserGamificationCache(
  userId: string,
): Promise<void> {
  await cacheDel(`nibras:gamification:metrics:${userId}`);
}

export async function invalidateLeaderboardCache(): Promise<void> {
  await cacheDelPattern('nibras:leaderboard:');
}

export async function invalidateUserMembershipCache(
  userId: string,
): Promise<void> {
  await cacheDel(`nibras:memberships:${userId}`);
}

export async function disconnectCache(): Promise<void> {
  if (redisClient) {
    await redisClient.quit().catch(() => undefined);
    redisClient = null;
  }
}
