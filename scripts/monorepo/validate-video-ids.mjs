#!/usr/bin/env node
/**
 * Validates platform video YouTube IDs in apps/web/app/_content/platform-videos.json.
 * Warns on known placeholder IDs and missing recommended slots.
 *
 * Usage:
 *   node scripts/validate-video-ids.mjs
 *   node scripts/validate-video-ids.mjs --strict   # exit 1 on any warning
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonPath = join(
  __dirname,
  '../apps/web/app/_content/platform-videos.json',
);
const strict = process.argv.includes('--strict');

/** Well-known IDs used as placeholders — replace with real walkthroughs. */
const KNOWN_PLACEHOLDER_IDS = new Set([
  '9bZkp7q19f0', // PSY - Gangnam Style
  'dQw4w9WgXcQ', // Rick Astley - Never Gonna Give You Up
  'jNQXAC9IVRw', // Me at the zoo
  'kJQP7kiw5Fk', // Despacito
]);

const RECOMMENDED_ONBOARDING_STEPS = [
  'step-01',
  'step-02',
  'step-03',
  'step-join',
  'step-05',
  'step-06',
  'step-07',
  'step-08',
  'step-09',
  'step-10',
];

let data;
try {
  data = JSON.parse(readFileSync(jsonPath, 'utf8'));
} catch (err) {
  console.error(`Failed to read ${jsonPath}:`, err.message);
  process.exit(1);
}

const warnings = [];
const errors = [];

function checkId(path, id) {
  if (typeof id !== 'string') {
    errors.push(`${path}: expected string, got ${typeof id}`);
    return;
  }
  if (id.length === 0) return;
  if (!/^[A-Za-z0-9_-]{6,}$/.test(id)) {
    errors.push(`${path}: invalid YouTube ID format "${id}"`);
  }
  if (KNOWN_PLACEHOLDER_IDS.has(id)) {
    warnings.push(
      `${path}: placeholder YouTube ID "${id}" — replace with real walkthrough`,
    );
  }
}

// Overview
if (!data.overview?.youtubeId?.trim()) {
  warnings.push(
    'overview.youtubeId: empty — landing/docs will show "Coming soon"',
  );
} else {
  checkId('overview.youtubeId', data.overview.youtubeId);
}

// Onboarding
for (const step of RECOMMENDED_ONBOARDING_STEPS) {
  const id = data.onboarding?.[step] ?? '';
  if (!id.trim()) {
    warnings.push(
      `onboarding.${step}: empty — step will show "Coming soon" on /setup`,
    );
  } else {
    checkId(`onboarding.${step}`, id);
  }
}

// Instructor + features (warn only when empty)
for (const section of ['instructor', 'features']) {
  const block = data[section];
  if (!block || typeof block !== 'object') continue;
  for (const [key, id] of Object.entries(block)) {
    if (!id?.trim()) {
      warnings.push(`${section}.${key}: empty — spotlight not yet published`);
    } else {
      checkId(`${section}.${key}`, id);
    }
  }
}

if (errors.length > 0) {
  console.error('Video ID validation errors:\n');
  for (const e of errors) console.error(`  ✗ ${e}`);
}

if (warnings.length > 0) {
  console.warn('Video ID validation warnings:\n');
  for (const w of warnings) console.warn(`  △ ${w}`);
}

if (errors.length === 0 && warnings.length === 0) {
  console.log('All platform video IDs look valid.');
  process.exit(0);
}

if (errors.length > 0) {
  process.exit(1);
}

if (strict && warnings.length > 0) {
  process.exit(1);
}

console.warn(`\n${warnings.length} warning(s), ${errors.length} error(s).`);
process.exit(0);
