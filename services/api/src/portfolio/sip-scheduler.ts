import { Inject, Injectable, OnApplicationBootstrap, OnModuleDestroy, Optional } from '@nestjs/common';
import { PortfolioHistoryService } from './portfolio-history.service';
import { PortfolioService } from './portfolio.service';

export const CLOCK = Symbol('CLOCK');
const SIP_TICK_MS = 60 * 60 * 1000;

@Injectable()
export class SipScheduler implements OnApplicationBootstrap, OnModuleDestroy {
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly portfolio: PortfolioService,
    @Optional() @Inject(CLOCK) private readonly now: () => Date = () => new Date(),
    @Optional() private readonly history?: PortfolioHistoryService,
  ) {}

  onApplicationBootstrap(): void {
    // catch-up for dates missed while the app was down, then keep checking
    this.run();
    this.timer = setInterval(() => this.run(), SIP_TICK_MS);
    this.timer.unref();
  }

  private run(): void {
    // a purchase changes the portfolio total, so the chart's latest point must follow
    if (this.portfolio.runDueSips(this.now()).length > 0) this.history?.recordTotal();
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }
}
