"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { SessionUser } from "@/lib/session";

export const SIGN_IN_PATH = "/sign-in";

// Loads the signed-in user; a 401 (no session or idle expiry) sends the browser to sign-in.
// Does nothing on the sign-in page itself.
export function useSession(): { user: SessionUser | null; signOut: () => Promise<void> } {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const onSignIn = pathname === SIGN_IN_PATH;

  useEffect(() => {
    if (onSignIn) {
      setUser(null);
      return;
    }
    let cancelled = false;
    fetch("/api/auth/session", { cache: "no-store" })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) router.replace(`${SIGN_IN_PATH}?reason=idle`);
        else if (res.ok) setUser((await res.json()) as SessionUser);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [onSignIn, pathname, router]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/sign-out", { method: "POST" });
    setUser(null);
    router.replace(`${SIGN_IN_PATH}?reason=signed-out`);
  }, [router]);

  return { user, signOut };
}
