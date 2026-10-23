import { Injectable } from '@nestjs/common';

export interface StoredSession {
  userId: string;
  lastActivity: number;
}

@Injectable()
export class SessionStore {
  private readonly sessions = new Map<string, StoredSession>();

  get(token: string): StoredSession | undefined {
    return this.sessions.get(token);
  }

  set(token: string, session: StoredSession): void {
    this.sessions.set(token, session);
  }

  delete(token: string): void {
    this.sessions.delete(token);
  }
}
