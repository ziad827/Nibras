const test = require('node:test');
const assert = require('node:assert/strict');

test('resolveServerApiBaseUrls includes local API for non-Azure dev', async () => {
  const { resolveServerApiBaseUrls } =
    await import('../apps/web/lib/api-internal-url.ts');

  const env = saveEnv([
    'NIBRAS_API_INTERNAL_URL',
    'NIBRAS_API_BASE_URL',
    'CONTAINER_APP_NAME',
  ]);
  delete process.env.CONTAINER_APP_NAME;
  delete process.env.NIBRAS_API_INTERNAL_URL;
  process.env.NIBRAS_API_BASE_URL = 'https://nibrasplatform.me';

  try {
    const urls = resolveServerApiBaseUrls('https://nibrasplatform.me');
    assert.equal(urls[0], 'http://127.0.0.1:4848');
    assert.ok(urls.includes('http://nibras-api:8080'));
    assert.ok(urls.includes('http://api:4848'));
  } finally {
    restoreEnv(env);
  }
});

function saveEnv(keys) {
  const snapshot = {};
  for (const key of keys) {
    snapshot[key] = process.env[key];
  }
  return snapshot;
}

function restoreEnv(snapshot) {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
