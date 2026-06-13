const test = require('node:test');
const assert = require('node:assert/strict');

const { isRealCommitSha } = require('../apps/api/dist/lib/verification-jobs');

test('isRealCommitSha rejects pending and manual placeholders', () => {
  assert.equal(isRealCommitSha(''), false);
  assert.equal(isRealCommitSha('github-pending-abc123'), false);
  assert.equal(isRealCommitSha('manual-abc123'), false);
  assert.equal(isRealCommitSha('abc123def4567890'), true);
});
