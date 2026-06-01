import { rateLimited } from './rate-limiter';
import type { PlatformFetcher, RawUserStats } from './types';

const BASE = 'https://www.hackerrank.com/rest';
const DELAY_MS = 1500;
const HR_USER_AGENT =
  'Mozilla/5.0 (compatible; Nibras/1.0; +https://github.com/NibrasPlatform/Nibras)';

export const HR_CERTIFICATIONS_NOTE =
  'HackerRank certifications require SkillUp enterprise OAuth; only public skill badges are synced via the REST API.';

export type HackerRankSkill = {
  id: string;
  name: string;
  stars: number;
  level?: string;
  points?: number;
  solved?: number;
  totalChallenges?: number;
};

export type HackerRankBadgeModel = {
  badge_type?: string;
  badge_name?: string;
  stars?: number;
  level?: number;
  upcoming_level?: string;
  current_points?: number;
  total_points?: number;
  solved?: number;
  total_challenges?: number;
};

async function hrGet<T>(path: string): Promise<T> {
  return rateLimited('hackerrank', DELAY_MS, async () => {
    const res = await fetch(`${BASE}${path}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': HR_USER_AGENT,
      },
    });
    if (!res.ok) throw new Error(`HackerRank API ${res.status}`);
    return (await res.json()) as T;
  });
}

export function mapBadgeModels(
  models: HackerRankBadgeModel[],
): HackerRankSkill[] {
  return models
    .filter((m) => m.badge_type && m.badge_name)
    .map((m) => ({
      id: m.badge_type!,
      name: m.badge_name!,
      stars: m.stars ?? 0,
      level:
        m.upcoming_level ?? (m.level != null ? String(m.level) : undefined),
      points: m.current_points ?? m.total_points,
      solved: m.solved,
      totalChallenges: m.total_challenges,
    }));
}

export function buildHackerRankMetadata(
  skills: HackerRankSkill[],
  badgesError?: string,
): Record<string, unknown> {
  return {
    skills,
    certifications: [],
    certificationsNote: HR_CERTIFICATIONS_NOTE,
    ...(badgesError ? { badgesSyncError: badgesError } : {}),
    syncedAt: new Date().toISOString(),
  };
}

async function fetchBadges(handle: string): Promise<HackerRankSkill[]> {
  const data = await hrGet<{ models?: HackerRankBadgeModel[] }>(
    `/hackers/${encodeURIComponent(handle)}/badges`,
  );
  return mapBadgeModels(data.models ?? []);
}

export const hackerrankFetcher: PlatformFetcher = {
  async fetchContests() {
    return await Promise.resolve([]);
  },

  async fetchProblems() {
    return await Promise.resolve([]);
  },

  async verifyHandle(handle: string) {
    try {
      const data = await hrGet<{ model?: { username?: string } }>(
        `/hackers/${encodeURIComponent(handle)}/profile`,
      );
      return { valid: Boolean(data.model?.username) };
    } catch {
      return { valid: false };
    }
  },

  async fetchUserStats(handle: string): Promise<RawUserStats> {
    let rating = 0;
    let maxRating = 0;

    try {
      const data = await hrGet<{
        model?: {
          contest_rating?: number;
          contest_rating_peak?: number;
        };
      }>(`/hackers/${encodeURIComponent(handle)}/profile`);
      rating = data.model?.contest_rating ?? 0;
      maxRating = data.model?.contest_rating_peak ?? rating;
    } catch {
      /* profile optional for metadata-only sync */
    }

    let skills: HackerRankSkill[] = [];
    let badgesError: string | undefined;
    try {
      skills = await fetchBadges(handle);
    } catch (err) {
      badgesError =
        err instanceof Error ? err.message : 'Failed to fetch skill badges';
    }

    return {
      rating,
      maxRating,
      contestHistory: [],
      solvedProblemIds: [],
      metadata: buildHackerRankMetadata(skills, badgesError),
    };
  },
};
