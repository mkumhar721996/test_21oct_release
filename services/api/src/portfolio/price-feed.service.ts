import { Injectable, Optional, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CATALOGUE, Stock, toStock } from './stock-catalogue';

export const PRICE_TICK_MS = 30_000;
export const MAX_MOVE = 0.005;

@Injectable()
export class PriceFeedService implements OnModuleInit, OnModuleDestroy {
  private readonly prices = new Map<string, number>(CATALOGUE.map((e) => [e.symbol, e.basePrice]));
  private readonly listeners: Array<() => void> = [];
  private timer?: NodeJS.Timeout;

  constructor(@Optional() private readonly rng: () => number = Math.random) {}

  onModuleInit(): void {
    this.timer = setInterval(() => this.tick(), PRICE_TICK_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }

  getStocks(): Stock[] {
    return CATALOGUE.map((e) => toStock(e, this.getPrice(e.symbol)));
  }

  getPrice(symbol: string): number {
    const price = this.prices.get(symbol);
    if (price === undefined) throw new Error(`Unknown symbol ${symbol}`);
    return price;
  }

  tick(): void {
    for (const [symbol, price] of this.prices) {
      const moved = Math.round(price * (1 + (this.rng() * 2 - 1) * MAX_MOVE));
      this.prices.set(symbol, Math.max(1, moved));
    }
    for (const l of this.listeners) l();
  }

  onTick(listener: () => void): void {
    this.listeners.push(listener);
  }
}
