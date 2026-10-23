import { describe, expect, it } from 'vitest';
import { buildSeedUsers } from './seed-users';
import { verifyPassword } from './password';

describe('buildSeedUsers', () => {
  it('seeds the four demo users outside production', () => {
    expect(buildSeedUsers({ NODE_ENV: 'development' })).toHaveLength(4);
  });

  it('seeds no users in production without configured passwords', () => {
    expect(buildSeedUsers({ NODE_ENV: 'production' })).toEqual([]);
  });

  it('seeds a production user only from its configured password', () => {
    const users = buildSeedUsers({ NODE_ENV: 'production', AUTH_SEED_PASSWORD_WFC_ADMIN: 'configured-secret' });
    expect(users.map((u) => u.role)).toEqual(['WFC Admin']);
    expect(verifyPassword('configured-secret', users[0].passwordHash)).toBe(true);
    expect(verifyPassword('Wfc-admin-1', users[0].passwordHash)).toBe(false);
  });
});
