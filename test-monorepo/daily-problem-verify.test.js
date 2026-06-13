'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  verifyTodayProblemOnPlatform,
} = require('../apps/api/dist/features/daily-problem/service');
const {
  matchesNibras75ReviewDue,
} = require('../apps/api/dist/features/competitions/practice/nibras75/nibras75-client');

test('matchesNibras75ReviewDue filters due reviews only when enabled', () => {
  const past = new Date(Date.now() - 60_000);
  const future = new Date(Date.now() + 60_000);
  const map = new Map([
    ['two-sum', past],
    ['add-two-numbers', future],
  ]);

  assert.equal(matchesNibras75ReviewDue('two-sum', {}, map), true);
  assert.equal(
    matchesNibras75ReviewDue('two-sum', { reviewDue: 'true' }, map),
    true,
  );
  assert.equal(
    matchesNibras75ReviewDue('add-two-numbers', { reviewDue: 'true' }, map),
    false,
  );
  assert.equal(
    matchesNibras75ReviewDue('missing', { reviewDue: 'true' }, map),
    false,
  );
});

test('verifyTodayProblemOnPlatform rejects unverified LeetCode account message shape', async () => {
  const config = {
    id: 'cfg',
    userId: 'u1',
    timezone: 'UTC',
    enabled: true,
    currentStreak: 0,
    longestStreak: 0,
    totalCompleted: 0,
    streakFreezes: 2,
  };

  const prisma = {
    dailyProblemConfig: {
      findUnique: async () => config,
      upsert: async () => config,
    },
    dailyProblemAssignment: {
      findUnique: async () => ({
        id: 'a1',
        solved: false,
        skipped: false,
        problem: {
          platform: 'leetcode',
          platformProblemId: 'two-sum',
          title: 'Two Sum',
        },
      }),
    },
    linkedAccount: {
      findUnique: async () => null,
    },
  };

  const result = await verifyTodayProblemOnPlatform(prisma, 'u1');
  assert.equal(result.verified, false);
  assert.match(result.error, /Link and verify your LeetCode account/);
});
