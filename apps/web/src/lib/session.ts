export type Role = "WFC Admin" | "Fundraising Consultant" | "Org Admin" | "Org Staff";

export type SessionUser = {
  id: string;
  name: string;
  role: Role;
  organization: { id: string; name: string } | null;
};

export const SESSION_COOKIE = "session";

export function headerIdentity(user: SessionUser): {
  name: string;
  role: Role;
  organizationName: string | null;
} {
  return { name: user.name, role: user.role, organizationName: user.organization?.name ?? null };
}
