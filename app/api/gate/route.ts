import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createGateToken,
  getGateCookieName,
  getGateSecret,
  isGateEnabled,
  verifyGateToken,
} from "@/lib/gate";

export const runtime = "nodejs";

export async function GET() {
  if (!isGateEnabled()) {
    return NextResponse.json({ ok: true });
  }
  const cookieStore = await cookies();
  const token = cookieStore.get(getGateCookieName())?.value;
  const ok = verifyGateToken(token);
  return NextResponse.json({ ok });
}

export async function POST(request: Request) {
  const secret = getGateSecret();
  if (!secret) {
    return NextResponse.json({ ok: true });
  }

  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  const password = body?.password;
  if (password !== secret) {
    return NextResponse.json({ ok: false, error: "Invalid password" }, { status: 401 });
  }

  const token = createGateToken();
  const cookieStore = await cookies();
  cookieStore.set(getGateCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return NextResponse.json({ ok: true });
}
