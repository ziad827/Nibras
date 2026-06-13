'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  resolveVerifiedHandle,
} = require('../apps/api/dist/features/competitions/practice/resolve-handle');
const {
  parseCfPlatformProblemId,
  contestIdFromPlatformProblemId,
} = require('../apps/api/dist/features/competitions/practice/codeforces/cf-problem-id');

test('resolveVerifiedHandle returns query handle without DB lookup', async () => {
  const handle = await resolveVerifiedHandle(
    {},
    'leetcode',
    'user-1',
    '  tourist  ',
  );
  assert.equal(handle, 'tourist');
});

test('resolveVerifiedHandle requires verified linked account', async () => {
  const prisma = {
    linkedAccount: {
      findUnique: async () => ({
        handle: 'tourist',
        verificationStatus: 'pending',
      }),
    },
  };

  const pending = await resolveVerifiedHandle(prisma, 'codeforces', 'user-1');
  assert.equal(pending, undefined);

  prisma.linkedAccount.findUnique = async () => ({
    handle: 'tourist',
    verificationStatus: 'verified',
  });
  const verified = await resolveVerifiedHandle(prisma, 'codeforces', 'user-1');
  assert.equal(verified, 'tourist');
});

test('parseCfPlatformProblemId splits contest id and index', () => {
  assert.deepEqual(parseCfPlatformProblemId('1234A'), {
    contestId: 1234,
    index: 'A',
  });
  assert.deepEqual(parseCfPlatformProblemId('hello'), { index: 'hello' });
  assert.equal(contestIdFromPlatformProblemId('5678B'), 5678);
});
