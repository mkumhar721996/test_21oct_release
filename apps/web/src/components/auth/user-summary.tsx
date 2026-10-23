"use client";

import { headerIdentity } from "@/lib/session";
import { useSession } from "./use-session";

export function UserSummary() {
  const { user, signOut } = useSession();
  if (!user) return null;
  const { name, role, organizationName } = headerIdentity(user);

  return (
    <div className="cluster shell-user" data-testid="user-summary">
      <span className="text-bold">{name}</span>
      <span className="badge badge-success">{role}</span>
      {organizationName ? <span data-testid="user-organization">{organizationName}</span> : null}
      <button className="btn btn-ghost btn-sm" type="button" onClick={signOut}>
        Sign out
      </button>
    </div>
  );
}
