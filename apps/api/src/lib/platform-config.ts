import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import {
  DEFAULT_PLATFORM_CONFIG,
  type PlatformConfigShape,
} from '../features/rbac/constants';
import { mergePlatformConfig } from '../features/admin/helpers';
import { Errors } from './errors';

const CACHE_TTL_MS = 30_000;

let cachedConfig: PlatformConfigShape | null = null;
let cachedAt = 0;

function asConfigShape(raw: Record<string, unknown>): PlatformConfigShape {
  const merged = mergePlatformConfig(
    DEFAULT_PLATFORM_CONFIG as Record<string, unknown>,
    raw,
  );
  return merged as PlatformConfigShape;
}

export async function getPlatformConfig(
  prisma: PrismaClient,
): Promise<PlatformConfigShape> {
  const now = Date.now();
  if (cachedConfig && now - cachedAt < CACHE_TTL_MS) {
    return cachedConfig;
  }

  const row = await prisma.platformConfig.findUnique({
    where: { id: 'default' },
  });
  const raw =
    row?.configJson && typeof row.configJson === 'object'
      ? (row.configJson as Record<string, unknown>)
      : (DEFAULT_PLATFORM_CONFIG as Record<string, unknown>);

  cachedConfig = asConfigShape(raw);
  cachedAt = now;
  return cachedConfig;
}

export function invalidatePlatformConfigCache(): void {
  cachedConfig = null;
  cachedAt = 0;
}

export type FeatureFlagKey =
  | 'enableGamification'
  | 'enableCommunity'
  | 'enableCompetitions';

export function isFeatureEnabled(
  config: PlatformConfigShape,
  flag: FeatureFlagKey,
): boolean {
  return config.featureFlags?.[flag] !== false;
}

export function requireFeatureEnabled(
  prisma: PrismaClient,
  flag: FeatureFlagKey,
  featureLabel: string,
) {
  return async (_request: FastifyRequest, reply: FastifyReply) => {
    const config = await getPlatformConfig(prisma);
    if (isFeatureEnabled(config, flag)) return;
    reply
      .code(503)
      .send(
        Errors.unavailable(
          `${featureLabel} is currently disabled by platform configuration.`,
        ),
      );
  };
}

export function resolveReputationTier(
  points: number,
  thresholds: PlatformConfigShape['reputationThresholds'],
): string {
  const value = Number.isFinite(points) ? points : 0;
  const expert = thresholds.expert ?? 1000;
  const advanced = thresholds.advanced ?? 500;
  const intermediate = thresholds.intermediate ?? 100;
  if (value >= expert) return 'expert';
  if (value >= advanced) return 'advanced';
  if (value >= intermediate) return 'intermediate';
  return 'beginner';
}

const COMPETITION_PATH_PREFIXES = [
  '/v1/contests',
  '/v1/competitions',
  '/v1/practice',
  '/v1/daily-problem',
  '/v1/ranking',
  '/v1/nibras75',
];

function matchesPrefix(url: string, prefix: string): boolean {
  return url === prefix || url.startsWith(`${prefix}/`);
}

export function registerPlatformFeatureGateHook(
  app: FastifyInstance,
  prisma: PrismaClient,
): void {
  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const url = request.url.split('?')[0] || '';
    let flag: FeatureFlagKey | null = null;
    let label = '';

    if (matchesPrefix(url, '/v1/gamification')) {
      flag = 'enableGamification';
      label = 'Gamification';
    } else if (matchesPrefix(url, '/v1/community')) {
      flag = 'enableCommunity';
      label = 'Community';
    } else if (
      COMPETITION_PATH_PREFIXES.some((prefix) => matchesPrefix(url, prefix))
    ) {
      flag = 'enableCompetitions';
      label = 'Competitions';
    }

    if (!flag) return;

    const config = await getPlatformConfig(prisma);
    if (isFeatureEnabled(config, flag)) return;

    reply
      .code(503)
      .send(
        Errors.unavailable(
          `${label} is currently disabled by platform configuration.`,
        ),
      );
  });
}
