'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeDailyTodayPayload,
  formatActionRewards,
  emptyStateMessage,
  canVerifyOnPlatform,
  difficultyLabel,
} = require('../Frontend/client/Competitions/DailyProblem/daily-problem-ui');

test('normalizeDailyTodayPayload reads nested streak and assignment', () => {
  const normalized = normalizeDailyTodayPayload({
    paused: false,
    assignment: {
      solved: true,
      skipped: false,
      source: 'nibras75',
      problem: {
        title: 'Two Sum',
        platform: 'leetcode',
        difficulty: 800,
        tags: ['array'],
      },
    },
    streak: {
      current: 5,
      longest: 12,
      totalCompleted: 40,
      freezesLeft: 1,
    },
  });

  assert.equal(normalized.currentStreak, 5);
  assert.equal(normalized.longestStreak, 12);
  assert.equal(normalized.totalCompleted, 40);
  assert.equal(normalized.solvedToday, true);
  assert.equal(normalized.problem.title, 'Two Sum');
});

test('emptyStateMessage handles paused and skipped states', () => {
  assert.match(
    emptyStateMessage({
      paused: true,
      pausedUntil: '2030-01-01T00:00:00.000Z',
      assignment: null,
    }),
    /paused until/i,
  );
  assert.match(
    emptyStateMessage({
      paused: false,
      skippedToday: true,
      assignment: { solved: false, skipped: true },
    }),
    /skipped/i,
  );
});

test('formatActionRewards includes reputation and badges', () => {
  const text = formatActionRewards({
    reputationEarned: 10,
    milestoneBonus: 25,
    newBadges: ['streak-7'],
  });
  assert.match(text, /10 reputation/);
  assert.match(text, /streak-7/);
});

test('canVerifyOnPlatform allows codeforces and leetcode only', () => {
  assert.equal(canVerifyOnPlatform('codeforces'), true);
  assert.equal(canVerifyOnPlatform('leetcode'), true);
  assert.equal(canVerifyOnPlatform('atcoder'), false);
});

test('difficultyLabel maps numeric ratings', () => {
  assert.equal(difficultyLabel(900), 'Easy');
  assert.equal(difficultyLabel(1500), 'Medium');
  assert.equal(difficultyLabel(2200), 'Hard');
});
