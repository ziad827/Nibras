const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const readmePath = path.join(repoRoot, 'README.md');
const onboardingPath = path.join(
  repoRoot,
  'apps',
  'web',
  'app',
  '(app)',
  'instructor',
  'onboarding',
  'onboarding-page-content.tsx',
);
const onboardingHelperPath = path.join(
  repoRoot,
  'apps',
  'web',
  'app',
  '(app)',
  'instructor',
  'onboarding',
  'onboarding-content.js',
);
const studentGuidePath = path.join(repoRoot, 'docs', 'student-guide.md');
const packageJsonPath = path.join(repoRoot, 'package.json');
const cliPackageJsonPath = path.join(repoRoot, 'apps', 'cli', 'package.json');
const cliGuidePath = path.join(
  repoRoot,
  'Frontend',
  'client',
  'CLI',
  'cli.html',
);

function runCli(args) {
  return execFileSync(
    'node',
    [path.join(repoRoot, 'bin', 'nibras.js'), ...args],
    {
      cwd: repoRoot,
      encoding: 'utf8',
    },
  );
}

function getPublicCommands() {
  const helpText = runCli(['--help']);
  const commandsBlock = helpText.match(/COMMANDS\s+([\s\S]*?)\n\s+FLAGS/);
  assert.ok(commandsBlock, 'CLI help should contain a COMMANDS section');

  return commandsBlock[1]
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.match(/^([a-z-]+)\s{2,}/))
    .filter(Boolean)
    .map((match) => match[1]);
}

function commandDocSnippet(command) {
  if (command === 'setup') return 'nibras setup --project';
  if (command === 'update') return 'nibras update --version';
  if (command === 'update-buildpack') return 'nibras update-buildpack --node';
  if (command === 'legacy') return 'nibras legacy';
  return `nibras ${command}`;
}

test('README and onboarding docs cover every public CLI command', () => {
  const commands = getPublicCommands();
  const readme = fs.readFileSync(readmePath, 'utf8');
  const onboarding =
    fs.readFileSync(onboardingPath, 'utf8') +
    fs.readFileSync(onboardingHelperPath, 'utf8');

  for (const command of commands) {
    const snippet = commandDocSnippet(command);
    assert.match(
      readme,
      new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    );
    assert.match(
      onboarding,
      new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    );
  }
});

test('CLI install docs stay pinned to the current package tag and hosted login flow', () => {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const documentedTag = `v${pkg.version}`;
  const documentedPackageInstall = `npm install -g @nibras/cli@${pkg.version}`;
  const runtimeVersion = runCli(['--version']).trim();
  const readme = fs.readFileSync(readmePath, 'utf8');
  const onboarding =
    fs.readFileSync(onboardingPath, 'utf8') +
    fs.readFileSync(onboardingHelperPath, 'utf8');
  const studentGuide = fs.readFileSync(studentGuidePath, 'utf8');

  assert.ok(
    runtimeVersion.startsWith(documentedTag),
    `Expected runtime version ${runtimeVersion} to start with ${documentedTag}`,
  );

  assert.match(
    readme,
    new RegExp(documentedPackageInstall.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
  );
  assert.match(
    onboarding,
    new RegExp(documentedPackageInstall.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
  );
  assert.match(
    studentGuide,
    new RegExp(documentedPackageInstall.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
  );
  assert.match(
    readme,
    /nibras login --api-base-url https:\/\/nibras\.yourschool\.edu/,
  );
  assert.match(
    studentGuide,
    /nibras login --api-base-url https:\/\/nibras\.yourschool\.edu/,
  );
  assert.match(readme, /nibras update --check/);
  assert.match(onboarding, /CLI Command Reference/);
  assert.doesNotMatch(readme, /npm package is not yet published/i);
});

test('student guide removes stale CLI instructions', () => {
  const studentGuide = fs.readFileSync(studentGuidePath, 'utf8');

  assert.doesNotMatch(studentGuide, /~\/\.nibras\/cli\.json/);
  assert.doesNotMatch(studentGuide, /nibras setup cs161\/lab1/);
  assert.doesNotMatch(studentGuide, /nibras status/);
  assert.doesNotMatch(studentGuide, /same tests the server will run/);
  assert.doesNotMatch(studentGuide, /Access tokens expire after 8 hours/);

  assert.match(studentGuide, /%APPDATA%\\\\nibras\\\\config\.json/);
  assert.match(studentGuide, /nibras setup --project cs161\/lab1/);
  assert.match(studentGuide, /nibras ping/);
  assert.match(studentGuide, /manifest-configured/);
  assert.match(studentGuide, /submission still continues/i);
});

test('frontend CLI guide documents the v2 package install flow', () => {
  const cliPkg = JSON.parse(fs.readFileSync(cliPackageJsonPath, 'utf8'));
  const cliGuide = fs.readFileSync(cliGuidePath, 'utf8');
  const documentedPackageInstall = `npm install -g @nibras/cli@${cliPkg.version}`;

  assert.match(
    cliGuide,
    new RegExp(documentedPackageInstall.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
  );
  assert.match(cliGuide, /nibras setup --project/);
  assert.match(cliGuide, /nibras login --api-base-url/);
  assert.doesNotMatch(cliGuide, /v1\.0\.2/);
  assert.doesNotMatch(cliGuide, /NibrasPlatform\/nibras-cli/);
  assert.match(cliGuide, /nibras doctor/);
  assert.match(cliGuide, /EpitomeZied\/nibras/);
});

test('detectPreferredOsFromSignals picks platform from UA and saved preference', () => {
  const { detectPreferredOsFromSignals } = require('../Frontend/client/cli-shared.js');

  assert.equal(
    detectPreferredOsFromSignals(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      'Linux x86_64',
      null,
    ),
    'linux',
  );
  assert.equal(
    detectPreferredOsFromSignals(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      'MacIntel',
      null,
    ),
    'macos',
  );
  assert.equal(
    detectPreferredOsFromSignals(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Win32',
      null,
    ),
    'windows',
  );
  assert.equal(
    detectPreferredOsFromSignals('Mozilla/5.0', 'Linux x86_64', 'macos'),
    'macos',
  );
});

test('frontend CLI guide OS tabs expose data-os selectors', () => {
  const cliGuide = fs.readFileSync(cliGuidePath, 'utf8');
  assert.match(cliGuide, /data-os="macos"/);
  assert.match(cliGuide, /data-os="linux"/);
  assert.match(cliGuide, /data-os="windows"/);
  assert.match(cliGuide, /win-only-note/);
  assert.doesNotMatch(cliGuide, /os-content windows" style="display:block/);
});
