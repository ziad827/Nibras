import {
  GitHubConfigResponseSchema,
  GitHubInstallationSyncResponseSchema,
  GitHubInstallUrlResponseSchema,
} from '@nibras/contracts';
import { ApiError, apiRequest } from '@nibras/core';
import { createSpinner } from '../ui/spinner';
import { printBox } from '../ui/box';
import { tryOpenBrowser } from './login-browser';

const INSTALL_POLL_INTERVAL_MS = 5000;
const INSTALL_TIMEOUT_MS = 3 * 60 * 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isGitHubUnavailable(err: unknown): boolean {
  return err instanceof ApiError && (err.statusCode === 503 || err.statusCode === 404);
}

export async function syncGitHubAppInstallation(
  apiBaseUrl: string,
): Promise<{ githubAppInstalled: boolean }> {
  const synced = GitHubInstallationSyncResponseSchema.parse(
    await apiRequest(
      '/v1/github/installations/sync',
      { method: 'POST' },
      apiBaseUrl,
    ),
  );
  return { githubAppInstalled: synced.githubAppInstalled };
}

export async function ensureGitHubAppInstalled(
  apiBaseUrl: string,
  plain: boolean,
  noOpen: boolean,
): Promise<{ githubAppInstalled: boolean }> {
  try {
    const synced = await syncGitHubAppInstallation(apiBaseUrl);
    if (synced.githubAppInstalled) {
      return synced;
    }
  } catch (err) {
    if (isGitHubUnavailable(err)) {
      return { githubAppInstalled: false };
    }
    throw err;
  }

  let config;
  try {
    config = GitHubConfigResponseSchema.parse(
      await apiRequest('/v1/github/config', { method: 'GET' }, apiBaseUrl),
    );
  } catch (err) {
    if (isGitHubUnavailable(err)) {
      return { githubAppInstalled: false };
    }
    throw err;
  }

  if (!config.configured || !config.webBaseUrl) {
    return { githubAppInstalled: false };
  }

  const returnTo = `${config.webBaseUrl.replace(/\/$/, '')}/Settings/settings.html`;
  const installPayload = GitHubInstallUrlResponseSchema.parse(
    await apiRequest(
      `/v1/github/install-url?return_to=${encodeURIComponent(returnTo)}`,
      { method: 'GET' },
      apiBaseUrl,
    ),
  );

  printBox(
    'Install the Nibras GitHub App',
    [
      `Open in browser: ${installPayload.installUrl}`,
      noOpen ? 'Browser launch: disabled' : 'Browser launch: automatic',
      'Approve repository access, then return to this terminal.',
      'You can also finish in Settings if the browser stays open.',
    ],
    'info',
    plain,
  );

  if (!noOpen) {
    void tryOpenBrowser(installPayload.installUrl);
  }

  const spinner = createSpinner('Waiting for GitHub App installation', plain);
  const deadline = Date.now() + INSTALL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await sleep(INSTALL_POLL_INTERVAL_MS);
    try {
      const polled = await syncGitHubAppInstallation(apiBaseUrl);
      if (polled.githubAppInstalled) {
        spinner.succeed('GitHub App installed');
        return polled;
      }
    } catch {
      // Keep polling until timeout.
    }
  }

  spinner.fail('GitHub App installation timed out');
  printBox(
    'GitHub App not installed yet',
    [
      'Run `nibras login` again after installing the app.',
      'Or install from Settings in the web dashboard.',
      'Check status with `nibras ping`.',
    ],
    'warning',
    plain,
  );
  return { githubAppInstalled: false };
}
