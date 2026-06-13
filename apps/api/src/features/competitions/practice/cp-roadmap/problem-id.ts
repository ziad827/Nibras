import type { CompPlatform } from '@prisma/client';

export type ParsedRoadmapProblemKey = {
  platform: Extract<CompPlatform, 'codeforces' | 'leetcode' | 'atcoder'>;
  platformProblemId: string;
};

/** Map a roadmap problem URL to a platform key for live sync, when possible. */
export function parseRoadmapProblemUrl(
  url: string,
): ParsedRoadmapProblemKey | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');

    if (host === 'leetcode.com') {
      const match = parsed.pathname.match(/^\/problems\/([^/]+)\/?$/);
      if (match) {
        return { platform: 'leetcode', platformProblemId: match[1] };
      }
      return null;
    }

    if (host === 'codeforces.com') {
      const contestMatch = parsed.pathname.match(
        /^\/contest\/(\d+)\/problem\/([A-Z]\d*)$/i,
      );
      if (contestMatch) {
        return {
          platform: 'codeforces',
          platformProblemId: `${contestMatch[1]}${contestMatch[2].toUpperCase()}`,
        };
      }

      const problemsetMatch = parsed.pathname.match(
        /^\/problemset\/problem\/(\d+)\/([A-Z]\d*)$/i,
      );
      if (problemsetMatch) {
        return {
          platform: 'codeforces',
          platformProblemId: `${problemsetMatch[1]}${problemsetMatch[2].toUpperCase()}`,
        };
      }

      const gymMatch = parsed.pathname.match(
        /^\/gym\/(\d+)\/problem\/([A-Z]\d*)$/i,
      );
      if (gymMatch) {
        return {
          platform: 'codeforces',
          platformProblemId: `${gymMatch[1]}${gymMatch[2].toUpperCase()}`,
        };
      }

      const acmsguruMatch = parsed.pathname.match(
        /^\/problemsets\/acmsguru\/problem\/(\d+)\/(\d+)$/i,
      );
      if (acmsguruMatch) {
        return {
          platform: 'codeforces',
          platformProblemId: `acmsguru_${acmsguruMatch[1]}_${acmsguruMatch[2]}`,
        };
      }
    }

    if (host === 'atcoder.jp') {
      const match = parsed.pathname.match(
        /^\/contests\/[^/]+\/tasks\/([^/]+)\/?$/i,
      );
      if (match) {
        return { platform: 'atcoder', platformProblemId: match[1]! };
      }
    }
  } catch {
    return null;
  }

  return null;
}

const HOST_PLATFORM: Record<string, string> = {
  'codeforces.com': 'codeforces',
  'leetcode.com': 'leetcode',
  'atcoder.jp': 'atcoder',
  'codechef.com': 'codechef',
  'www.codechef.com': 'codechef',
  'spoj.com': 'spoj',
  'www.spoj.com': 'spoj',
  'cses.fi': 'cses',
  'vjudge.net': 'vjudge',
  'judge.yosupo.jp': 'yosupo',
  'lightoj.com': 'lightoj',
  'kattis.com': 'kattis',
  'open.kattis.com': 'kattis',
  'hackerrank.com': 'hackerrank',
  'www.hackerrank.com': 'hackerrank',
  'hackerearth.com': 'hackerearth',
  'www.hackerearth.com': 'hackerearth',
  'csacademy.com': 'csacademy',
  'timus.online': 'timus',
  'acmp.ru': 'acmp',
  'onlinejudge.org': 'uva',
  'usaco.org': 'usaco',
  'dmoj.ca': 'dmoj',
  'oj.uz': 'oj_uz',
  'toph.co': 'toph',
  'github.com': 'github',
  'cp-algorithms.com': 'cp_algorithms',
};

/** Detect display/sync platform key from any roadmap URL. */
export function detectSourcePlatform(url: string): string {
  const parsed = parseRoadmapProblemUrl(url);
  if (parsed) return parsed.platform;

  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (HOST_PLATFORM[host]) return HOST_PLATFORM[host];
    if (host.includes('codeforces')) return 'codeforces';
    if (host.includes('atcoder')) return 'atcoder';
    if (host.includes('spoj')) return 'spoj';
    return host.split('.')[0] || 'other';
  } catch {
    return 'other';
  }
}
