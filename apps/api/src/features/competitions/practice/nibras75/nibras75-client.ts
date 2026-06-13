import { PrismaClient } from '@prisma/client';
import { getLcUserStatus, questionUrl } from '../leetcode/lc-api';
import { companyIconUrl, pickCompaniesForProblem } from './companies';
import {
  NIBRAS_75_CURRICULUM,
  NIBRAS_75_TOTAL,
  type Nibras75Entry,
} from './curriculum';
export type Nibras75CompanyDto = {
  id: string;
  name: string;
  domain: string;
  iconUrl: string;
};

export type Nibras75ProblemRow = {
  rank: number;
  problemId: string;
  name: string;
  url: string;
  difficulty: string;
  description: string;
  tags: string[];
  askedByCount: number;
  companies: Nibras75CompanyDto[];
  solved: boolean;
  attempted: boolean;
  userMarked: boolean;
  acRate?: number;
  reviewAt?: string | null;
};

export type Nibras75ProblemsQuery = {
  q?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  solved?: 'true' | 'false';
  tag?: string;
  company?: string;
  sort?: 'rank' | 'difficulty' | 'askedByCount';
  reviewDue?: 'true' | 'false';
};

export function mergeNibras75Status(
  slug: string,
  dbProgress: Map<string, { solved: boolean; attempted: boolean }>,
  lcStatus: Map<string, { solved: boolean; attempted: boolean }>,
): { solved: boolean; attempted: boolean; userMarked: boolean } {
  const db = dbProgress.get(slug);
  if (db !== undefined) {
    return { solved: db.solved, attempted: db.attempted, userMarked: true };
  }
  const lc = lcStatus.get(slug);
  return {
    solved: lc?.solved ?? false,
    attempted: lc?.attempted ?? false,
    userMarked: false,
  };
}

export function matchesNibras75Query(
  entry: Nibras75Entry,
  query: Nibras75ProblemsQuery,
  companyIds?: string[],
): boolean {
  if (query.q?.trim()) {
    const q = query.q.trim().toLowerCase();
    if (
      !entry.title.toLowerCase().includes(q) &&
      !entry.slug.includes(q) &&
      !entry.tags.some((t) => t.includes(q))
    ) {
      return false;
    }
  }
  if (query.difficulty) {
    const label =
      query.difficulty === 'easy'
        ? 'Easy'
        : query.difficulty === 'medium'
          ? 'Medium'
          : 'Hard';
    if (entry.difficulty !== label) return false;
  }
  if (query.tag?.trim()) {
    const tag = query.tag.trim().toLowerCase();
    if (!entry.tags.some((t) => t.toLowerCase() === tag)) return false;
  }
  if (query.company?.trim()) {
    const company = query.company.trim().toLowerCase();
    if (!companyIds?.some((id) => id.toLowerCase() === company)) return false;
  }
  return true;
}

export function matchesNibras75ReviewDue(
  slug: string,
  query: Nibras75ProblemsQuery,
  reviewAtBySlug: Map<string, Date | null>,
): boolean {
  if (query.reviewDue !== 'true') return true;
  const reviewAt = reviewAtBySlug.get(slug);
  if (!reviewAt) return false;
  return reviewAt.getTime() <= Date.now();
}

const DIFFICULTY_ORDER: Record<string, number> = {
  Easy: 0,
  Medium: 1,
  Hard: 2,
};

export function sortNibras75Rows(
  rows: Nibras75ProblemRow[],
  sort: Nibras75ProblemsQuery['sort'],
): Nibras75ProblemRow[] {
  const mode = sort ?? 'rank';
  const sorted = [...rows];
  if (mode === 'difficulty') {
    sorted.sort(
      (a, b) =>
        (DIFFICULTY_ORDER[a.difficulty] ?? 1) -
          (DIFFICULTY_ORDER[b.difficulty] ?? 1) || a.rank - b.rank,
    );
  } else if (mode === 'askedByCount') {
    sorted.sort((a, b) => b.askedByCount - a.askedByCount || a.rank - b.rank);
  } else {
    sorted.sort((a, b) => a.rank - b.rank);
  }
  return sorted;
}

