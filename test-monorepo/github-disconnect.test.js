'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { buildApp } = require('../apps/api/dist/app');
const { FileStore } = require('../apps/api/dist/store');

function createMemoryApp() {
  const storePath = path.join(
    os.tmpdir(),
    `nibras-github-disconnect-${Date.now()}-${Math.random()}.json`,
  );
  const store = new FileStore(storePath);
  const app = buildApp(store);
  return { app, store, storePath };
}

test('github oauth disconnect clears linked account state', async () => {
  const { app, store, storePath } = createMemoryApp();

  try {
    const apiBaseUrl = 'http://127.0.0.1';
    const { user, session } = await store.upsertGitHubUserSession({
      githubUserId: '12345',
      login: 'disconnect-test-user',
      email: 'disconnect@example.com',
      accessToken: 'gh_access_disconnect_test',
    });
    assert.equal(user.githubLinked, true);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/github/oauth/disconnect',
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().ok, true);
    assert.equal(response.json().user.githubLinked, false);
    assert.equal(response.json().user.githubAppInstalled, false);

    const account = await store.getGithubAccountForUser(user.id);
    assert.equal(account, null);

    const refreshed = await store.getUserByToken(apiBaseUrl, session.accessToken);
    assert.equal(refreshed?.githubLinked, false);
    assert.equal(refreshed?.githubAppInstalled, false);
  } finally {
    await app.close();
    try {
      fs.unlinkSync(storePath);
    } catch (_) {}
  }
});
