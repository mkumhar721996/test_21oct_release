import { Body, Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import { AuthService, SessionUser } from './auth.service';

const bearer = (header?: string): string => header?.replace(/^Bearer\s+/i, '') ?? '';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('sign-in')
  @HttpCode(200)
  signIn(
    @Body() body: { email?: string; password?: string },
  ): { token: string; user: SessionUser } {
    return this.auth.signIn(body?.email ?? '', body?.password ?? '');
  }

  @Post('sign-out')
  @HttpCode(204)
  signOut(@Headers('authorization') authorization?: string): void {
    this.auth.signOut(bearer(authorization));
  }

  @Get('session')
  session(@Headers('authorization') authorization?: string): SessionUser {
    return this.auth.getSession(bearer(authorization));
  }
}
