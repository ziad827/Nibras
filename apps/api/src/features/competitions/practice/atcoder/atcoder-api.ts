const KENKOOOO_BASE = 'https://kenkoooo.com/atcoder';

type AtCoderSubmission = {
  problem_id: string;
  result: string;
};

const statusCache = new Map<
  string,
  { map: Map<string, { solved: boolean }>; expiresAt: number }
>();
const CACHE_TTL_MS = 10 * 60 * 1000;

export async function getAtCoderUserStatus(
  handle: string,
): Promise<Map<string, { solved: boolean }>> {
  const key = handle.trim().toLowerCase();
  const cached = statusCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.map;
  }

  const res = await fetch(
    `${KENKOOOO_BASE}/atcoder-api/v3/user/submissions?user=${encodeURIComponent(handle)}&from_second=0`,
  );
  if (!res.ok) {
    throw new Error(`AtCoder API ${res.status}`);
  }

  const subs = (await res.json()) as AtCoderSubmission[];
  const map = new Map<string, { solved: boolean }>();
  for (const sub of subs) {
    if (sub.result === 'AC') {
      map.set(sub.problem_id, { solved: true });
    }
  }

  statusCache.set(key, { map, expiresAt: Date.now() + CACHE_TTL_MS });
  return map;
}

export function clearAtCoderStatusCacheForTests(): void {
  statusCache.clear();
}
