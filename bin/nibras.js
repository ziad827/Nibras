#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function main() {
  const modernEntries = [
    path.join(__dirname, '..', 'apps', 'cli', 'bundle', 'index.js'),
    path.join(__dirname, '..', 'apps', 'cli', 'dist', 'index.js'),
  ];

  for (const modernEntry of modernEntries) {
    if (!fs.existsSync(modernEntry)) {
      continue;
    }
    const { runCli } = require(modernEntry);
    await runCli(process.argv);
    return;
  }

  const { run } = require('../legacy-cli/cli');
  await run(process.argv);
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : String(err));
  process.exitCode = 1;
});
