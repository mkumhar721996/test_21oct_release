import 'reflect-metadata';
import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from './auth.service';
import { Clock } from './clock';
import { DEMO_PASSWORDS, SEED_USERS } from './seed-users';
import { SessionStore } from './session.store';

class FakeClock extends Clock {
  private t = 1_000_000;
  now(): number {
    return this.t;
  }
  advance(ms: number): void {
    this.t += ms;
  }
}

const MIN = 60_000;
const MESSAGE = 'Email or password is incorrect';
const WFC = 'priya.nair@wfc.example';
const ORG = 'maya.okafor@hope.example';
const ORG_STAFF = 'daniel.reyes@river.example';

describe('AuthService', () => {
  let clock: FakeClock;
  let service: AuthService;
  const pw = (email: string) => DEMO_PASSWORDS[SEED_USERS.find((u) => u.email === email)!.role];

  beforeEach(() => {
    clock = new FakeClock();
    service = new AuthService(new SessionStore(), clock);
  });

  it.each(SEED_USERS)('signs in $role', (u) => {
    const { token } = service.signIn(u.email, DEMO_PASSWORDS[u.role]);
    expect(token).toBeTruthy();
    expect(service.getSession(token).id).toBe(u.id);
  });

  it('trims and lower-cases the email', () => {
    expect(service.signIn(`  ${WFC.toUpperCase()} `, pw(WFC)).token).toBeTruthy();
  });

  it('refuses a wrong password with the shared message', () => {
    expect(() => service.signIn(WFC, 'nope')).toThrow(MESSAGE);
  });

  it('refuses an unknown email with the same message', () => {
    expect(() => service.signIn('nobody@example.org', 'anything')).toThrow(MESSAGE);
  });

  it('gives org users exactly one organization and WFC users none', () => {
    for (const email of [ORG, ORG_STAFF]) {
      const { token } = service.signIn(email, pw(email));
      expect(service.getSession(token).organization).toEqual({
        id: expect.any(String),
        name: expect.any(String),
      });
    }
    expect(service.getSession(service.signIn(ORG, pw(ORG)).token).organization?.name).toBe('Hope Trust');
    for (const email of [WFC, 'tom.becker@wfc.example']) {
      expect(service.getSession(service.signIn(email, pw(email)).token).organization).toBeNull();
    }
  });

  it('ends the session on sign-out', () => {
    const { token } = service.signIn(WFC, pw(WFC));
    service.signOut(token);
    expect(() => service.getSession(token)).toThrow(UnauthorizedException);
  });

  describe('lockout', () => {
    const failFive = () => {
      for (let i = 0; i < 5; i++) expect(() => service.signIn(WFC, 'bad')).toThrow(MESSAGE);
    };

    it('refuses the correct password within 15 minutes of the fifth failure', () => {
      failFive();
      clock.advance(15 * MIN - 1);
      expect(() => service.signIn(WFC, pw(WFC))).toThrow(MESSAGE);
    });

    it('accepts the correct password after 15 minutes', () => {
      failFive();
      clock.advance(15 * MIN);
      expect(service.signIn(WFC, pw(WFC)).token).toBeTruthy();
    });

    it('does not extend the lock with attempts made during it', () => {
      failFive();
      clock.advance(10 * MIN);
      expect(() => service.signIn(WFC, 'bad')).toThrow(MESSAGE);
      clock.advance(5 * MIN);
      expect(service.signIn(WFC, pw(WFC)).token).toBeTruthy();
    });

    it('resets the count on a success', () => {
      for (let i = 0; i < 4; i++) expect(() => service.signIn(WFC, 'bad')).toThrow();
      service.signIn(WFC, pw(WFC));
      for (let i = 0; i < 4; i++) expect(() => service.signIn(WFC, 'bad')).toThrow();
      expect(service.signIn(WFC, pw(WFC)).token).toBeTruthy();
    });
  });

  describe('idle timeout', () => {
    it('ends the session after 30 idle minutes', () => {
      const { token } = service.signIn(WFC, pw(WFC));
      clock.advance(30 * MIN + 1);
      expect(() => service.getSession(token)).toThrow(UnauthorizedException);
    });

    it('extends the session with activity', () => {
      const { token } = service.signIn(WFC, pw(WFC));
      clock.advance(20 * MIN);
      service.getSession(token);
      clock.advance(20 * MIN);
      expect(service.getSession(token).id).toBeTruthy();
    });

    it('rejects an unknown token', () => {
      expect(() => service.getSession('missing')).toThrow(UnauthorizedException);
    });
  });
});
