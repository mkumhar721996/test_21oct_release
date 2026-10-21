import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';

const digest = (value: string) => createHash('sha256').update(value).digest();

/**
 * Only the web server may speak for a signed-in person: it proves itself with the
 * shared service token, and only then is `x-user-id` trusted. Fails closed when
 * no token is configured.
 */
@Injectable()
export class ServiceAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.SERVICE_TOKEN;
    const given = context.switchToHttp().getRequest().headers['x-service-token'];
    if (!expected || typeof given !== 'string' || !timingSafeEqual(digest(given), digest(expected))) {
      throw new UnauthorizedException('Sign in to continue.');
    }
    return true;
  }
}
