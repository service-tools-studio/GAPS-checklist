import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUsers, type UserId } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("userId")?.value as UserId | undefined;

  if (!userId) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const users = getUsers();
  const user = users.find((u) => u.id === userId) ?? null;

  return NextResponse.json({ user }, { status: 200 });
}

