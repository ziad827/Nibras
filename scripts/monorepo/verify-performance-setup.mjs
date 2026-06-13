#!/usr/bin/env node
/**
 * Sanity-check performance-related env and run lightweight cache tests.
 * Usage: node scripts/verify-performance-setup.mjs
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const checks = [];

function note(label, ok, detail) {
  checks.push({ label, ok, detail });
}

note(
  'DATABASE_URL',
  Boolean(process.env.DATABASE_URL?.trim()),
  process.env.DATABASE_URL ? 'set' : 'missing — required for API',
);

note(
  'REDIS_URL (shared read cache)',
  Boolean(process.env.REDIS_URL?.trim()),
  process.env.REDIS_URL
    ? 'set — dashboard/plan cache shared across replicas'
    : 'unset — in-memory cache per process (OK for local dev)',
);

const dbUrl = process.env.DATABASE_URL ?? '';
note(
  'connection_limit in DATABASE_URL',
  /connection_limit=\d+/i.test(dbUrl) || process.env.NODE_ENV !== 'production',
  /connection_limit=\d+/i.test(dbUrl)
    ? 'pool cap configured'
    : 'recommended for production: ?connection_limit=8 (api), 2 (web), 4 (worker)',
);

const cacheBuilt = existsSync(join(root, 'apps/api/dist/lib/cache.js'));
note(
  'API build (cache module)',
  cacheBuilt,
  cacheBuilt ? 'built' : 'run npm run build -w @nibras/api first',
);

console.log('\nPerformance setup verification\n');
for (const { label, ok, detail } of checks) {
  console.log(`${ok ? '✓' : '○'} ${label}: ${detail}`);
}

if (cacheBuilt) {
  try {
    execSync('node --test test/db-fetch-speed.test.js', {
      cwd: root,
      stdio: 'inherit',
    });
    note('cache unit tests', true, 'passed');
  } catch {
    note('cache unit tests', false, 'failed');
    process.exitCode = 1;
  }
}

const failed = checks.filter((c) => c.label === 'cache unit tests' && !c.ok);
if (failed.length > 0) {
  process.exit(1);
}

console.log(
  '\nDone. Enable NIBRAS_DB_QUERY_LOG=1 locally to compare hot-path timings.\n',
);
