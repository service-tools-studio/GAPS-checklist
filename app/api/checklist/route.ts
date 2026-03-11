import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getAllTaskIdsForUser,
  getChecklistForDate,
  getTodayKey,
  getUsers,
  getTasksForUser,
  updateChecklistEntry,
  type UserId,
} from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const explicitDate = searchParams.get("date") ?? undefined;
  const dateKey = explicitDate || getTodayKey();

  const data = await getChecklistForDate(dateKey);

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("userId")?.value as UserId | undefined;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        taskId?: string;
        value?: boolean | number | string;
        date?: string;
      }
    | null;

  const taskId = body?.taskId;
  const value = body?.value;
  const dateKey = body?.date || getTodayKey();

  if (typeof taskId !== "string") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  if (value === undefined || (typeof value !== "boolean" && typeof value !== "number" && typeof value !== "string")) {
    return NextResponse.json({ error: "Invalid payload: value required" }, { status: 400 });
  }

  const validIds = new Set(getAllTaskIdsForUser(userId));
  if (!validIds.has(taskId)) {
    return NextResponse.json({ error: "Unknown task" }, { status: 400 });
  }

  const updatedChecklist = await updateChecklistEntry({
    dateKey,
    userId,
    taskId,
    value,
  });

  const users = getUsers();
  const tasksJasmin = getTasksForUser("jasmin");
  const tasksKelsey = getTasksForUser("kelsey");

  return NextResponse.json({
    date: dateKey,
    users,
    tasksJasmin,
    tasksKelsey,
    checklists: updatedChecklist,
  });
}

