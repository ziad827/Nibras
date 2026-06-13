const test = require('node:test');
const assert = require('node:assert/strict');

test('buildVerifySessionUrl encodes session token query param', async () => {
  const { buildVerifySessionUrl } =
    await import('../apps/web/app/lib/web-session-client.js');

  assert.equal(
    buildVerifySessionUrl('web_abc/def'),
    '/api/nibras/verify-session?st=web_abc%2Fdef',
  );
  assert.equal(buildVerifySessionUrl(null), '/api/nibras/verify-session');
  assert.equal(buildVerifySessionUrl(undefined), '/api/nibras/verify-session');
});

test('classifyVerifySessionStatus distinguishes auth vs transport failures', async () => {
  const { classifyVerifySessionStatus } =
    await import('../apps/web/app/lib/web-session-client.js');

  assert.equal(classifyVerifySessionStatus(200), 'authenticated');
  assert.equal(classifyVerifySessionStatus(401), 'unauthenticated');
  assert.equal(classifyVerifySessionStatus(403), 'unauthenticated');
  assert.equal(classifyVerifySessionStatus(503), 'transport');
  assert.equal(classifyVerifySessionStatus(504), 'transport');
});

test('fetchWebSessionViaBff returns unauthenticated on 401', async () => {
  const { fetchWebSessionViaBff } =
    await import('../apps/web/app/lib/web-session-client.js');

  const result = await fetchWebSessionViaBff('web_test', async () =>
    Response.json({ error: 'Invalid or expired session.' }, { status: 401 }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.kind, 'unauthenticated');
  assert.equal(result.status, 401);
});

test('fetchWebSessionViaBff returns transport error on 503', async () => {
  const { fetchWebSessionViaBff } =
    await import('../apps/web/app/lib/web-session-client.js');

  const result = await fetchWebSessionViaBff('web_test', async () =>
    Response.json({ error: 'Service unavailable.' }, { status: 503 }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.kind, 'transport');
  assert.equal(result.status, 503);
  assert.match(result.message, /Service unavailable/);
});

test('fetchWebSessionViaBff persists apiBaseUrl on success', async () => {
  const { fetchWebSessionViaBff, API_BASE_URL_KEY } =
    await import('../apps/web/app/lib/web-session-client.js');

  const storage = new Map();
  const originalWindow = globalThis.window;
  globalThis.window = {
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => {
        storage.set(key, value);
      },
    },
  };

  try {
    const result = await fetchWebSessionViaBff('web_test', async () =>
      Response.json(
        {
          user: {
            id: 'u1',
            username: 'demo',
            email: 'demo@example.com',
            githubLogin: 'demo',
            githubLinked: true,
            githubAppInstalled: false,
          },
          apiBaseUrl: 'https://nibrasplatform.me/',
          memberships: [],
        },
        { status: 200 },
      ),
    );

    assert.equal(result.ok, true);
    assert.equal(storage.get(API_BASE_URL_KEY), 'https://nibrasplatform.me');
  } finally {
    globalThis.window = originalWindow;
  }
});
