import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { PortfolioModule } from './portfolio/portfolio.module';

@Module({
  imports: [AuthModule, PortfolioModule],
  controllers: [HealthController],
})
export class AppModule {}
