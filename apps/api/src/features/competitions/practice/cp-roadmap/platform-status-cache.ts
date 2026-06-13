import { getUserCfData } from '../codeforces/cf-api';
import { getLcUserStatus } from '../leetcode/lc-api';
import { getAtCoderUserStatus } from '../atcoder/atcoder-api';

type PlatformMaps = {
  cfStatus: Map<string, { solved: boolean }>;
  lcStatus: Map<string, { solved: boolean }>;
  atcoderStatus: Map<string, { solved: boolean }>;
};

type CacheEntry = {
  maps: PlatformMaps;
  expiresAt: number;
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function cacheKey(
  cfHandle: string | undefined,
  lcHandle: string | undefined,
  atcoderHandle: string | undefined,
): string {
  return [cfHandle ?? '', lcHandle ?? '', atcoderHandle ?? ''].join('|');
}

export function getCachedPlatformStatus(
  cfHandle: string | undefined,
  lcHandle: string | undefined,
  atcoderHandle: string | undefined,
): PlatformMaps | null {
  const entry = cache.get(cacheKey(cfHandle, lcHandle, atcoderHandle));
  if (!entry || Date.now() >= entry.expiresAt) return null;
  return entry.maps;
}

export function setCachedPlatformStatus(
  cfHandle: string | undefined,
  lcHandle: string | undefined,
  atcoderHandle: string | undefined,
  maps: PlatformMaps,
): void {
  cache.set(cacheKey(cfHandle, lcHandle, atcoderHandle), {
    maps,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export async function loadCachedPlatformStatus(
  cfHandle: string | undefined,
  lcHandle: string | undefined,
  atcoderHandle: string | undefined,
): Promise<PlatformMaps> {
  const cached = getCachedPlatformStatus(cfHandle, lcHandle, atcoderHandle);
  if (cached) return cached;

  const [cfData, lcData, atcoderData] = await Promise.all([
    cfHandle
      ? getUserCfData(cfHandle)
      : Promise.resolve({ statusMap: new Map() }),
    lcHandle ? getLcUserStatus(lcHandle) : Promise.resolve(new Map()),
    atcoderHandle
      ? getAtCoderUserStatus(atcoderHandle)
      : Promise.resolve(new Map()),
  ]);

  const cfStatus = new Map<string, { solved: boolean }>();
  for (const [key, value] of cfData.statusMap.entries()) {
    cfStatus.set(key, { solved: value.solved });
  }

  const lcStatus = new Map<string, { solved: boolean }>();
  for (const [key, value] of lcData.entries()) {
    lcStatus.set(key, { solved: value.solved });
  }

  const atcoderStatus = new Map<string, { solved: boolean }>();
  for (const [key, value] of atcoderData.entries()) {
    atcoderStatus.set(key, { solved: value.solved });
  }

  const maps = { cfStatus, lcStatus, atcoderStatus };
  setCachedPlatformStatus(cfHandle, lcHandle, atcoderHandle, maps);
  return maps;
}

export function clearPlatformStatusCacheForTests(): void {
  cache.clear();
}
