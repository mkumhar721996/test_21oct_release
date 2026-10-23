import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { apiGetSession } from "@/lib/auth-api";
import { SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  let user: Awaited<ReturnType<typeof apiGetSession>>;
  try {
    user = await apiGetSession(token);
  } catch {
    return NextResponse.json({ message: "Session check is unavailable" }, { status: 502 });
  }
  if (!user) {
    const res = NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }
  return NextResponse.json(user);
}
