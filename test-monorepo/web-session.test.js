const test = require('node:test');
const assert = require('node:assert/strict');

test('getConfiguredApiBaseUrl does not recurse through shouldIgnoreStoredApiBaseUrl', async () => {
  const prevPublic = process.env.NEXT_PUBLIC_NIBRAS_API_BASE_URL;
  process.env.NEXT_PUBLIC_NIBRAS_API_BASE_URL = 'https://nibrasplatform.me';

  const { getConfiguredApiBaseUrl, shouldIgnoreStoredApiBaseUrl } =
    await import('../apps/web/app/lib/session.ts');

  try {
    assert.doesNotThrow(() => {
      getConfiguredApiBaseUrl();
      shouldIgnoreStoredApiBaseUrl(
        'https://nibras-api.example.azurecontainerapps.io',
      );
    });
  } finally {
    if (prevPublic === undefined)
      delete process.env.NEXT_PUBLIC_NIBRAS_API_BASE_URL;
    else process.env.NEXT_PUBLIC_NIBRAS_API_BASE_URL = prevPublic;
  }
});

test('web session discovery prefers a reachable same-origin API', async () => {
  const { discoverApiBaseUrlWith } =
    await import('../apps/web/app/lib/session-core.js');
  const attempted = [];
  const stored = [];

  const apiBaseUrl = await discoverApiBaseUrlWith({
    pageOrigin: 'https://nibras.example',
    storedApiBaseUrl: 'https://api.example',
    configuredApiBaseUrl: 'https://fallback.example',
    probe: async (candidate) => {
      attempted.push(candidate);
      return candidate === 'https://nibras.example';
    },
    persistApiBaseUrl: async (candidate) => {
      stored.push(candidate);
    },
  });

  assert.equal(apiBaseUrl, 'https://nibras.example');
  assert.deepEqual(attempted, ['https://nibras.example']);
  assert.deepEqual(stored, ['https://nibras.example']);
});

test('web session discovery falls back to the stored local API when same-origin is unreachable', async () => {
  const { discoverApiBaseUrlWith } =
    await import('../apps/web/app/lib/session-core.js');
  const attempted = [];

  const apiBaseUrl = await discoverApiBaseUrlWith({
    pageOrigin: 'http://127.0.0.1:3000',
    storedApiBaseUrl: 'http://127.0.0.1:4848',
    configuredApiBaseUrl: 'https://stale.example',
    probe: async (candidate) => {
      attempted.push(candidate);
      return candidate === 'http://127.0.0.1:4848';
    },
  });

  assert.equal(apiBaseUrl, 'http://127.0.0.1:4848');
  assert.deepEqual(attempted, [
    'http://127.0.0.1:3000',
    'http://127.0.0.1:4848',
  ]);
});

test('web session discovery ignores loopback storage on a public HTTPS origin', async () => {
  const { discoverApiBaseUrlWith } =
    await import('../apps/web/app/lib/session-core.js');
  const attempted = [];

  const apiBaseUrl = await discoverApiBaseUrlWith({
    pageOrigin: 'https://nibras.example',
    storedApiBaseUrl: 'http://127.0.0.1:4848',
    configuredApiBaseUrl: 'https://api.example',
    probe: async (candidate) => {
      attempted.push(candidate);
      return candidate === 'https://api.example';
    },
  });

  assert.equal(apiBaseUrl, 'https://api.example');
  assert.deepEqual(attempted, [
    'https://nibras.example',
    'https://api.example',
  ]);
});

