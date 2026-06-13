'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseRoadmapProblemUrl,
  detectSourcePlatform,
} = require('../apps/api/dist/features/competitions/practice/cp-roadmap/problem-id');
const {
  mergeCpRoadmapStatus,
} = require('../apps/api/dist/features/competitions/practice/cp-roadmap/cp-roadmap-client');
const {
  CP_ROADMAP_TOPIC_INFO,
} = require('../apps/api/dist/features/competitions/practice/cp-roadmap/curriculum');

const LEGACY_TEMPLATE_REPO = 'ShahjalalShohag/code-library';
const NIBRAS_TEMPLATE_REPO = 'NibrasPlatform/codeLibrary';

test('parseRoadmapProblemUrl parses Codeforces contest URLs', () => {
  const parsed = parseRoadmapProblemUrl(
    'https://codeforces.com/contest/1234/problem/A',
  );
  assert.deepEqual(parsed, {
    platform: 'codeforces',
    platformProblemId: '1234A',
  });
});

test('parseRoadmapProblemUrl parses Codeforces problemset URLs', () => {
  const parsed = parseRoadmapProblemUrl(
    'https://codeforces.com/problemset/problem/821/D',
  );
  assert.deepEqual(parsed, {
    platform: 'codeforces',
    platformProblemId: '821D',
  });
});

test('parseRoadmapProblemUrl parses LeetCode URLs', () => {
  const parsed = parseRoadmapProblemUrl(
    'https://leetcode.com/problems/two-sum/',
  );
  assert.deepEqual(parsed, {
    platform: 'leetcode',
    platformProblemId: 'two-sum',
  });
});

test('parseRoadmapProblemUrl parses acmsguru URLs with synthetic key', () => {
  const parsed = parseRoadmapProblemUrl(
    'https://codeforces.com/problemsets/acmsguru/problem/99999/106',
  );
  assert.deepEqual(parsed, {
    platform: 'codeforces',
    platformProblemId: 'acmsguru_99999_106',
  });
});

test('detectSourcePlatform maps SPOJ URLs', () => {
  assert.equal(
    detectSourcePlatform('https://www.spoj.com/problems/TEST/'),
    'spoj',
  );
});

test('detectSourcePlatform maps CSES URLs', () => {
  assert.equal(
    detectSourcePlatform('https://cses.fi/problemset/task/1641'),
    'cses',
  );
});

test('mergeCpRoadmapStatus prefers manual database marks', () => {
  const db = new Map([
    ['codeforces_1063b', { solved: false, userMarked: true }],
  ]);
  const cf = new Map([['1063B', { solved: true }]]);
  const merged = mergeCpRoadmapStatus(
    'codeforces_1063b',
    'https://codeforces.com/contest/1063/problem/B',
    db,
    cf,
    new Map(),
    new Map(),
  );
  assert.equal(merged.solved, false);
  assert.equal(merged.userMarked, true);
});

test('mergeCpRoadmapStatus falls back to Codeforces sync', () => {
  const merged = mergeCpRoadmapStatus(
    'codeforces_1063b',
    'https://codeforces.com/contest/1063/problem/B',
    new Map(),
    new Map([['1063B', { solved: true }]]),
    new Map(),
    new Map(),
  );
  assert.equal(merged.solved, true);
  assert.equal(merged.userMarked, false);
});

test('mergeCpRoadmapStatus falls back to LeetCode sync', () => {
  const merged = mergeCpRoadmapStatus(
    'leetcode_two_sum',
    'https://leetcode.com/problems/two-sum/',
    new Map(),
    new Map(),
    new Map([['two-sum', { solved: true }]]),
    new Map(),
  );
  assert.equal(merged.solved, true);
});

test('parseRoadmapProblemUrl parses AtCoder URLs', () => {
  const parsed = parseRoadmapProblemUrl(
    'https://atcoder.jp/contests/abc300/tasks/abc300_a',
  );
  assert.deepEqual(parsed, {
    platform: 'atcoder',
    platformProblemId: 'abc300_a',
  });
});

test('mergeCpRoadmapStatus falls back to AtCoder sync', () => {
  const merged = mergeCpRoadmapStatus(
    'abc300_a',
    'https://atcoder.jp/contests/abc300/tasks/abc300_a',
    new Map(),
    new Map(),
    new Map(),
    new Map([['abc300_a', { solved: true }]]),
  );
  assert.equal(merged.solved, true);
  assert.equal(merged.userMarked, false);
});

test('CP Roadmap template codes use NibrasPlatform codeLibrary, not legacy repo', () => {
  let nibrasCount = 0;
  for (const info of Object.values(CP_ROADMAP_TOPIC_INFO)) {
    for (const url of info.template_codes ?? []) {
      assert.doesNotMatch(
        url,
        new RegExp(LEGACY_TEMPLATE_REPO.replace('/', '\\/')),
        `legacy template repo still referenced: ${url}`,
      );
      if (url.includes(NIBRAS_TEMPLATE_REPO)) {
        nibrasCount += 1;
      }
    }
  }
  assert.ok(
    nibrasCount > 0,
    'expected NibrasPlatform template links in curriculum data',
  );
  assert.equal(
    CP_ROADMAP_TOPIC_INFO.harmonic_series?.template_codes?.[0],
    'https://github.com/NibrasPlatform/codeLibrary/blob/main/Basics/Harmonic%20Number%20Example.cpp',
  );
});
