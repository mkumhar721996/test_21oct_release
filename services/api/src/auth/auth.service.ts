import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Clock } from './clock';
import { hashPassword, verifyPassword } from './password';
import { SEED_ORGANIZATIONS } from './seed-organizations';
import { Role, SEED_USERS, SeedUser } from './seed-users';
import { SessionStore } from './session.store';

export const MAX_FAILURES = 5;
export const LOCK_MS = 15 * 60_000;
export const IDLE_MS = 30 * 60_000;
export const SIGN_IN_FAILED = 'Email or password is incorrect';
const DUMMY_HASH = hashPassword('unused-dummy-password');

export interface SessionUser {
  id: string;
  name: string;
  role: Role;
  organization: { id: string; name: string } | null;
}

interface FailureState {
  count: number;
  lockedAt: number | null;
}

@Injectable()
export class AuthService {
  private readonly failures = new Map<string, FailureState>();

  constructor(
    private readonly store: SessionStore,
    private readonly clock: Clock,
  ) {}

  signIn(email: string, password: string): { token: string; user: SessionUser } {
    const normalized = String(email ?? '').trim().toLowerCase();
    const user = SEED_USERS.find((u) => u.email === normalized);
    if (!user) {
      // Spend the same hashing time as a known email so response time does not reveal seeded accounts.
      verifyPassword(String(password ?? ''), DUMMY_HASH);
      throw new UnauthorizedException(SIGN_IN_FAILED);
    }

    const now = this.clock.now();
    const state = this.failures.get(user.id) ?? { count: 0, lockedAt: null };
    if (state.lockedAt !== null) {
      if (now - state.lockedAt < LOCK_MS) {
        verifyPassword(String(password ?? ''), DUMMY_HASH);
        throw new UnauthorizedException(SIGN_IN_FAILED);
      }
      state.count = 0;
      state.lockedAt = null;
    }

    if (!verifyPassword(String(password ?? ''), user.passwordHash)) {
      state.count += 1;
      if (state.count >= MAX_FAILURES) state.lockedAt = now;
      this.failures.set(user.id, state);
      throw new UnauthorizedException(SIGN_IN_FAILED);
    }

    this.failures.delete(user.id);
    const token = randomBytes(32).toString('hex');
    this.store.set(token, { userId: user.id, lastActivity: now });
    return { token, user: this.toSessionUser(user) };
  }

  signOut(token: string): void {
    this.store.delete(token);
  }

  getSession(token: string): SessionUser {
    const session = token ? this.store.get(token) : undefined;
    if (!session) throw new UnauthorizedException();
    const now = this.clock.now();
    if (now - session.lastActivity > IDLE_MS) {
      this.store.delete(token);
      throw new UnauthorizedException();
    }
    session.lastActivity = now;
    const user = SEED_USERS.find((u) => u.id === session.userId);
    if (!user) throw new UnauthorizedException();
    return this.toSessionUser(user);
  }

  private toSessionUser(user: SeedUser): SessionUser {
    const org = user.organizationId
      ? SEED_ORGANIZATIONS.find((o) => o.id === user.organizationId)
      : undefined;
    return {
      id: user.id,
      name: user.name,
      role: user.role,
      organization: org ? { id: org.id, name: org.name } : null,
    };
  }
}
