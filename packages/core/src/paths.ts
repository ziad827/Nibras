import os from 'node:os';
import path from 'node:path';

export function getDefaultApiBaseUrl(): string {
  return process.env.NIBRAS_API_BASE_URL || 'http://127.0.0.1:4848';
}

export function getGlobalConfigDirFor(args: {
  platform: NodeJS.Platform;
  homeDir: string;
  appData?: string;
  xdgConfigHome?: string;
}): string {
  const platformPath = args.platform === 'win32' ? path.win32 : path.posix;

  if (args.platform === 'win32') {
    return platformPath.join(
      args.appData || platformPath.join(args.homeDir, 'AppData', 'Roaming'),
      'nibras',
    );
  }
  if (args.platform === 'darwin') {
    return platformPath.join(
      args.homeDir,
      'Library',
      'Application Support',
      'nibras',
    );
  }
  return platformPath.join(
    args.xdgConfigHome || platformPath.join(args.homeDir, '.config'),
    'nibras',
  );
}

export function getGlobalConfigDir(): string {
  return getGlobalConfigDirFor({
    platform: process.platform,
    homeDir: os.homedir(),
    appData: process.env.APPDATA,
    xdgConfigHome: process.env.XDG_CONFIG_HOME,
  });
}

export function getGlobalConfigPath(): string {
  return path.join(getGlobalConfigDir(), 'config.json');
}
