import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Clock } from './clock';
import { SessionStore } from './session.store';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionStore, Clock],
})
export class AuthModule {}
