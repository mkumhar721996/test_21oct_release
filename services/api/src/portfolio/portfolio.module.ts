import { Module } from '@nestjs/common';
import { PortfolioController } from './portfolio.controller';
import { PortfolioHistoryService } from './portfolio-history.service';
import { PORTFOLIO_SEED, PortfolioService } from './portfolio.service';
import { PriceFeedService } from './price-feed.service';
import { DEMO_HOLDINGS, DEMO_SIPS } from './seed-data';
import { CLOCK, SipScheduler } from './sip-scheduler';

@Module({
  controllers: [PortfolioController],
  providers: [
    PriceFeedService,
    PortfolioService,
    PortfolioHistoryService,
    SipScheduler,
    { provide: CLOCK, useValue: () => new Date() },
    {
      provide: PORTFOLIO_SEED,
      useFactory: () => ({ holdings: [...DEMO_HOLDINGS], sips: [...DEMO_SIPS] }),
    },
  ],
})
export class PortfolioModule {}
