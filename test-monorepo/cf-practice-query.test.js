'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseCfPlatformProblemId,
  contestIdFromPlatformProblemId,
} = require('../apps/api/dist/features/competitions/practice/codeforces/cf-problem-id');

test('cf problem id helpers support contest filters', () => {
  assert.equal(contestIdFromPlatformProblemId('1900F'), 1900);
  assert.deepEqual(parseCfPlatformProblemId('1900F'), {
    contestId: 1900,
    index: 'F',
  });
});

test('fetchPracticeCfProblems is exported with prisma-first signature', () => {
  const mod = require('../apps/api/dist/features/competitions/practice/codeforces/codeforces-client');
  assert.equal(typeof mod.fetchPracticeCfProblems, 'function');
  assert.equal(typeof mod.fetchPracticeCfTags, 'function');
  assert.equal(typeof mod.fetchRandomUnsolvedCfProblem, 'function');
});
