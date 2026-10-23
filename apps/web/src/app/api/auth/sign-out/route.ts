import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { apiSignOut } from "@/lib/auth-api";
import { SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await apiSignOut(token);
    } catch {
      // The cookie is cleared regardless; an unreachable API must not keep the browser signed in.
    }
  }
  const res = new NextResponse(null, { status: 204 });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