test('web session discovery surfaces actionable guidance when no API base is reachable', async () => {
  const { discoverApiBaseUrlWith } =
    await import('../apps/web/app/lib/session-core.js');

  await assert.rejects(
    () =>
      discoverApiBaseUrlWith({
        pageOrigin: 'https://nibras.example',
        storedApiBaseUrl: 'https://api.example',
        configuredApiBaseUrl: 'https://fallback.example',
        probe: async () => false,
      }),
    (error) => {
      assert.match(error.message, /Unable to reach the Nibras API/);
      assert.match(
        error.message,
        /https:\/\/nibras\.example, https:\/\/api\.example, https:\/\/fallback\.example/,
      );
      assert.match(error.message, /npm run api:dev/);
      assert.match(error.message, /npm run proxy:dev/);
      assert.match(error.message, /update `.env` and your tunnel URL/);
      return true;
    },
  );
});

test('web apiFetch returns non-OK responses for callers to handle', async () => {
  const { apiFetchWith } = await import('../apps/web/app/lib/session-core.js');

  const response = await apiFetchWith({
    path: '/v1/me',
    auth: true,
    accessToken: 'token',
    discoverApiBaseUrl: async () => 'https://api.example',
    fetchImpl: async () =>
      new Response(JSON.stringify({ error: 'GitHub App is not configured.' }), {
        status: 503,
        headers: {
          'content-type': 'application/json',
        },
      }),
  });

  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.error, 'GitHub App is not configured.');
});

test('web session discovery skips timed-out candidates and tries the next one', async () => {
  const { discoverApiBaseUrlWith } =
    await import('../apps/web/app/lib/session-core.js');
  const attempted = [];

  const apiBaseUrl = await discoverApiBaseUrlWith({
    pageOrigin: 'https://nibras.example',
    storedApiBaseUrl: null,
    configuredApiBaseUrl: 'https://api.example',
    probe: async (candidate) => {
      attempted.push(candidate);
      if (candidate === 'https://api.example') {
        throw new DOMException('The operation was aborted.', 'TimeoutError');
      }
      return candidate === 'https://nibras.example';
    },
  });

  assert.equal(apiBaseUrl, 'https://nibras.example');
  assert.deepEqual(attempted, [
    'https://api.example',
    'https://nibras.example',
  ]);
});

test('web session discovery prefers same-origin proxy when build URL matches web origin', async () => {
  const { discoverApiBaseUrlWith } =
    await import('../apps/web/app/lib/session-core.js');
  const attempted = [];

  const apiBaseUrl = await discoverApiBaseUrlWith({
    pageOrigin: 'https://nibrasplatform.me',
    storedApiBaseUrl: 'https://nibras-api.example.azurecontainerapps.io',
    configuredApiBaseUrl: 'https://nibrasplatform.me',
    probe: async (candidate) => {
      attempted.push(candidate);
      return candidate === 'https://nibrasplatform.me';
    },
  });

  assert.equal(apiBaseUrl, 'https://nibrasplatform.me');
  assert.deepEqual(attempted, []);
});

test('web session discovery in dev mode only probes same-origin and loopback hosts', async () => {
  const { discoverApiBaseUrlWith } =
    await import('../apps/web/app/lib/session-core.js');
  const attempted = [];
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';

  try {
    const apiBaseUrl = await discoverApiBaseUrlWith({
      pageOrigin: 'http://127.0.0.1:3000',
      storedApiBaseUrl: 'https://nibrasplatform.me',
      configuredApiBaseUrl: 'https://nibrasplatform.me',
      probe: async (candidate) => {
        attempted.push(candidate);
        return candidate === 'http://127.0.0.1:3000';
      },
    });

    assert.equal(apiBaseUrl, 'http://127.0.0.1:3000');
    assert.deepEqual(attempted, ['http://127.0.0.1:3000']);
  } finally {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  }
});

test('web session discovery ignores stored Azure API on loopback and prefers same-origin', async () => {
  const { discoverApiBaseUrlWith } =
    await import('../apps/web/app/lib/session-core.js');
  const attempted = [];

  const apiBaseUrl = await discoverApiBaseUrlWith({
    pageOrigin: 'http://127.0.0.1:3000',
    storedApiBaseUrl:
      'https://nibras-api.politedune-da41080e.francecentral.azurecontainerapps.io',
    configuredApiBaseUrl:
      'https://nibras-api.politedune-da41080e.francecentral.azurecontainerapps.io',
    probe: async (candidate) => {
      attempted.push(candidate);
      return candidate === 'http://127.0.0.1:3000';
    },
  });

  assert.equal(apiBaseUrl, 'http://127.0.0.1:3000');
  assert.deepEqual(attempted, ['http://127.0.0.1:3000']);
});

