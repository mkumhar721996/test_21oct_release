import { Module } from '@nestjs/common';
import { PortfolioController } from './portfolio.controller';
import { PortfolioHistoryService } from './portfolio-history.service';
import { PortfolioService } from './portfolio.service';
import { PriceFeedService } from './price-feed.service';

@Module({
  controllers: [PortfolioController],
  providers: [PriceFeedService, PortfolioService, PortfolioHistoryService],
})
export class PortfolioModule {}
