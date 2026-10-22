import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

describe('portfolio endpoints', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
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
});
