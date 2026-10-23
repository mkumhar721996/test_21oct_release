import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

describe('auth', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('refuses a wrong password with 401 and the shared message', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ email: 'tom.becker@wfc.example', password: 'nope' })
      .expect(401);
    expect(res.body.message).toBe('Email or password is incorrect');
  });

  it('refuses an unknown email identically', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ email: 'nobody@example.org', password: 'nope' })
      .expect(401);
    expect(res.body.message).toBe('Email or password is incorrect');
  });

  it('signs in, reads the session and signs out', async () => {
    const server = app.getHttpServer();
    const res = await request(server)
      .post('/auth/sign-in')
      .send({ email: 'maya.okafor@hope.example', password: 'Org-admin-3' })
      .expect(200);
    const { token, user } = res.body;
    expect(user).toMatchObject({ name: 'Maya Okafor', role: 'Org Admin', organization: { name: 'Hope Trust' } });

    await request(server).get('/auth/session').set('Authorization', `Bearer ${token}`).expect(200);
    await request(server).post('/auth/sign-out').set('Authorization', `Bearer ${token}`).expect(204);
    await request(server).get('/auth/session').set('Authorization', `Bearer ${token}`).expect(401);
  });

  it('rejects a session request without a token', async () => {
    await request(app.getHttpServer()).get('/auth/session').expect(401);
  });
});
