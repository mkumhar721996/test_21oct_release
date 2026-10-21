import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "user-id";

function mac(userId: string, secret: string) {
  return createHmac("sha256", secret).update(userId).digest("base64url");
}

/** Cookie value for a signed-in person: `<userId>.<hmac>`. Issued by whatever sign-in ends up owning this. */
export function signSession(userId: string, secret = process.env.SESSION_SECRET): string {
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return `${userId}.${mac(userId, secret)}`;
}

/** Returns the user id only when the signature checks out; anything else is signed out. */
export function verifySession(value: string | undefined, secret = process.env.SESSION_SECRET): string | null {
  if (!value || !secret) return null;
  const dot = value.lastIndexOf(".");
  if (dot < 1) return null;
  const userId = value.slice(0, dot);
  const given = Buffer.from(value.slice(dot + 1));
  const expected = Buffer.from(mac(userId, secret));
  return given.length === expected.length && timingSafeEqual(given, expected) ? userId : null;
}

/**
 * Sign-in seam: no real sign-in exists yet, so the signed-in person is whoever the
 * signed session cookie names. A cookie the client forged fails verification.
 */
export async function getCurrentUserId(): Promise<string | null> {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}
