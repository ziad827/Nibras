#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const cliPkg = require(path.join(repoRoot, 'apps', 'cli', 'package.json'));

function makeTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...(options.env || {}),
    },
  });
  if (result.status !== 0) {
    const details = [result.stdout, result.stderr]
      .filter(Boolean)
      .join('\n')
      .trim();
    throw new Error(`${command} ${args.join(' ')} failed.\n${details}`);
  }
  return result.stdout.trim();
}

function installedBinaryPath(prefixDir) {
  if (process.platform === 'win32') {
    return path.join(prefixDir, 'nibras.cmd');
  }
  return path.join(prefixDir, 'bin', 'nibras');
}

function main() {
  const installRoot = makeTempDir('nibras-download-prefix-');
  const tarballDir = makeTempDir('nibras-download-pack-');

  run('npm', ['--prefix', 'apps/cli', 'run', 'build']);
  const tarballName = run('npm', ['pack', '--workspace', 'apps/cli'], {
    cwd: repoRoot,
  })
    .split('\n')
    .filter(Boolean)
    .at(-1);
  assert.ok(tarballName, 'Expected npm pack to output a tarball filename');

  const sourceTarball = path.join(repoRoot, tarballName);
  const tarballPath = path.join(tarballDir, tarballName);
  fs.copyFileSync(sourceTarball, tarballPath);
  fs.unlinkSync(sourceTarball);

  run('npm', ['install', '-g', '--prefix', installRoot, tarballPath]);

  const binary = installedBinaryPath(installRoot);
  assert.ok(fs.existsSync(binary), `Expected installed CLI at ${binary}`);

  const version = run(binary, ['--version']);
  assert.ok(
    version.startsWith(`v${cliPkg.version}`),
    `Expected installed version to start with v${cliPkg.version}, got ${version}`,
  );

  const help = run(binary, ['--help']);
  assert.match(help, /CLI to interact with Nibras/);
  assert.match(help, /\blogin\b/);
  assert.match(help, /\bsubmit\b/);

  console.log(`Verified CLI download/install flow for v${cliPkg.version}`);
}

main();
