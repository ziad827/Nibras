#!/usr/bin/env node
/**
 * Generate docs/typst/api-routes-generated.typ from Fastify route registrations.
 * Run: node scripts/generate-api-reference-typ.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const API_SRC = path.join(ROOT, 'apps/api/src');
const OUT = path.join(ROOT, 'docs/typst/api-routes-generated.typ');
const QUICK_REF_OUT = path.join(ROOT, 'docs/typst/api-quick-ref-table.typ');

const PUBLIC_EXACT = new Set([
  '/healthz',
  '/readyz',
  '/metrics',
  '/v1/health',
  '/v1/ping',
  '/v1/device/start',
  '/v1/device/poll',
  '/v1/auth/refresh',
  '/v1/github/config',
  '/v1/github/webhooks',
  '/v1/github/oauth/start',
  '/v1/github/oauth/callback',
]);

const PUBLIC_PREFIXES = [
  '/v1/tracking/invites/',
  '/v1/community/questions/public',
];

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

function sectionFor(file, routePath) {
  const rel = file.replace(API_SRC + path.sep, '').replaceAll('\\', '/');
  if (!routePath.startsWith('/v1/')) return 'System & Health';
  if (
    routePath.startsWith('/v1/device/') ||
    routePath.startsWith('/v1/auth/') ||
    routePath.startsWith('/v1/web/') ||
    routePath === '/v1/logout' ||
    routePath === '/v1/me'
  ) {
    return 'Authentication & Sessions';
  }
  if (routePath === '/v1/me/submissions') return 'CLI Projects & Submissions';
  if (
    routePath.startsWith('/v1/tracking/dashboard') ||
    routePath === '/v1/tracking/analytics/instructor' ||
    routePath === '/v1/tracking/analytics/student' ||
    routePath === '/v1/tracking/activity'
  ) {
    return 'Tracking — Dashboards & Analytics';
  }
  if (rel === 'app.ts') return 'System & Health';
  if (rel.includes('features/admin/')) return 'Admin';
  if (rel.includes('features/analytics/')) return 'Analytics';
  if (rel.includes('features/ai-credentials/')) return 'AI Credentials';
  if (rel.includes('features/community/v2-routes')) return 'Community v2';
  if (rel.includes('features/community/')) return 'Community';
  if (rel.includes('features/competitions/nibras75')) return 'Nibras 75';
  if (rel.includes('features/competitions/practice-codeforces'))
    return 'Codeforces Practice';
  if (rel.includes('features/competitions/practice-leetcode'))
    return 'LeetCode Practice';
  if (rel.includes('features/competitions/')) return 'Competitions';
  if (rel.includes('features/daily-problem/')) return 'Daily Problem';
  if (rel.includes('features/gamification/')) return 'Gamification';
  if (rel.includes('features/github/')) return 'GitHub Integration';
  if (rel.includes('features/hosted-cli/')) return 'CLI Projects & Submissions';
  if (rel.includes('features/ide/')) return 'IDE (Judge0)';
  if (rel.includes('features/notifications/')) return 'Notifications';
  if (rel.includes('features/programs/')) return 'Program Planning';
  if (rel.includes('features/reputation/')) return 'Reputation';
  if (rel.includes('features/users/')) return 'Users & Profiles';
  if (rel.includes('features/tracking/course-videos'))
    return 'Tracking — Course Videos';
  if (rel.includes('features/tracking/course-assignments'))
    return 'Tracking — Course Assignments';
  if (rel.includes('features/tracking/course-grades'))
    return 'Tracking — Course Grades';
  if (rel.includes('features/tracking/course-profile'))
    return 'Tracking — Course Profile';
  if (rel.includes('features/tracking/course-video-comments'))
    return 'Tracking — Video Comments';
  if (rel.includes('features/tracking/')) return 'Tracking — Core';
  return 'Other';
}

function tagFor(section) {
  const map = {
    'System & Health': 'system',
    'Authentication & Sessions': 'auth',
    'GitHub Integration': 'github',
    'CLI Projects & Submissions': 'projects',
    'Tracking — Core': 'tracking',
    'Tracking — Course Videos': 'tracking',
    'Tracking — Course Assignments': 'tracking',
    'Tracking — Course Grades': 'tracking',
    'Tracking — Course Profile': 'tracking',
    'Tracking — Video Comments': 'tracking',
    'Tracking — Dashboards & Analytics': 'tracking',
    'Program Planning': 'programs',
    Notifications: 'notifications',
    Admin: 'admin',
    Community: 'community',
    'Community v2': 'community',
    Competitions: 'compete',
    'Nibras 75': 'compete',
    'Codeforces Practice': 'compete',
    'LeetCode Practice': 'compete',
    'Daily Problem': 'compete',
    Gamification: 'gamification',
    Reputation: 'gamification',
    'Users & Profiles': 'users',
    Analytics: 'analytics',
    'IDE (Judge0)': 'ide',
    'AI Credentials': 'ai',
    Other: 'other',
  };
  return map[section] ?? 'other';
}

function needsAuth(routePath) {
  if (PUBLIC_EXACT.has(routePath)) return false;
  for (const p of PUBLIC_PREFIXES) {
    if (routePath.startsWith(p)) return false;
  }
  if (!routePath.startsWith('/v1/')) return false;
  return true;
}

function escTyp(s) {
  return s.replace(/\\/g, '\\\\').replace(/#/g, '\\#');
}

const re = /app\.(get|post|patch|put|delete)\(\s*['"`]([^'"`]+)['"`]/g;
const routes = [];
for (const file of walk(API_SRC)) {
  const src = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = re.exec(src))) {
    routes.push({
      method: m[1].toUpperCase(),
      path: m[2],
      file,
    });
  }
}

routes.sort((a, b) => {
  const sa = sectionFor(a.file, a.path);
  const sb = sectionFor(b.file, b.path);
  if (sa !== sb) return sa.localeCompare(sb);
  if (a.path !== b.path) return a.path.localeCompare(b.path);
  return a.method.localeCompare(b.method);
});

const bySection = new Map();
for (const r of routes) {
  const section = sectionFor(r.file, r.path);
  if (!bySection.has(section)) bySection.set(section, []);
  bySection.get(section).push(r);
}

const SECTION_ORDER = [
  'System & Health',
  'Authentication & Sessions',
  'GitHub Integration',
  'CLI Projects & Submissions',
  'Tracking — Core',
  'Tracking — Course Videos',
  'Tracking — Course Assignments',
  'Tracking — Course Grades',
  'Tracking — Course Profile',
  'Tracking — Video Comments',
  'Tracking — Dashboards & Analytics',
  'Program Planning',
  'Notifications',
  'Admin',
  'Community',
  'Community v2',
  'Competitions',
  'Daily Problem',
  'Nibras 75',
  'Codeforces Practice',
  'LeetCode Practice',
  'IDE (Judge0)',
  'Gamification',
  'Reputation',
  'Users & Profiles',
  'Analytics',
  'AI Credentials',
  'Other',
];

const lines = [];
lines.push('// AUTO-GENERATED — do not edit by hand');
lines.push(`// Generated: ${new Date().toISOString()}`);
lines.push(
  `// Routes: ${routes.length} · Run: node scripts/generate-api-reference-typ.mjs`,
);
lines.push('#import "api-macros.typ": *');
lines.push('');

let sectionNum = 0;
for (const section of SECTION_ORDER) {
  const items = bySection.get(section);
  if (!items?.length) continue;
  sectionNum += 1;
  lines.push('#pagebreak(weak: true)');
  lines.push(`= ${escTyp(section)}`);
  lines.push('');
  lines.push(
    `#text(size: 9pt, fill: muted)[${items.length} endpoints · source: apps/api/src/features/]`,
  );
  lines.push('');

  for (const r of items) {
    const rel = r.file.replace(API_SRC + path.sep, '').replaceAll('\\', '/');
    const auth = needsAuth(r.path);
    lines.push(`#endpoint("${r.method}", "${escTyp(r.path)}", auth: ${auth},`);
    lines.push(`  desc: "Source: ${escTyp(rel)}",`);
    lines.push(')');
    lines.push('');
  }
}

fs.writeFileSync(OUT, lines.join('\n'));

// Quick-reference table fragment (included inside api-reference.typ page block)
const qLines = [];
qLines.push('// AUTO-GENERATED quick-reference rows');
for (const r of routes) {
  const section = sectionFor(r.file, r.path);
  const tag = tagFor(section);
  const auth = needsAuth(r.path);
  qLines.push(
    `    ..qrow("${r.method}", "${escTyp(r.path)}", ${auth}, "${tag}"),`,
  );
}
fs.writeFileSync(QUICK_REF_OUT, qLines.join('\n'));

const API_REF = path.join(ROOT, 'docs/api-reference.typ');
if (fs.existsSync(API_REF)) {
  const typ = fs.readFileSync(API_REF, 'utf8');
  if (typ.includes('@@QUICK_REF_ROWS@@')) {
    fs.writeFileSync(
      API_REF,
      typ.replace('@@QUICK_REF_ROWS@@', qLines.join('\n')),
    );
  }
}

console.log(`Wrote ${routes.length} endpoints to:`);
console.log(`  ${OUT}`);
console.log(`  ${QUICK_REF_OUT}`);
console.log(`Sections: ${sectionNum}`);
