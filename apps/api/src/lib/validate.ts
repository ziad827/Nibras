import { FastifyReply } from 'fastify';
import { Errors } from './errors';

/**
 * Validates that a route path parameter is a plausible ID (cuid/cuid2/uuid).
 * Returns true if valid; sends a 400 and returns false if not.
 *
 * Usage:
 *   const params = request.params as { courseId: string };
 *   if (!validateId(params.courseId, reply, 'courseId')) return;
 */
export function validateId(
  id: string,
  reply: FastifyReply,
  paramName = 'id',
): boolean {
  // Accepts:
  //   cuid v1  – starts with 'c', 25 chars, alphanumeric e.g. clh5j8g5k0000356u7y9h4em2
  //   cuid v2  – 24 lowercase alphanumeric
  //   UUID v4  – 8-4-4-4-12 hex with dashes
  //   human-readable IDs – alphanumeric + underscore/dash (FileStore dev seeds, e.g. "milestone_exam1_design")
  const valid =
    /^c[a-z0-9]{10,32}$/.test(id) || // cuid v1/v2
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id) || // uuid v4
    /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,63}$/.test(id); // human-readable prefixed IDs

  if (!valid) {
    void reply.code(400).send(Errors.invalidParam(paramName));
    return false;
  }
  return true;
}

/**
 * Parse and validate a non-negative integer query param.
 * Returns the parsed number or the default value if the param is absent/invalid.
 */
export function parseIntParam(
  value: string | undefined,
  defaultValue: number,
  { min = 0, max = Number.MAX_SAFE_INTEGER } = {},
): number {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return defaultValue;
  return Math.min(max, Math.max(min, parsed));
}
