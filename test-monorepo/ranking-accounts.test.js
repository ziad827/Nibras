'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  mapLinkedAccounts,
  verifiedCount,
  formatMyRankRows,
} = require('../Frontend/client/Competitions/Ranking/ranking-accounts');

test('mapLinkedAccounts maps Fastify account rows to UI state', () => {
  const mapped = mapLinkedAccounts([
    {
      host: 'codeforces',
      handle: 'tourist',
      verificationStatus: 'verified',
      rating: 3900,
    },
    {
      host: 'leetcode',
      handle: 'tourist',
      verificationStatus: 'pending',
    },
  ]);

  assert.deepEqual(mapped.linkedAccounts, {
    codeforces: 'tourist',
    leetcode: 'tourist',
  });
  assert.equal(mapped.verification.codeforces.status, 'verified');
  assert.equal(mapped.verification.leetcode.status, 'pending');
  assert.equal(mapped.ratings.codeforces, 3900);
});

test('mapLinkedAccounts maps verificationProblem when present', () => {
  const mapped = mapLinkedAccounts([
    {
      host: 'codeforces',
      handle: 'tourist',
      verificationStatus: 'pending',
      verificationProblem: {
        contestId: 1000,
        index: 'A',
        name: '1000A',
        url: 'https://codeforces.com/problemset/problem/1000/A',
      },
    },
  ]);

  assert.deepEqual(mapped.verificationProblems.codeforces, {
    contestId: 1000,
    index: 'A',
    name: '1000A',
    url: 'https://codeforces.com/problemset/problem/1000/A',
  });
});

test('verifiedCount counts verified platforms only', () => {
  const count = verifiedCount({
    codeforces: { status: 'verified' },
    leetcode: { status: 'pending' },
    atcoder: { status: 'unverified' },
  });
  assert.equal(count, 1);
});

test('formatMyRankRows returns fallback when empty', () => {
  const rows = formatMyRankRows([]);
  assert.equal(rows.length, 1);
  assert.match(rows[0].value, /not ranked/i);
});

test('formatMyRankRows formats platform ranks', () => {
  const rows = formatMyRankRows([
    { platform: 'codeforces', scope: 'global', rank: 12, rating: 2100 },
    { platform: 'leetcode', scope: 'global', rank: 45, rating: 1800 },
  ]);
  assert.equal(rows.length, 2);
  assert.match(rows[0].value, /#12/);
  assert.match(rows[0].value, /2100/);
});
