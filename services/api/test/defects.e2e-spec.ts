import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ATTACHMENT_STORE } from '../src/defects/attachment-store';
import { DEFECTS_REPOSITORY } from '../src/defects/defects.repository';
import type { Defect } from '../src/defects/defects.service';

describe('POST /defects', () => {
  let app: INestApplication;
  const rows: Defect[] = [];
  const repo = {
    async insert(d: Defect) {
      rows.push(d);
    },
    async findById(id: string) {
      return rows.find((d) => d.id === id);
    },
  };
  let failStore = false;
  const store = {
    async put() {
      if (failStore) throw new Error('s3 down');
    },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DEFECTS_REPOSITORY)
      .useValue(repo)
      .overrideProvider(ATTACHMENT_STORE)
      .useValue(store)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a defect with the signed-in reporter', async () => {
    const res = await request(app.getHttpServer())
      .post('/defects')
      .set('x-user-id', 'user-42')
      .send({ title: 'Crash on login', severity: 'high', area: 'Login', steps: 'Open page' });
    expect(res.status).toBe(201);
    expect(res.body.reporterId).toBe('user-42');
    expect(await repo.findById(res.body.id)).toMatchObject({
      title: 'Crash on login',
      reporterId: 'user-42',
    });
  });

  it('ignores a reporterId in the body', async () => {
    const res = await request(app.getHttpServer())
      .post('/defects')
      .set('x-user-id', 'user-42')
      .send({ title: 'T', reporterId: 'someone-else' });
    expect(res.body.reporterId).toBe('user-42');
  });

  it('answers 401 without x-user-id', async () => {
    const res = await request(app.getHttpServer()).post('/defects').send({ title: 'T' });
    expect(res.status).toBe(401);
  });

  it('answers 400 for a blank title', async () => {
    const res = await request(app.getHttpServer())
      .post('/defects')
      .set('x-user-id', 'user-42')
      .send({ title: ' ' });
    expect(res.status).toBe(400);
    expect(res.body.field).toBe('title');
  });

  it('uploads an attachment, rejects bad types and reports store failure', async () => {
    const server = app.getHttpServer();
    const ok = await request(server)
      .post('/defects/attachments')
      .attach('file', Buffer.from('x'), { filename: 'ok.png', contentType: 'image/png' });
    expect(ok.status).toBe(201);
    expect(ok.body.name).toBe('ok.png');

    const bad = await request(server)
      .post('/defects/attachments')
      .attach('file', Buffer.from('x'), { filename: 'virus.exe', contentType: 'application/octet-stream' });
    expect(bad.status).toBe(415);

    failStore = true;
    const failed = await request(server)
      .post('/defects/attachments')
      .attach('file', Buffer.from('x'), { filename: 'ok.png', contentType: 'image/png' });
    failStore = false;
    expect(failed.status).toBe(502);
  });
});
