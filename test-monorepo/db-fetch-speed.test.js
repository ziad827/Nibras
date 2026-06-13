const test = require('node:test');
const assert = require('node:assert/strict');

test('request-scoped cache stores values within a run scope', async () => {
  const { requestCacheStorage, getRequestCached, setRequestCached } =
    await import('../apps/api/dist/lib/request-scoped-cache.js');

  await requestCacheStorage.run(new Map(), async () => {
    setRequestCached('demo', { ok: true });
    assert.deepEqual(getRequestCached('demo'), { ok: true });
  });

  assert.equal(getRequestCached('demo'), undefined);
});

test('cacheGetOrSet returns cached values on second call', async () => {
  const { cacheGetOrSet, cacheDel } =
    await import('../apps/api/dist/lib/cache.js');
  const key = `nibras:test:${Date.now()}`;
  let calls = 0;
  const value = await cacheGetOrSet(key, 30, async () => {
    calls += 1;
    return { count: calls };
  });
  assert.equal(value.count, 1);
  const cached = await cacheGetOrSet(key, 30, async () => {
    calls += 1;
    return { count: calls };
  });
  assert.equal(cached.count, 1);
  assert.equal(calls, 1);
  await cacheDel(key);
});

test('cache hit/miss logging is opt-in via NIBRAS_CACHE_LOG', async () => {
  const prev = process.env.NIBRAS_CACHE_LOG;
  process.env.NIBRAS_CACHE_LOG = '1';
  const { cacheGet, cacheSet, cacheDel } =
    await import('../apps/api/dist/lib/cache.js');
  const key = `nibras:log-test:${Date.now()}`;
  await cacheSet(key, '{"ok":true}', 30);
  const hit = await cacheGet(key);
  assert.equal(hit, '{"ok":true}');
  await cacheDel(key);
  process.env.NIBRAS_CACHE_LOG = prev;
});
