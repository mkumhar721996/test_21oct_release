import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { PORTFOLIO_SEED } from '../src/portfolio/portfolio.service';
import { CLOCK } from '../src/portfolio/sip-scheduler';
import { PriceFeedService } from '../src/portfolio/price-feed.service';

describe('simulated SIP purchases with the real seed', () => {
  it('buys each never-run demo SIP once at startup after its date passed', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CLOCK)
      .useValue(() => new Date('2026-10-30T00:00:00Z'))
      .compile();
    const app = moduleRef.createNestApplication();
    await app.init();
    app.get(PriceFeedService).onModuleDestroy();
    const server = app.getHttpServer();
    const holdings = (await request(server).get('/holdings').expect(200)).body;
    const invested = (s: string) => holdings.find((h: any) => h.symbol === s).investedAmount;
    expect(invested('INFY')).toBe(2100000 + 500000);
    expect(invested('ITC')).toBe(1200000 + 300000);
    expect(invested('HDFCBANK')).toBe(1300000 + 400000);
    await app.close();
  });
});

describe('simulated SIP purchases', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PORTFOLIO_SEED)
      .useValue({
        holdings: [{ symbol: 'ITC', quantity: 30, investedAmount: 1200000 }],
        sips: [
          {
            id: 'sip-itc',
            symbol: 'ITC',
            amount: 300000,
            dayOfMonth: 15,
            frequency: 'monthly',
            active: true,
            lastRunOn: '2026-07-15',
          },
        ],
      })
      .overrideProvider(CLOCK)
      .useValue(() => new Date('2026-10-22T00:00:00Z'))
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
    app.get(PriceFeedService).onModuleDestroy();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('makes one catch-up purchase at startup', async () => {
    const body = (await request(server).get('/holdings').expect(200)).body;
    expect(body.find((h: any) => h.symbol === 'ITC').investedAmount).toBe(1200000 + 300000);
    const totals = (await request(server).get('/portfolio').expect(200)).body;
    expect(totals.invested).toBe(body.reduce((a: number, h: any) => a + h.investedAmount, 0));
    const sips = (await request(server).get('/sips').expect(200)).body;
    expect(sips[0].lastRunOn).toBe('2026-10-15');
  });
});
