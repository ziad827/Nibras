#!/usr/bin/env node
/**
 * Full modern CLI E2E for cs161/exam1.
 * Spins up a local FileStore API (no GitHub/ngrok required) and runs the
 * login → setup → test → submit flow from TEST_SCENARIO.md / the E2E plan.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const projectDir = '/tmp/nibras-e2e';

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    encoding: 'utf8',
    cwd: options.cwd || repoRoot,
    env: { ...process.env, ...(options.env || {}) },
    stdio: options.stdio || 'pipe',
  });
  if (options.allowFail) {
    return result;
  }
  if (result.status !== 0) {
    throw new Error(
      `${cmd} ${args.join(' ')} failed (${result.status}):\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
    );
  }
  return result;
}

async function startApi(storePath) {
  const { buildApp } = await import('../apps/api/dist/app.js');
  const { FileStore } = await import('../apps/api/dist/store.js');
  process.env.NIBRAS_API_STORE = storePath;
  delete process.env.DATABASE_URL;
  const app = buildApp(new FileStore(storePath));
  await app.listen({ port: 0, host: '127.0.0.1' });
  const address = app.server.address();
  return {
    apiBaseUrl: `http://127.0.0.1:${address.port}`,
    close: () => app.close(),
  };
}

async function createSession(apiBaseUrl) {
  const started = await fetch(`${apiBaseUrl}/v1/device/start`, {
    method: 'POST',
  }).then((r) => r.json());
  await fetch(
    `${apiBaseUrl}/dev/approve?user_code=${encodeURIComponent(started.userCode)}`,
  );
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const polled = await fetch(`${apiBaseUrl}/v1/device/poll`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deviceCode: started.deviceCode }),
    }).then((r) => r.json());
    if (polled.status === 'authorized') {
      return polled;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Device login was not authorized in time');
}

function writeCliConfig(configRoot, apiBaseUrl, session) {
  const configDir = path.join(configRoot, 'nibras');
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(
    path.join(configDir, 'config.json'),
    JSON.stringify(
      {
        apiBaseUrl,
        activeUserId: session.user.id,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        tokenCreatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
}

function runGit(args, options = {}) {
  return run('git', args, options);
}

function runCli(args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'node',
      [path.join(repoRoot, 'apps/cli/dist/index.js'), ...args],
      {
        cwd: options.cwd || repoRoot,
        env: { ...process.env, ...(options.env || {}) },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (!options.quiet) {
        if (stdout) process.stdout.write(stdout);
        if (stderr) process.stderr.write(stderr);
      }
      if (code !== 0 && !options.allowFail) {
        reject(
          new Error(
            `nibras ${args.join(' ')} failed (${code}):\nstdout: ${stdout}\nstderr: ${stderr}`,
          ),
        );
        return;
      }
      resolve({ status: code, stdout, stderr });
    });
  });
}

function writeSolutionFiles(root) {
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.mkdirSync(path.join(root, 'test'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'src/solution.js'),
    `function sum(a, b) {
  return a + b;
}

function factorial(n) {
  if (n < 0) throw new RangeError('n must be non-negative');
  let result = 1;
  for (let i = 2; i <= n; i += 1) result *= i;
  return result;
}

function isPalindrome(str) {
  const normalized = String(str).toLowerCase();
  return normalized === [...normalized].reverse().join('');
}

module.exports = { sum, factorial, isPalindrome };
`,
  );
  fs.writeFileSync(
    path.join(root, 'test/solution.test.js'),
    `const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sum, factorial, isPalindrome } = require('../src/solution.js');

test('sum', () => {
  assert.equal(sum(2, 3), 5);
  assert.equal(sum(-1, 1), 0);
});

test('factorial', () => {
  assert.equal(factorial(0), 1);
  assert.equal(factorial(5), 120);
});

test('isPalindrome', () => {
  assert.equal(isPalindrome('racecar'), true);
  assert.equal(isPalindrome('hello'), false);
  assert.equal(isPalindrome('Madam'), true);
});
`,
  );
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify(
      {
        name: 'cs161-exam1',
        private: true,
        scripts: { test: 'node --test test/solution.test.js' },
      },
      null,
      2,
    ),
  );
}

async function wireBareRemote(storePath, apiBaseUrl, userId, bareRemote) {
  const { FileStore } = await import('../apps/api/dist/store.js');
  const store = new FileStore(storePath);
  const data = store.read(apiBaseUrl);
  const project = data.projects.find(
    (entry) => entry.projectKey === 'cs161/exam1',
  );
  if (!project) throw new Error('cs161/exam1 not found in store');
  project.repoByUserId[userId] = {
    owner: 'demo-user',
    name: 'nibras-cs161-exam1',
    cloneUrl: bareRemote,
    defaultBranch: 'main',
    visibility: 'private',
  };
  store.write(data);
}

async function main() {
  console.log('==> Building packages (if needed)');
  const build = run('npm', ['run', 'build'], {
    stdio: 'pipe',
    allowFail: true,
  });
  if (
    build.status !== 0 &&
    !fs.existsSync(path.join(repoRoot, 'apps/cli/dist/index.js'))
  ) {
    throw new Error(`npm run build failed:\n${build.stderr}`);
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nibras-cli-e2e-'));
  const storePath = path.join(tmp, 'store.json');
  const configRoot = path.join(tmp, 'config');
  const bareRemote = path.join(tmp, 'remote.git');

  console.log('==> Starting local FileStore API');
  const server = await startApi(storePath);
  const cliEnv = { XDG_CONFIG_HOME: configRoot };

  try {
    console.log('==> CLI login (device flow + /dev/approve)');
    const session = await createSession(server.apiBaseUrl);
    writeCliConfig(configRoot, server.apiBaseUrl, session);

    console.log('==> whoami / list / ping / doctor');
    await runCli(['whoami', '--plain'], { env: cliEnv });
    await runCli(['list', '--verbose', '--plain'], { env: cliEnv });
    await runCli(['ping', '--plain'], { env: cliEnv });
    await runCli(['doctor', '--plain'], { env: cliEnv });

    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
    fs.mkdirSync(projectDir, { recursive: true });

    console.log('==> setup --project cs161/exam1');
    await runCli(
      ['setup', '--project', 'cs161/exam1', '--dir', projectDir, '--plain'],
      {
        env: cliEnv,
      },
    );
    await runCli(['task', '--plain'], { cwd: projectDir, env: cliEnv });
    await runCli(['milestones', '--plain'], { cwd: projectDir, env: cliEnv });

    console.log('==> Writing solution files');
    writeSolutionFiles(projectDir);

    runGit(['init', '--bare', bareRemote]);
    await wireBareRemote(
      storePath,
      server.apiBaseUrl,
      session.user.id,
      bareRemote,
    );
    runGit(['remote', 'set-url', 'origin', bareRemote], { cwd: projectDir });
    runGit(['config', 'user.name', 'Nibras E2E'], { cwd: projectDir });
    runGit(['config', 'user.email', 'e2e@nibras.dev'], { cwd: projectDir });
    runGit(['add', 'src', 'test', 'package.json'], { cwd: projectDir });
    runGit(['commit', '-m', 'Add exam 1 solution'], { cwd: projectDir });
    runGit(['push', '-u', 'origin', 'main'], { cwd: projectDir });

    console.log('==> nibras test');
    await runCli(['test', '--plain'], { cwd: projectDir, env: cliEnv });

    console.log('==> nibras submit');
    await runCli(['submit', '--plain'], { cwd: projectDir, env: cliEnv });

    console.log('==> nibras status');
    await runCli(['status', '--plain'], { env: cliEnv });

    console.log('\n✅ Full CLI E2E passed');
    console.log(`   Project dir: ${projectDir}`);
    console.log(`   API: ${server.apiBaseUrl}`);
  } finally {
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
