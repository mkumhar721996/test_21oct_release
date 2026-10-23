import { NextResponse } from "next/server";
import { apiSignIn } from "@/lib/auth-api";
import { SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: unknown; password?: unknown };
  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";

  let result: Awaited<ReturnType<typeof apiSignIn>>;
  try {
    result = await apiSignIn(email, password);
  } catch {
    return NextResponse.json({ message: "Sign-in is unavailable" }, { status: 502 });
  }
  if (!result) {
    return NextResponse.json({ message: "Email or password is incorrect" }, { status: 401 });
  }

  const res = NextResponse.json({ user: result.user });
  res.cookies.set(SESSION_COOKIE, result.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return res;
}
