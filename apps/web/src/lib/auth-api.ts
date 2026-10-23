import type { SessionUser } from "@/lib/session";

function base(): string {
  return process.env.API_BASE_URL || "http://localhost:3001";
}

export async function apiSignIn(
  email: string,
  password: string,
): Promise<{ token: string; user: SessionUser } | null> {
  const res = await fetch(`${base()}/auth/sign-in`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`POST /auth/sign-in failed with status ${res.status}`);
  return (await res.json()) as { token: string; user: SessionUser };
}

export async function apiSignOut(token: string): Promise<void> {
  const res = await fetch(`${base()}/auth/sign-out`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`POST /auth/sign-out failed with status ${res.status}`);
}

export async function apiGetSession(token: string): Promise<SessionUser | null> {
  const res = await fetch(`${base()}/auth/session`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`GET /auth/session failed with status ${res.status}`);
  return (await res.json()) as SessionUser;
}
