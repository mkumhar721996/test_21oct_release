"use client";

import { headerIdentity } from "@/lib/session";
import { useSession } from "./use-session";

export function SessionCard() {
  const { user, signOut } = useSession();
  if (!user) return null;
  const { name, role, organizationName } = headerIdentity(user);

  return (
    <div className="card stack" data-testid="session-card">
      <h2>Signed in</h2>
      <dl className="id-list">
        <dt>Name</dt>
        <dd>{name}</dd>
        <dt>Role</dt>
        <dd>
          <span className="badge badge-success">{role}</span>
        </dd>
        {organizationName ? (
          <>
            <dt>Organization</dt>
            <dd>{organizationName}</dd>
          </>
        ) : null}
      </dl>
      <div className="cluster">
        <button className="btn btn-ghost" type="button" onClick={signOut}>
          Sign out
        </button>
      </div>
    </div>
  );
}
