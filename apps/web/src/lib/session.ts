import { cookies } from "next/headers";

export const SESSION_COOKIE = "user-id";

/**
 * Sign-in seam: no real sign-in exists yet, so the signed-in person is whoever the
 * session cookie names. Replace the body when real authentication lands.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value?.trim();
  return value || null;
}
