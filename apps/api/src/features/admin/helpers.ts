import type { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

export function parseBanDuration(
  duration?: string,
  expiresAt?: string,
): Date | null {
  if (expiresAt) {
    const parsed = new Date(expiresAt);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (!duration || duration === 'permanent') return null;
  const now = Date.now();
  if (duration === '1d') return new Date(now + 24 * 60 * 60 * 1000);
  if (duration === '7d') return new Date(now + 7 * 24 * 60 * 60 * 1000);
  if (duration === '30d') return new Date(now + 30 * 24 * 60 * 60 * 1000);
  return null;
}

export function paginationMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'course'
  );
}

export async function uniqueCourseSlug(
  prisma: PrismaClient,
  base: string,
): Promise<string> {
  let slug = slugify(base);
  let suffix = 0;
  while (
    await prisma.course.findUnique({
      where: { slug },
    })
  ) {
    suffix += 1;
    slug = `${slugify(base)}-${suffix}`;
  }
  return slug;
}

export function parseSectionMeta(description: string | null | undefined): {
  schedule?: string;
  capacity?: number;
} {
  if (!description) return {};
  try {
    const parsed = JSON.parse(description) as {
      schedule?: string;
      capacity?: number;
    };
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    return { schedule: description };
  }
  return {};
}

export function encodeSectionMeta(input: {
  schedule?: string;
  capacity?: number;
}): string | null {
  if (!input.schedule && input.capacity == null) return null;
  return JSON.stringify({
    schedule: input.schedule ?? undefined,
    capacity: input.capacity ?? undefined,
  });
}

export function serializeSection(section: {
  id: string;
  title: string;
  description: string | null;
}) {
  const meta = parseSectionMeta(section.description);
  return {
    id: section.id,
    _id: section.id,
    name: section.title,
    title: section.title,
    schedule: meta.schedule ?? '',
    capacity: meta.capacity ?? null,
  };
}

export function mapCourseStatus(course: {
  isActive: boolean;
  deletedAt: Date | null;
}): string {
  if (course.deletedAt) return 'archived';
  if (!course.isActive) return 'draft';
  return 'active';
}

export function serializeAuditLog(log: {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  payload: Prisma.JsonValue;
  createdAt: Date;
  user?: {
    displayName: string | null;
    username: string;
    email: string;
  } | null;
}) {
  return {
    id: log.id,
    _id: log.id,
    action: log.action,
    resource: `${log.targetType}:${log.targetId}`,
    changes: log.payload,
    createdAt: log.createdAt.toISOString(),
    user: log.user
      ? {
          name: log.user.displayName || log.user.username,
          email: log.user.email,
        }
      : { name: 'System' },
  };
}

export function mergePlatformConfig(
  current: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      next[key] = {
        ...(typeof next[key] === 'object' && next[key] != null
          ? (next[key] as Record<string, unknown>)
          : {}),
        ...(value as Record<string, unknown>),
      };
    } else {
      next[key] = value;
    }
  }
  return next;
}