async function loadDbProgress(
  prisma: PrismaClient,
  userId: string | undefined,
): Promise<{
  status: Map<string, { solved: boolean; attempted: boolean }>;
  reviewAt: Map<string, Date | null>;
}> {
  const status = new Map<string, { solved: boolean; attempted: boolean }>();
  const reviewAt = new Map<string, Date | null>();
  if (!userId) return { status, reviewAt };

  const slugs = new Set(NIBRAS_75_CURRICULUM.map((e) => e.slug));
  const progress = await prisma.userProblemProgress.findMany({
    where: { userId, problem: { platform: 'leetcode' } },
    select: {
      solved: true,
      reviewAt: true,
      problem: { select: { platformProblemId: true } },
    },
  });

  for (const row of progress) {
    const slug = row.problem.platformProblemId;
    if (!slugs.has(slug)) continue;
    status.set(slug, { solved: row.solved, attempted: true });
    reviewAt.set(slug, row.reviewAt);
  }
  return { status, reviewAt };
}

function findCurriculumEntry(slug: string): Nibras75Entry | undefined {
  return NIBRAS_75_CURRICULUM.find((e) => e.slug === slug);
}

export async function setNibras75ProblemSolved(
  prisma: PrismaClient,
  userId: string,
  slug: string,
  solved: boolean,
): Promise<{ solved: boolean; problemId: string }> {
  const entry = findCurriculumEntry(slug);
  if (!entry) {
    throw new Error('Problem is not part of Nibras 75');
  }

  const problem = await prisma.problem.upsert({
    where: {
      platform_platformProblemId: {
        platform: 'leetcode',
        platformProblemId: slug,
      },
    },
    create: {
      platform: 'leetcode',
      platformProblemId: slug,
      title: entry.title,
      url: questionUrl(slug),
      difficulty:
        entry.difficulty === 'Easy'
          ? 800
          : entry.difficulty === 'Medium'
            ? 1500
            : 2200,
      tags: entry.tags,
    },
    update: {
      title: entry.title,
      url: questionUrl(slug),
    },
  });

  await prisma.userProblemProgress.upsert({
    where: { userId_problemId: { userId, problemId: problem.id } },
    create: {
      userId,
      problemId: problem.id,
      solved,
      solvedAt: solved ? new Date() : null,
    },
    update: {
      solved,
      solvedAt: solved ? new Date() : null,
    },
  });

  return { solved, problemId: slug };
}

export async function clearNibras75ManualProgress(
  prisma: PrismaClient,
  userId: string,
  slug: string,
): Promise<{ cleared: boolean; problemId: string }> {
  const entry = findCurriculumEntry(slug);
  if (!entry) {
    throw new Error('Problem is not part of Nibras 75');
  }

  const problem = await prisma.problem.findUnique({
    where: {
      platform_platformProblemId: {
        platform: 'leetcode',
        platformProblemId: slug,
      },
    },
  });

  if (!problem) {
    return { cleared: false, problemId: slug };
  }

  await prisma.userProblemProgress.deleteMany({
    where: { userId, problemId: problem.id },
  });

  return { cleared: true, problemId: slug };
}

export async function getNibras75ProblemNote(
  prisma: PrismaClient,
  userId: string,
  slug: string,
): Promise<{ slug: string; note: string }> {
  const entry = findCurriculumEntry(slug);
  if (!entry) throw new Error('Problem is not part of Nibras 75');

  const row = await prisma.nibras75ProblemNote.findUnique({
    where: { userId_slug: { userId, slug } },
  });
  return { slug, note: row?.note ?? '' };
}

export async function upsertNibras75ProblemNote(
  prisma: PrismaClient,
  userId: string,
  slug: string,
  note: string,
): Promise<{ slug: string; note: string }> {
  const entry = findCurriculumEntry(slug);
  if (!entry) throw new Error('Problem is not part of Nibras 75');

  const row = await prisma.nibras75ProblemNote.upsert({
    where: { userId_slug: { userId, slug } },
    create: { userId, slug, note },
    update: { note },
  });
  return { slug: row.slug, note: row.note };
}

