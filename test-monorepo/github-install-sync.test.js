'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { buildApp } = require('../apps/api/dist/app');
const { FileStore } = require('../apps/api/dist/store');

const GITHUB_ENV_KEYS = [
  'GITHUB_APP_ID',
  'GITHUB_APP_CLIENT_ID',
  'GITHUB_APP_CLIENT_SECRET',
  'GITHUB_APP_PRIVATE_KEY',
  'GITHUB_APP_NAME',
  'GITHUB_WEBHOOK_SECRET',
  'NIBRAS_WEB_BASE_URL',
];

const TEST_GITHUB_ENV = {
  GITHUB_APP_ID: '123456',
  GITHUB_APP_CLIENT_ID: 'client-test',
  GITHUB_APP_CLIENT_SECRET: 'secret-test',
  GITHUB_APP_PRIVATE_KEY:
    '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7\n-----END PRIVATE KEY-----',
  GITHUB_APP_NAME: 'nibras-test-app',
  GITHUB_WEBHOOK_SECRET: 'webhook-secret',
  NIBRAS_WEB_BASE_URL: 'http://127.0.0.1:8080',
};

function withGitHubEnv(run) {
  const previous = {};
  for (const key of GITHUB_ENV_KEYS) {
    previous[key] = process.env[key];
    if (TEST_GITHUB_ENV[key] !== undefined) {
      process.env[key] = TEST_GITHUB_ENV[key];
    }
  }
  return run().finally(() => {
    for (const key of GITHUB_ENV_KEYS) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
  });
}

function createMemoryApp() {
  const storePath = path.join(
    os.tmpdir(),
    `nibras-github-sync-${Date.now()}-${Math.random()}.json`,
  );
  const store = new FileStore(storePath);
  const app = buildApp(store);
  return { app, store, storePath };
}

test('github installations sync links the Nibras app when GitHub reports it', async () => {
  await withGitHubEnv(async () => {
    const { app, store, storePath } = createMemoryApp();
    const originalFetch = global.fetch;

    try {
      const apiBaseUrl = 'http://127.0.0.1';
      const { user, session } = await store.upsertGitHubUserSession({
        githubUserId: 'sync-user-1',
        login: 'sync-test-user',
        email: 'sync@example.com',
        accessToken: 'gh_access_sync_test',
      });
      assert.equal(user.githubAppInstalled, false);

      global.fetch = async (url) => {
        if (String(url).includes('/user/installations')) {
          const body = JSON.stringify({
            installations: [
              {
                id: 424242,
                app: { id: Number(TEST_GITHUB_ENV.GITHUB_APP_ID) },
                account: { login: 'sync-test-user' },
              },
            ],
          });
          return {
            ok: true,
            async text() {
              return body;
            },
          };
        }
        return originalFetch(url);
      };

      const syncResponse = await app.inject({
        method: 'POST',
        url: '/v1/github/installations/sync',
        headers: { authorization: `Bearer ${session.accessToken}` },
      });
      assert.equal(syncResponse.statusCode, 200);
      assert.equal(syncResponse.json().githubAppInstalled, true);
      assert.equal(syncResponse.json().installationId, '424242');

      const refreshed = await store.getUserByToken(
        apiBaseUrl,
        session.accessToken,
      );
      assert.equal(refreshed?.githubAppInstalled, true);

      const secondSync = await app.inject({
        method: 'POST',
        url: '/v1/github/installations/sync',
        headers: { authorization: `Bearer ${session.accessToken}` },
      });
      assert.equal(secondSync.statusCode, 200);
      assert.equal(secondSync.json().githubAppInstalled, true);
      assert.equal(secondSync.json().installationId, '424242');
    } finally {
      global.fetch = originalFetch;
      await app.close();
      try {
        fs.unlinkSync(storePath);
      } catch (_) {}
    }
  });
});

test('github install-url accepts return_to for CLI completion page', async () => {
  await withGitHubEnv(async () => {
    const { app, store, storePath } = createMemoryApp();

    try {
      const { session } = await store.upsertGitHubUserSession({
        githubUserId: 'install-url-user',
        login: 'install-url-user',
        email: 'install-url@example.com',
        accessToken: 'gh_access_install_url',
      });

      const returnTo =
        'http://127.0.0.1:8080/Settings/settings.html';
      const response = await app.inject({
        method: 'GET',
        url: `/v1/github/install-url?return_to=${encodeURIComponent(returnTo)}`,
        headers: { authorization: `Bearer ${session.accessToken}` },
      });
      assert.equal(response.statusCode, 200);
      assert.match(
        response.json().installUrl,
        /github\.com\/apps\/nibras-test-app\/installations\/new/,
      );
      assert.match(response.json().installUrl, /state=/);
    } finally {
      await app.close();
      try {
        fs.unlinkSync(storePath);
      } catch (_) {}
    }
  });
});
