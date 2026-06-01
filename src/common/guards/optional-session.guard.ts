import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { WEB_SESSION_COOKIE } from '@common/decorators/auth.decorators';
import type { AuthenticatedUser } from '@modules/auth/types/authenticated-user.type';
import { SessionService } from '@modules/auth/services/session.service';

function getBearerToken(request: Request): string | null {
  const raw = request.headers.authorization;
  if (raw?.startsWith('Bearer ')) {
    return raw.slice('Bearer '.length).trim();
  }
  const stParam = (request.query as Record<string, string | undefined>)?.st;
  if (stParam) return stParam;
  return null;
}

function getCookieValue(request: Request, name: string): string | null {
  const raw = request.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const [cookieName, ...rest] = part.trim().split('=');
    if (cookieName === name) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

@Injectable()
export class OptionalSessionGuard implements CanActivate {
  constructor(private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();

    const bearerToken = getBearerToken(request);
    const cookieToken = getCookieValue(request, WEB_SESSION_COOKIE);
    const token = bearerToken || cookieToken;
    if (!token) return true;

    try {
      request.user = await this.sessionService.validateSessionToken(token);
    } catch {
      // optional — leave user unset
    }
    return true;
  }
}
