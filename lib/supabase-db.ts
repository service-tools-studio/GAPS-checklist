import type { ChecklistState, UserId } from "./store";
import { getSupabase, isSupabaseConfigured } from "./supabase-server";

const TABLE = "checklist_days";

export async function getChecklistStateFromSupabase(
  dateKey: string
): Promise<ChecklistState> {
  const supabase = getSupabase();
  const { data: rows, error } = await supabase
    .from(TABLE)
    .select("user_id, completed")
    .eq("date_key", dateKey);

  if (error) throw new Error(`Supabase getChecklistState: ${error.message}`);

  const state: ChecklistState = { jasmin: {}, kelsey: {} };
  for (const row of rows ?? []) {
    const uid = row.user_id as UserId;
    if (uid === "jasmin" || uid === "kelsey") {
      state[uid] = (row.completed as Record<string, boolean | number | string>) ?? {};
    }
  }
  return state;
}

export async function upsertChecklistStateInSupabase(
  dateKey: string,
  userId: UserId,
  completed: Record<string, boolean | number | string>
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from(TABLE).upsert(
    { date_key: dateKey, user_id: userId, completed },
    { onConflict: "date_key,user_id" }
  );
  if (error) throw new Error(`Supabase upsert: ${error.message}`);
}

export async function getAllDateKeysFromSupabase(): Promise<string[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("date_key")
    .order("date_key", { ascending: true });

  if (error) throw new Error(`Supabase getAllDateKeys: ${error.message}`);

  const set = new Set<string>();
  for (const row of data ?? []) {
    if (row.date_key) set.add(row.date_key);
  }
  return Array.from(set).sort();
}

export { isSupabaseConfigured };
