export type UserRole = "wfc_admin" | "fundraising_consultant" | "org_admin" | "org_staff";

export type CurrentUser = { role: UserRole; organizationId: string | null };

/** WFC roles see every organization's consultant; organization roles only their own. */
export function canViewConsultant(user: CurrentUser, organizationId: string): boolean {
  if (user.role === "wfc_admin" || user.role === "fundraising_consultant") return true;
  return user.organizationId === organizationId;
}
