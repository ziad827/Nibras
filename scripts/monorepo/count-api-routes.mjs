#!/usr/bin/env node
/**
 * Count Fastify route registrations under apps/api/src.
 * Run: node scripts/count-api-routes.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

const re = /app\.(get|post|patch|put|delete)\(\s*['"`]([^'"`]+)['"`]/g;
const routes = [];
for (const file of walk('apps/api/src')) {
  const src = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = re.exec(src))) {
    routes.push({ method: m[1].toUpperCase(), path: m[2], file });
  }
}

const genPath = new URL(
  '../docs/typst/api-routes-generated.typ',
  import.meta.url,
);
let documentedInTyp = 0;
if (fs.existsSync(genPath)) {
  const gen = fs.readFileSync(genPath, 'utf8');
  documentedInTyp = (gen.match(/#endpoint\(/g) || []).length;
}

console.log(
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      totalRegistrations: routes.length,
      documentedInApiReferenceTyp: documentedInTyp,
      inSync: documentedInTyp === routes.length,
      note: 'Run node scripts/generate-api-reference-typ.mjs before compiling api-reference.pdf',
    },
    null,
    2,
  ),
);
