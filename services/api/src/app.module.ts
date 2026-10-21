import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PortfolioModule } from './portfolio/portfolio.module';

@Module({
  imports: [PortfolioModule],
  controllers: [HealthController],
})
export class AppModule {}
