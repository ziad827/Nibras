const test = require('node:test');
const assert = require('node:assert/strict');
const {
  IdeStatusResponseSchema,
  IdeVerifyProblemRequestSchema,
  IdeVerifyProblemResponseSchema,
} = require('@nibras/contracts');
const {
  filterCuratedLanguages,
} = require('../apps/api/dist/features/ide/languages');
const {
  normalizeJudge0Result,
} = require('../apps/api/dist/features/ide/judge0-client');
const {
  verifyNibras75FromLcStatus,
  verifyCpRoadmapFromPlatformStatus,
} = require('../apps/api/dist/features/ide/verify-problem');

test('filterCuratedLanguages keeps supported runtimes only', () => {
  const languages = [
    { id: 1, name: 'Bash (5.0.0)' },
    { id: 54, name: 'C++ (GCC 9.2.0)' },
    { id: 71, name: 'Python (3.8.1)' },
    { id: 99, name: 'Rust (1.40.0)' },
  ];
  const curated = filterCuratedLanguages(languages);
  assert.equal(curated.length, 2);
  assert.ok(curated.some((item) => /C\+\+/i.test(item.name)));
  assert.ok(curated.some((item) => /Python/i.test(item.name)));
});

test('normalizeJudge0Result maps compile_output to compileOutput', () => {
  const normalized = normalizeJudge0Result({
    stdout: '42\n',
    stderr: null,
    compile_output: 'error: expected ;',
    message: 'exceeded',
    time: '0.12',
    memory: 2048,
    status: { id: 6, description: 'Compilation Error' },
  });
  assert.equal(normalized.compileOutput, 'error: expected ;');
  assert.equal(normalized.stdout, '42\n');
  assert.equal(normalized.message, 'exceeded');
  assert.equal(normalized.status.description, 'Compilation Error');
});

test('IdeStatusResponseSchema accepts sandbox limit metadata', () => {
  const parsed = IdeStatusResponseSchema.parse({
    configured: true,
    reachable: true,
    cpuTimeLimitSeconds: 5,
    memoryLimitKb: 128000,
  });
  assert.equal(parsed.cpuTimeLimitSeconds, 5);
  assert.equal(parsed.memoryLimitKb, 128000);
});

test('IdeVerifyProblemRequestSchema parses daily and nibras75 sources', () => {
  const daily = IdeVerifyProblemRequestSchema.parse({
    source: 'daily',
    slug: 'two-sum',
  });
  assert.equal(daily.source, 'daily');

  const nibras75 = IdeVerifyProblemRequestSchema.parse({
    source: 'nibras75',
    slug: 'valid-anagram',
    externalUrl: 'https://leetcode.com/problems/valid-anagram/',
  });
  assert.equal(nibras75.slug, 'valid-anagram');

  const roadmap = IdeVerifyProblemRequestSchema.parse({
    source: 'cp-roadmap',
    slug: 'cf_1234A',
    externalUrl: 'https://codeforces.com/contest/1234/problem/A',
  });
  assert.equal(roadmap.source, 'cp-roadmap');
});

test('IdeVerifyProblemResponseSchema accepts verify outcomes', () => {
  const failure = IdeVerifyProblemResponseSchema.parse({
    verified: false,
    error: 'Not solved yet.',
  });
  assert.equal(failure.verified, false);

  const success = IdeVerifyProblemResponseSchema.parse({
    verified: true,
    reputationEarned: 10,
  });
  assert.equal(success.reputationEarned, 10);
});

test('verifyNibras75FromLcStatus detects LeetCode acceptance', () => {
  const statusMap = new Map([['two-sum', { solved: true }]]);
  const ok = verifyNibras75FromLcStatus('two-sum', 'student', statusMap);
  assert.equal(ok.verified, true);

  const missing = verifyNibras75FromLcStatus('three-sum', 'student', statusMap);
  assert.equal(missing.verified, false);
  assert.match(missing.error ?? '', /@student/);
});

test('verifyCpRoadmapFromPlatformStatus detects Codeforces acceptance', () => {
  const cfStatus = new Map([['1234A', { solved: true }]]);
  const ok = verifyCpRoadmapFromPlatformStatus(
    '1234A',
    'codeforces',
    'tourist',
    cfStatus,
    new Map(),
    new Map(),
  );
  assert.equal(ok.verified, true);

  const missing = verifyCpRoadmapFromPlatformStatus(
    '9999Z',
    'codeforces',
    'tourist',
    cfStatus,
    new Map(),
    new Map(),
  );
  assert.equal(missing.verified, false);
});
