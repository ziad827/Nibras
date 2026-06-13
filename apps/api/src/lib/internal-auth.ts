import { FastifyReply, FastifyRequest } from 'fastify';
import { Errors } from './errors';

/** Shared secret for server-to-server calls (tutor → API, admin cache cleanup). */
export function verifyInternalApiToken(
  authorization: string | undefined,
): boolean {
  const token = (process.env.NIBRAS_INTERNAL_API_TOKEN || '').trim();
  if (!token) return true;
  return authorization === `Bearer ${token}`;
}

export function requireInternalApiToken(
  request: FastifyRequest,
  reply: FastifyReply,
): boolean {
  if (verifyInternalApiToken(request.headers.authorization)) {
    return true;
  }
  reply.code(401).send(Errors.authRequired());
  return false;
}
