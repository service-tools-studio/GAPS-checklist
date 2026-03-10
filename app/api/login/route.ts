import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUsers, type UserId } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { userId?: string }
    | null;

  const userId = body?.userId as UserId | undefined;
  const users = getUsers();
  const validUser = users.find((u) => u.id === userId);

  if (!validUser) {
    return NextResponse.json(
      { error: "Invalid user" },
      {
        status: 400,
      },
    );
  }

  const cookieStore = await cookies();
  cookieStore.set("userId", validUser.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // Keep the user logged in for 30 days on this browser.
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ user: validUser });
}

