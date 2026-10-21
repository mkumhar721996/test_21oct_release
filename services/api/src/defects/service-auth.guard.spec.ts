import 'reflect-metadata';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ServiceAuthGuard } from './service-auth.guard';

const ctx = (headers: Record<string, string>) =>
  ({ switchToHttp: () => ({ getRequest: () => ({ headers }) }) }) as never;

afterEach(() => vi.unstubAllEnvs());

describe('ServiceAuthGuard', () => {
  it('accepts the configured service token', () => {
    vi.stubEnv('SERVICE_TOKEN', 'fake-service-token');
    expect(new ServiceAuthGuard().canActivate(ctx({ 'x-service-token': 'fake-service-token' }))).toBe(true);
  });

  it('rejects a wrong or missing token', () => {
    vi.stubEnv('SERVICE_TOKEN', 'fake-service-token');
    expect(() => new ServiceAuthGuard().canActivate(ctx({ 'x-service-token': 'nope' }))).toThrow();
    expect(() => new ServiceAuthGuard().canActivate(ctx({}))).toThrow();
  });

  it('fails closed when no token is configured', () => {
    vi.stubEnv('SERVICE_TOKEN', '');
    expect(() => new ServiceAuthGuard().canActivate(ctx({ 'x-service-token': '' }))).toThrow();
  });
});