test('web session discovery prefers split-domain API when stored URL matches web origin', async () => {
  const { discoverApiBaseUrlWith } =
    await import('../apps/web/app/lib/session-core.js');
  const attempted = [];

  const apiBaseUrl = await discoverApiBaseUrlWith({
    pageOrigin: 'https://nibrasplatform.me',
    storedApiBaseUrl: 'https://nibrasplatform.me',
    configuredApiBaseUrl: 'https://nibras-api.example.azurecontainerapps.io',
    probe: async (candidate) => {
      attempted.push(candidate);
      return candidate === 'https://nibras-api.example.azurecontainerapps.io';
    },
  });

  assert.equal(apiBaseUrl, 'https://nibras-api.example.azurecontainerapps.io');
  assert.equal(
    attempted[0],
    'https://nibras-api.example.azurecontainerapps.io',
  );
});

test('web session discovery ignores stale Azure storage on nibrasplatform.me', async () => {
  const { discoverApiBaseUrlWith, shouldIgnoreStoredApiBaseUrlForOrigin } =
    await import('../apps/web/app/lib/session-core.js');

  assert.equal(
    shouldIgnoreStoredApiBaseUrlForOrigin(
      'https://nibrasplatform.me',
      'https://nibras-api.example.azurecontainerapps.io',
      'https://nibrasplatform.me',
    ),
    true,
  );

  const attempted = [];
  const apiBaseUrl = await discoverApiBaseUrlWith({
    pageOrigin: 'https://nibrasplatform.me',
    storedApiBaseUrl: 'https://nibras-api.example.azurecontainerapps.io',
    configuredApiBaseUrl: 'https://nibrasplatform.me',
    probe: async (candidate) => {
      attempted.push(candidate);
      return candidate === 'https://nibrasplatform.me';
    },
  });

  assert.equal(apiBaseUrl, 'https://nibrasplatform.me');
  // Production same-origin: health probe skipped (Azure proxy can exceed 5s).
  assert.deepEqual(attempted, []);
});

test('fetchWithTimeout exposes the default timeout constant', async () => {
  const { DEFAULT_FETCH_TIMEOUT_MS, fetchWithTimeout } =
    await import('../apps/web/app/lib/session-core.js');

  assert.equal(DEFAULT_FETCH_TIMEOUT_MS, 60_000);

  const controller = new AbortController();
  let capturedSignal = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    capturedSignal = init?.signal ?? null;
    controller.abort();
    throw new DOMException('The operation was aborted.', 'AbortError');
  };

  try {
    await assert.rejects(
      () => fetchWithTimeout('https://api.example/v1/health', {}, 123),
      /aborted/i,
    );
    assert.ok(capturedSignal);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('shouldIgnoreStaleLoopbackStoredApiUrl rejects port-80 nginx origin on :3000 dev', async () => {
  const prevNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  const { shouldIgnoreStaleLoopbackStoredApiUrl } =
    await import('../apps/web/app/lib/session-core.js');

  try {
    assert.equal(
      shouldIgnoreStaleLoopbackStoredApiUrl(
        'http://127.0.0.1:3000',
        'http://127.0.0.1',
      ),
      true,
    );
    assert.equal(
      shouldIgnoreStaleLoopbackStoredApiUrl(
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3000',
      ),
      false,
    );
    assert.equal(
      shouldIgnoreStaleLoopbackStoredApiUrl(
        'https://nibrasplatform.me',
        'http://127.0.0.1',
      ),
      false,
    );
  } finally {
    if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNodeEnv;
  }
});
