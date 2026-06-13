'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildPracticeProblemsPath,
  buildPracticeProblemsQuery,
  extractPracticeProblemList,
  normalizePracticeProblem,
  parseListProblemsResponse,
} = require('../Frontend/client/Competitions/Practice/practice-problems');

test('buildPracticeProblemsPath routes codeforces to practice endpoint', () => {
  assert.equal(
    buildPracticeProblemsPath('codeforces'),
    '/practice/codeforces/problems',
  );
  assert.equal(buildPracticeProblemsPath('leetcode'), '/problems');
  assert.equal(buildPracticeProblemsPath('all'), '/problems');
});

test('buildPracticeProblemsQuery maps filters for DB problems endpoint', () => {
  assert.deepEqual(
    buildPracticeProblemsQuery(
      {
        page: 2,
        limit: 25,
        search: 'two sum',
        tags: 'array',
        minRating: '800',
        maxRating: '1500',
        solved: 'solved',
      },
      'leetcode',
    ),
    {
      page: 2,
      limit: 25,
      q: 'two sum',
      tag: 'array',
      difficultyMin: '800',
      difficultyMax: '1500',
      host: 'leetcode',
      solved: 'true',
    },
  );
});

test('buildPracticeProblemsQuery maps filters for codeforces practice endpoint', () => {
  assert.deepEqual(
    buildPracticeProblemsQuery(
      {
        search: 'dp',
        tags: 'dp',
        minRating: '1200',
        solved: 'unsolved',
      },
      'codeforces',
    ),
    {
      q: 'dp',
      tag: 'dp',
      ratingMin: '1200',
      solved: 'false',
    },
  );
});

test('extractPracticeProblemList reads items and legacy shapes', () => {
  assert.equal(extractPracticeProblemList({ items: [{ id: '1' }] }).length, 1);
  assert.equal(
    extractPracticeProblemList({ problems: [{ id: '2' }] }).length,
    1,
  );
  assert.equal(extractPracticeProblemList([{ id: '3' }]).length, 1);
});

test('normalizePracticeProblem maps /v1/problems shape', () => {
  assert.deepEqual(
    normalizePracticeProblem(
      {
        id: 'abc',
        title: 'Two Sum',
        host: 'leetcode',
        difficulty: 800,
        tags: ['array'],
        url: 'https://leetcode.com/problems/two-sum/',
        solved: true,
      },
      'leetcode',
    ),
    {
      id: 'abc',
      title: 'Two Sum',
      url: 'https://leetcode.com/problems/two-sum/',
      tags: ['array'],
      platform: 'leetcode',
      rating: 800,
      isSolved: true,
    },
  );
});

test('normalizePracticeProblem maps codeforces practice row shape', () => {
  assert.deepEqual(
    normalizePracticeProblem(
      {
        id: 'db-cuid',
        problemId: '1900',
        index: 'F',
        name: 'Tree of Life',
        url: 'https://codeforces.com/problemset/problem/1900/F',
        rating: 3200,
        tags: ['dp'],
        solved: false,
      },
      'codeforces',
    ),
    {
      id: 'db-cuid',
      title: 'Tree of Life',
      url: 'https://codeforces.com/problemset/problem/1900/F',
      tags: ['dp'],
      platform: 'codeforces',
      rating: 3200,
      isSolved: false,
    },
  );
});

test('parseListProblemsResponse returns normalized list and totals', () => {
  const result = parseListProblemsResponse(
    {
      items: [
        {
          id: '1',
          title: 'A',
          host: 'leetcode',
          difficulty: 900,
          tags: [],
          url: 'https://example.com/a',
          solved: false,
        },
      ],
      total: 75,
      page: 1,
      limit: 50,
    },
    { page: 1, limit: 50 },
    'all',
  );
  assert.equal(result.problems.length, 1);
  assert.equal(result.total, 75);
  assert.equal(result.pages, 2);
  assert.equal(result.problems[0].title, 'A');
});
