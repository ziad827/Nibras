import { FastifyRequest } from 'fastify';

export function requestBaseUrl(request: FastifyRequest): string {
  const forwardedProto = request.headers['x-forwarded-proto'];
  const forwardedHost = request.headers['x-forwarded-host'];
  const proto = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : typeof forwardedProto === 'string'
      ? forwardedProto.split(',')[0]?.trim()
      : request.protocol;
  const host = Array.isArray(forwardedHost)
    ? forwardedHost[0]
    : typeof forwardedHost === 'string'
      ? forwardedHost.split(',')[0]?.trim()
      : request.headers.host || '127.0.0.1:4848';
  return `${proto || 'http'}://${host}`;
}

/** Web dashboard origin for browser redirects (device login, OAuth return URLs). */
export function resolveWebBaseUrl(
  request: FastifyRequest,
  configuredWebBaseUrl?: string,
): string {
  const fromEnv =
    configuredWebBaseUrl ??
    process.env.NIBRAS_WEB_BASE_URL ??
    process.env.NEXT_PUBLIC_NIBRAS_WEB_BASE_URL;
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  const apiBase = requestBaseUrl(request);
  try {
    const parsed = new URL(apiBase);
    parsed.port = process.env.NIBRAS_WEB_PORT ?? '3000';
    return parsed.origin;
  } catch {
    return 'http://127.0.0.1:3000';
  }
}
