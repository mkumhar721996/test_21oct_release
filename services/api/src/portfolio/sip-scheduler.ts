import { Inject, Injectable, OnApplicationBootstrap, OnModuleDestroy, Optional } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';

export const CLOCK = Symbol('CLOCK');
const SIP_TICK_MS = 60 * 60 * 1000;

@Injectable()
export class SipScheduler implements OnApplicationBootstrap, OnModuleDestroy {
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly portfolio: PortfolioService,
    @Optional() @Inject(CLOCK) private readonly now: () => Date = () => new Date(),
  ) {}

  onApplicationBootstrap(): void {
    // catch-up for dates missed while the app was down, then keep checking
    this.portfolio.runDueSips(this.now());
    this.timer = setInterval(() => this.portfolio.runDueSips(this.now()), SIP_TICK_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }
}
