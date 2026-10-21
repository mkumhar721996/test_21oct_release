import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { PriceFeedService } from '../src/portfolio/price-feed.service';
import { CATALOGUE } from '../src/portfolio/stock-catalogue';

describe('portfolio endpoints', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    // stop the 30 s timer so a tick cannot land between two requests in a test
    app.get(PriceFeedService).onModuleDestroy();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('offers every held stock as a SIP stock choice', async () => {
    const stocks = (await request(server).get('/stocks').expect(200)).body;
    const holdings = (await request(server).get('/holdings').expect(200)).body;
    const choices = stocks.map((s: { symbol: string }) => s.symbol);
    for (const h of holdings) expect(choices).toContain(h.symbol);
  });

  it('lists five holdings with returns', async () => {
    const body = (await request(server).get('/holdings').expect(200)).body;
    expect(body).toHaveLength(5);
    for (const h of body) expect(h.returns).toBe(h.currentValue - h.investedAmount);
  });

  it('lists SIPs', async () => {
    const body = (await request(server).get('/sips').expect(200)).body;
    expect(body.length).toBeGreaterThanOrEqual(1);
  });

  it('returns totals matching the holdings', async () => {
    const holdings = (await request(server).get('/holdings').expect(200)).body;
    const body = (await request(server).get('/portfolio').expect(200)).body;
    const sum = (k: string) => holdings.reduce((a: number, h: any) => a + h[k], 0);
    expect(body.invested).toBe(sum('investedAmount'));
    expect(body.currentValue).toBe(sum('currentValue'));
    expect(body.returns).toBe(body.currentValue - body.invested);
  });

  it('shows a price and 1D change for every stock', async () => {
    const stocks = (await request(server).get('/stocks').expect(200)).body;
    expect(stocks).toHaveLength(CATALOGUE.length);
    for (const s of stocks) {
      expect(s.price).toBeGreaterThan(0);
      expect(typeof s.dayChangePercent).toBe('number');
      expect(s.dayChange).toBe(s.price - s.previousClose);
    }
  });

  it('offers the chart periods', async () => {
    const body = (await request(server).get('/portfolio/periods').expect(200)).body;
    expect(body).toEqual(['1D', '1W', '1M', '3M', '1Y', 'ALL']);
  });

  it('serves history ending at the portfolio total, defaulting to 1D', async () => {
    const total = (await request(server).get('/portfolio').expect(200)).body.currentValue;
    const body = (await request(server).get('/portfolio/history').expect(200)).body;
    expect(body.period).toBe('1D');
    expect(body.points.at(-1).value).toBe(total);
    const all = (await request(server).get('/portfolio/history?period=ALL').expect(200)).body;
    expect(all.intervalMs).toBe(7 * 86_400_000);
    expect(all.points).toHaveLength(104 + 1);
    await request(server).get('/portfolio/history?period=2Y').expect(400);
  });
});
