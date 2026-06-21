'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { rewriteLegacyApiPath } = require('../apps/proxy/dist/server');

test('rewriteLegacyApiPath routes admin and gamification APIs to Fastify /v1', () => {
  const admin = rewriteLegacyApiPath('/api/admin/users?page=1');
  assert.equal(admin.forceFastify, true);
  assert.equal(admin.url, '/v1/admin/users?page=1');

  const badges = rewriteLegacyApiPath('/api/gamification/all-badges');
  assert.equal(badges.forceFastify, true);
  assert.equal(badges.url, '/v1/gamification/all-badges');
});
