type GitHubUserProfile = {
  id: number;
  login: string;
  name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
};

type GitHubEmailEntry = {
  email: string;
  primary: boolean;
  verified: boolean;
};

const GITHUB_HEADERS = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'Nibras',
};

export async function resolveGitHubUserEmail(
  accessToken: string,
  profile: GitHubUserProfile,
): Promise<string> {
  if (profile.email) {
    return profile.email;
  }

  const emailsRes = await fetch('https://api.github.com/user/emails', {
    headers: {
      ...GITHUB_HEADERS,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (emailsRes.ok) {
    const emails = (await emailsRes.json()) as GitHubEmailEntry[];
    const primaryVerified = emails.find((e) => e.primary && e.verified);
    const anyVerified = emails.find((e) => e.verified);
    const pick = primaryVerified ?? anyVerified ?? emails[0];
    if (pick?.email) {
      return pick.email;
    }
  }

  return `${profile.id}+${profile.login}@users.noreply.github.com`;
}

export async function fetchGitHubUserProfile(accessToken: string): Promise<{
  profile: GitHubUserProfile;
  email: string;
}> {
  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      ...GITHUB_HEADERS,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!userRes.ok) {
    throw new Error(`GitHub user request failed (${userRes.status}).`);
  }

  const profile = (await userRes.json()) as GitHubUserProfile;
  const email = await resolveGitHubUserEmail(accessToken, profile);
  return { profile, email };
}

export async function exchangeGitHubCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub token exchange failed (${response.status}).`);
  }

  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!data.access_token) {
    throw new Error(
      data.error_description || data.error || 'GitHub token exchange failed.',
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export function buildGitHubOAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string,
): string {
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', 'read:user user:email');
  url.searchParams.set('state', state);
  return url.toString();
}
