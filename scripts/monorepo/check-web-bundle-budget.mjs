#!/usr/bin/env node
/**
 * Fail CI when key Next.js route chunks exceed budget (excludes Monaco static assets).
 * Usage: node scripts/check-web-bundle-budget.mjs
 */
import { readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nextDir = join(root, 'apps/web/.next/static/chunks');

/** Max raw JS size per chunk (bytes). Shared vendor chunks (e.g. xyflow) may exceed route budgets. */
const MAX_CHUNK_BYTES = 1120 * 1024;

function listJsFiles(dir, acc = []) {
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        listJsFiles(full, acc);
      } else if (entry.endsWith('.js') && !entry.includes('monaco')) {
        acc.push({ path: full, size: stat.size });
      }
    }
  } catch {
    // .next may be absent locally
  }
  return acc;
}

const chunks = listJsFiles(nextDir);
const oversized = chunks.filter((c) => c.size > MAX_CHUNK_BYTES);

if (chunks.length === 0) {
  console.log('No Next.js chunks found — run npm run web:build first.');
  process.exit(0);
}

console.log(
  `Checked ${chunks.length} JS chunks (budget ${MAX_CHUNK_BYTES} bytes each).`,
);

if (oversized.length > 0) {
  console.error('\nOversized chunks:');
  for (const chunk of oversized.sort((a, b) => b.size - a.size)) {
    console.error(
      `  ${Math.round(chunk.size / 1024)} KiB  ${chunk.path.replace(root + '/', '')}`,
    );
  }
  process.exit(1);
}

console.log('All route chunks within budget.');
