import { hashPassword } from './password';

export type Role = 'WFC Admin' | 'Fundraising Consultant' | 'Org Admin' | 'Org Staff';

export interface SeedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  organizationId: string | null;
  passwordHash: string;
}

// Development fixtures only; used outside production and never in a production deploy.
export const DEMO_PASSWORDS: Record<Role, string> = {
  'WFC Admin': 'Wfc-admin-1',
  'Fundraising Consultant': 'Consult-2',
  'Org Admin': 'Org-admin-3',
  'Org Staff': 'Org-staff-4',
};

const SEEDS: Omit<SeedUser, 'passwordHash'>[] = [
  { id: 'user-1', email: 'priya.nair@wfc.example', name: 'Priya Nair', role: 'WFC Admin', organizationId: null },
  { id: 'user-2', email: 'tom.becker@wfc.example', name: 'Tom Becker', role: 'Fundraising Consultant', organizationId: null },
  { id: 'user-3', email: 'maya.okafor@hope.example', name: 'Maya Okafor', role: 'Org Admin', organizationId: 'org-1' },
  { id: 'user-4', email: 'daniel.reyes@river.example', name: 'Daniel Reyes', role: 'Org Staff', organizationId: 'org-2' },
];

const envKey = (role: Role) => `AUTH_SEED_PASSWORD_${role.toUpperCase().replace(/ /g, '_')}`;

// A role's password comes from AUTH_SEED_PASSWORD_<ROLE>; the demo password is the fallback
// outside production only. In production a role without a configured password is not seeded.
export function buildSeedUsers(env: Record<string, string | undefined>): SeedUser[] {
  const production = env.NODE_ENV === 'production';
  return SEEDS.flatMap((s) => {
    const password = env[envKey(s.role)] || (production ? undefined : DEMO_PASSWORDS[s.role]);
    return password ? [{ ...s, passwordHash: hashPassword(password) }] : [];
  });
}

export const SEED_USERS: SeedUser[] = buildSeedUsers(process.env);
