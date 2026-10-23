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

// Development fixtures only; a real provisioning path is outside this story.
export const DEMO_PASSWORDS: Record<Role, string> = {
  'WFC Admin': 'Wfc-admin-1',
  'Fundraising Consultant': 'Consult-2',
  'Org Admin': 'Org-admin-3',
  'Org Staff': 'Org-staff-4',
};

const seed = (
  id: string,
  email: string,
  name: string,
  role: Role,
  organizationId: string | null,
): SeedUser => ({
  id,
  email,
  name,
  role,
  organizationId,
  passwordHash: hashPassword(DEMO_PASSWORDS[role]),
});

export const SEED_USERS: SeedUser[] = [
  seed('user-1', 'priya.nair@wfc.example', 'Priya Nair', 'WFC Admin', null),
  seed('user-2', 'tom.becker@wfc.example', 'Tom Becker', 'Fundraising Consultant', null),
  seed('user-3', 'maya.okafor@hope.example', 'Maya Okafor', 'Org Admin', 'org-1'),
  seed('user-4', 'daniel.reyes@river.example', 'Daniel Reyes', 'Org Staff', 'org-2'),
];