export async function setNibras75ReviewAt(
  prisma: PrismaClient,
  userId: string,
  slug: string,
  reviewAt: string | null,
): Promise<{ slug: string; reviewAt: string | null }> {
  const entry = findCurriculumEntry(slug);
  if (!entry) throw new Error('Problem is not part of Nibras 75');

  const problem = await prisma.problem.upsert({
    where: {
      platform_platformProblemId: {
        platform: 'leetcode',
        platformProblemId: slug,
      },
    },
    create: {
      platform: 'leetcode',
      platformProblemId: slug,
      title: entry.title,
      url: questionUrl(slug),
      difficulty:
        entry.difficulty === 'Easy'
          ? 1000
          : entry.difficulty === 'Hard'
            ? 3000
            : 1800,
      tags: entry.tags,
    },
    update: {},
  });

  const parsedReviewAt = reviewAt ? new Date(reviewAt) : null;
  await prisma.userProblemProgress.upsert({
    where: { userId_problemId: { userId, problemId: problem.id } },
    create: {
      userId,
      problemId: problem.id,
      solved: false,
      reviewAt: parsedReviewAt,
    },
    update: { reviewAt: parsedReviewAt },
  });

  return {
    slug,
    reviewAt: parsedReviewAt ? parsedReviewAt.toISOString() : null,
  };
}

function matchesQuery(
  entry: Nibras75Entry,
  query: Nibras75ProblemsQuery,
  companyIds?: string[],
): boolean {
  return matchesNibras75Query(entry, query, companyIds);
}

export async function fetchNibras75Problems(
  handle: string | undefined,
  userId: string | undefined,
  prisma: PrismaClient,
  query: Nibras75ProblemsQuery,
): Promise<{
  items: Nibras75ProblemRow[];
  total: number;
  solvedCount: number;
  completedInSet: number;
}> {
  const [lcStatus, dbProgressData] = await Promise.all([
    getLcUserStatus(handle),
    loadDbProgress(prisma, userId),
  ]);

  const mergeStatus = (slug: string) =>
    mergeNibras75Status(slug, dbProgressData.status, lcStatus);

  let completedInSet = 0;
  const rows: Nibras75ProblemRow[] = [];

  for (const entry of NIBRAS_75_CURRICULUM) {
    const st = mergeStatus(entry.slug);
    if (st.solved) completedInSet++;

    if (query.solved === 'true' && !st.solved) continue;
    if (query.solved === 'false' && st.solved) continue;
    if (!matchesNibras75ReviewDue(entry.slug, query, dbProgressData.reviewAt))
      continue;

    const companies = pickCompaniesForProblem(
      entry.slug,
      entry.askedByCount,
    ).map((c) => ({
      id: c.id,
      name: c.name,
      domain: c.domain,
      iconUrl: companyIconUrl(c.id),
    }));

    if (
      !matchesQuery(
        entry,
        query,
        companies.map((c) => c.id),
      )
    )
      continue;

    const reviewAt = dbProgressData.reviewAt.get(entry.slug);

    rows.push({
      rank: entry.rank,
      problemId: entry.slug,
      name: entry.title,
      url: questionUrl(entry.slug),
      difficulty: entry.difficulty,
      description: entry.description,
      tags: entry.tags,
      askedByCount: entry.askedByCount,
      companies,
      solved: st.solved,
      attempted: st.attempted,
      userMarked: st.userMarked,
      reviewAt: reviewAt ? reviewAt.toISOString() : null,
    });
  }

  const items = sortNibras75Rows(rows, query.sort);

  return {
    items,
    total: items.length,
    solvedCount: completedInSet,
    completedInSet,
  };
}

export function getNibras75Meta() {
  return {
    total: NIBRAS_75_TOTAL,
    title: 'Nibras 75',
    subtitle:
      'The essential data structures and algorithms list for software engineering interviews — curated for LeetCode practice.',
  };
}
