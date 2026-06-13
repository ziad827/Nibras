const test = require('node:test');
const assert = require('node:assert/strict');

test('browser launch plans are platform-aware', () => {
  const {
    getBrowserLaunchPlans,
  } = require('../apps/cli/dist/commands/login-browser.js');

  assert.deepEqual(getBrowserLaunchPlans('darwin', 'https://example.com'), [
    { command: 'open', args: ['https://example.com'] },
  ]);

  assert.deepEqual(getBrowserLaunchPlans('linux', 'https://example.com'), [
    { command: 'xdg-open', args: ['https://example.com'] },
  ]);

  assert.deepEqual(getBrowserLaunchPlans('win32', 'https://example.com'), [
    { command: 'cmd', args: ['/c', 'start', '', 'https://example.com'] },
    {
      command: 'powershell',
      args: ['-NoProfile', '-Command', "Start-Process 'https://example.com'"],
    },
  ]);
});

test('global config paths resolve per platform', () => {
  const { getGlobalConfigDirFor } = require('../packages/core/dist/paths.js');

  assert.equal(
    getGlobalConfigDirFor({
      platform: 'darwin',
      homeDir: '/Users/zied',
    }),
    '/Users/zied/Library/Application Support/nibras',
  );

  assert.equal(
    getGlobalConfigDirFor({
      platform: 'linux',
      homeDir: '/home/zied',
      xdgConfigHome: '/tmp/xdg',
    }),
    '/tmp/xdg/nibras',
  );

  assert.equal(
    getGlobalConfigDirFor({
      platform: 'win32',
      homeDir: 'C:\\Users\\Zied',
      appData: 'C:\\Users\\Zied\\AppData\\Roaming',
    }),
    'C:\\Users\\Zied\\AppData\\Roaming\\nibras',
  );
});

test('project test command resolution prefers the matching platform override', () => {
  const {
    buildProjectTestCommand,
    resolveProjectTestCommand,
  } = require('../packages/core/dist/manifest.js');

  const testConfig = {
    mode: 'command',
    command: 'npm test',
    commands: {
      default: 'npm test',
      windows: 'npm run test:win',
      macos: 'npm run test:mac',
      linux: 'npm run test:linux',
      unix: 'npm run test:unix',
    },
    supportsPrevious: true,
  };

  assert.equal(
    resolveProjectTestCommand(testConfig, 'win32'),
    'npm run test:win',
  );
  assert.equal(
    resolveProjectTestCommand(testConfig, 'darwin'),
    'npm run test:mac',
  );
  assert.equal(
    resolveProjectTestCommand(testConfig, 'linux'),
    'npm run test:linux',
  );
  assert.equal(
    resolveProjectTestCommand(testConfig, 'freebsd'),
    'npm run test:unix',
  );
  assert.equal(
    buildProjectTestCommand(testConfig, 'win32', ['--previous']),
    'npm run test:win --previous',
  );
  assert.equal(
    resolveProjectTestCommand(
      { mode: 'command', command: 'npm test', supportsPrevious: false },
      'win32',
    ),
    'npm test',
  );
});

test('onboarding helper prefers the configured hosted API for split-domain deployments', async () => {
  const { discoverOnboardingApiBaseUrl } =
    await import('../apps/web/app/(app)/instructor/onboarding/onboarding-content.js');
  const attempted = [];

  const apiBaseUrl = await discoverOnboardingApiBaseUrl({
    configuredApiBaseUrl: 'https://api.example',
    pageOrigin: 'https://nibras.example',
    probe: async (candidate) => {
      attempted.push(candidate);
      return candidate === 'https://api.example';
    },
  });

  assert.equal(apiBaseUrl, 'https://api.example');
  assert.deepEqual(attempted, ['https://api.example']);
});

test('onboarding helper falls back to same-origin when the web app proxies /v1', async () => {
  const { discoverOnboardingApiBaseUrl } =
    await import('../apps/web/app/(app)/instructor/onboarding/onboarding-content.js');
  const attempted = [];

  const apiBaseUrl = await discoverOnboardingApiBaseUrl({
    configuredApiBaseUrl: null,
    pageOrigin: 'https://nibras.example',
    probe: async (candidate) => {
      attempted.push(candidate);
      return candidate === 'https://nibras.example';
    },
  });

  assert.equal(apiBaseUrl, 'https://nibras.example');
  assert.deepEqual(attempted, ['https://nibras.example']);
});

test('onboarding helper renders Windows shell-specific snippets', async () => {
  const {
    buildHostedLoginCommand,
    buildStudentQuickStart,
    getInstallTroubleshootingCommand,
    getOnboardingConfigPath,
    getOnboardingDirExample,
  } =
    await import('../apps/web/app/(app)/instructor/onboarding/onboarding-content.js');

  assert.equal(
    getOnboardingConfigPath('mac'),
    '~/Library/Application Support/nibras/config.json',
  );
  assert.equal(
    getOnboardingConfigPath('linux'),
    '~/.config/nibras/config.json',
  );
  assert.equal(
    getOnboardingConfigPath('windows'),
    '%APPDATA%\\nibras\\config.json',
  );
  assert.equal(
    getOnboardingDirExample('windows', 'powershell'),
    'nibras setup --project cs101/a1 --dir C:\\projects\\a1',
  );
  assert.equal(
    getOnboardingDirExample('windows', 'gitbash'),
    'nibras setup --project cs101/a1 --dir /c/projects/a1',
  );
  assert.match(
    getInstallTroubleshootingCommand('windows', 'powershell'),
    /Remove-Item/,
  );
  assert.match(getInstallTroubleshootingCommand('windows', 'gitbash'), /rm -f/);
  assert.equal(
    buildHostedLoginCommand('https://api.example/'),
    'nibras login --api-base-url https://api.example',
  );
  assert.match(
    buildStudentQuickStart('https://api.example'),
    /nibras login --api-base-url https:\/\/api\.example/,
  );
});

test('onboarding helper surfaces a reachable-API warning when discovery fails', async () => {
  const { discoverApiBaseUrlWith } =
    await import('../apps/web/app/lib/session-core.js');

  await assert.rejects(
    () =>
      discoverApiBaseUrlWith({
        configuredApiBaseUrl: 'https://api.example',
        pageOrigin: 'https://nibras.example',
        probe: async () => false,
      }),
    /Unable to reach the Nibras API/,
  );
});
