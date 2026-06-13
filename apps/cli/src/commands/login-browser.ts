import { spawn } from 'node:child_process';

export type BrowserLaunchPlan = {
  command: string;
  args: string[];
};

function escapePowerShellSingleQuotes(value: string): string {
  return value.replace(/'/g, "''");
}

export function getBrowserLaunchPlans(
  platform: NodeJS.Platform,
  url: string,
): BrowserLaunchPlan[] {
  if (platform === 'darwin') {
    return [{ command: 'open', args: [url] }];
  }
  if (platform === 'win32') {
    return [
      { command: 'cmd', args: ['/c', 'start', '', url] },
      {
        command: 'powershell',
        args: [
          '-NoProfile',
          '-Command',
          `Start-Process '${escapePowerShellSingleQuotes(url)}'`,
        ],
      },
    ];
  }
  return [{ command: 'xdg-open', args: [url] }];
}

function spawnLaunchPlan(plan: BrowserLaunchPlan): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(plan.command, plan.args, {
      detached: true,
      stdio: 'ignore',
    });
    child.once('error', reject);
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
  });
}

export async function tryOpenBrowser(
  url: string,
  platform: NodeJS.Platform = process.platform,
): Promise<boolean> {
  const plans = getBrowserLaunchPlans(platform, url);
  for (const plan of plans) {
    try {
      await spawnLaunchPlan(plan);
      return true;
    } catch {
      continue;
    }
  }
  return false;
}
