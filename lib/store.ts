import fs from "node:fs";
import path from "node:path";
import {
  getAllDateKeysFromSupabase,
  getChecklistStateFromSupabase,
  isSupabaseConfigured,
  upsertChecklistStateInSupabase,
} from "./supabase-db";

export type UserId = "jasmin" | "kelsey";

export type User = {
  id: UserId;
  name: string;
};

export type TaskNode = {
  id: string;
  label: string;
  children?: TaskNode[];
  /** 'check' = checkbox (default), 'number' = number input, 'text' = text input */
  inputType?: "check" | "number" | "text";
  min?: number;
  max?: number;
};

export type TaskSection = {
  title: string;
  items: TaskNode[];
};

export type ChecklistState = Record<UserId, Record<string, boolean | number | string>>;

type DbShape = {
  users: User[];
  tasksJasmin: TaskSection[];
  tasksKelsey: TaskSection[];
  checklists: Record<string, ChecklistState>;
};

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "db.json");

const DEFAULT_USERS: User[] = [
  { id: "jasmin", name: "Jasmin" },
  { id: "kelsey", name: "Kelsey" },
];

function flattenTaskIds(nodes: TaskNode[]): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    ids.push(node.id);
    if (node.children?.length) ids.push(...flattenTaskIds(node.children));
  }
  return ids;
}

function flattenSectionIds(sections: TaskSection[]): string[] {
  const ids: string[] = [];
  for (const section of sections) {
    ids.push(...flattenTaskIds(section.items));
  }
  return ids;
}

const JASMIN_SECTIONS: TaskSection[] = [
  {
    title: "AM",
    items: [
      { id: "j_am_hours_sleep", label: "Hours of sleep", inputType: "number" },
      { id: "j_am_sleep_interrupted", label: "How many times sleep interrupted", inputType: "number" },
      { id: "j_am_quality_sleep", label: "Quality of sleep", inputType: "number", min: 1, max: 10 },
      { id: "j_am_mood_morning", label: "Mood in morning", inputType: "number", min: 1, max: 10 },
      { id: "j_am_oz_water", label: "Oz of water", inputType: "number" },
      {
        id: "j_am_meds",
        label: "Morning Medications & Supplements",
        children: [
          { id: "j_am_meds_olanzapine", label: "Olanzapine" },
          { id: "j_am_meds_ativan", label: "Ativan" },
          { id: "j_am_meds_hydroxyzine", label: "Hydroxyzine" },
          { id: "j_am_meds_omega", label: "Omega" },
        ],
      },
      { id: "j_am_word_mood", label: "Word for mood", inputType: "text" },
      { id: "j_am_feel_physically", label: "How do you feel physically", inputType: "number", min: 1, max: 10 },
      { id: "j_am_word_physically", label: "Word for feeling physically", inputType: "text" },
      { id: "j_am_digestive", label: "Digestive enzyme" },
      {
        id: "j_am_squash",
        label: "Butternut squash",
        children: [
          { id: "j_am_squash_chicken", label: "Added chicken" },
          { id: "j_am_squash_egg", label: "Added egg" },
          { id: "j_am_squash_avocado", label: "Added avocado" },
          { id: "j_am_squash_fermented", label: "Added fermented veggies" },
        ],
      },
      {
        id: "j_am_beef",
        label: "Beef",
        children: [
          { id: "j_am_beef_egg", label: "Added egg" },
          { id: "j_am_beef_avocado", label: "Added avocado" },
          { id: "j_am_beef_fermented", label: "Added fermented veggies" },
        ],
      },
    ],
  },
  {
    title: "Lunch",
    items: [
      { id: "j_lunch_mood_midday", label: "Mood midday", inputType: "number", min: 1, max: 10 },
      { id: "j_lunch_word_mood", label: "Word for mood", inputType: "text" },
      { id: "j_lunch_feel_physically", label: "How do you feel physically", inputType: "number", min: 1, max: 10 },
      { id: "j_lunch_word_physically", label: "Word for feeling physically", inputType: "text" },
      { id: "j_lunch_digestive", label: "Digestive enzyme" },
      {
        id: "j_lunch_squash",
        label: "Butternut squash",
        children: [
          { id: "j_lunch_squash_chicken", label: "Added chicken" },
          { id: "j_lunch_squash_egg", label: "Added egg" },
          { id: "j_lunch_squash_avocado", label: "Added avocado" },
          { id: "j_lunch_squash_fermented", label: "Added fermented veggies" },
        ],
      },
      {
        id: "j_lunch_beef",
        label: "Beef",
        children: [
          { id: "j_lunch_beef_egg", label: "Added egg" },
          { id: "j_lunch_beef_avocado", label: "Added avocado" },
          { id: "j_lunch_beef_fermented", label: "Added fermented veggies" },
        ],
      },
    ],
  },
  {
    title: "Mid-day As-needed Medications",
    items: [
      { id: "j_midday_olanzapine", label: "Olanzapine" },
      { id: "j_midday_ativan", label: "Ativan" },
      { id: "j_midday_hydroxyzine", label: "Hydroxyzine" },
    ],
  },
  {
    title: "Detoxifying Practices",
    items: [
      { id: "j_detox_drybrush", label: "Dry brushing" },
      { id: "j_detox_epsom", label: "Epsom salt bath" },
      { id: "j_detox_sauna", label: "Sauna" },
    ],
  },
  {
    title: "Movement",
    items: [
      { id: "j_movement_walk", label: "30 min walking" },
      { id: "j_movement_stretch", label: "Stretching" },
      {
        id: "j_movement_gym",
        label: "Gym",
        children: [
          { id: "j_movement_gym_cardio", label: "Cardio" },
          { id: "j_movement_gym_glutes", label: "Glute program" },
          { id: "j_movement_gym_fascia", label: "Fascia maneuvers" },
        ],
      },
    ],
  },
  {
    title: "Dinner",
    items: [
      { id: "j_dinner_mood_night", label: "Mood at night", inputType: "number", min: 1, max: 10 },
      { id: "j_dinner_word_mood", label: "Word for mood", inputType: "text" },
      { id: "j_dinner_feel_physically", label: "How do you feel physically", inputType: "number", min: 1, max: 10 },
      { id: "j_dinner_word_physically", label: "Word for feeling physically", inputType: "text" },
      { id: "j_dinner_digestive", label: "Digestive enzyme" },
      {
        id: "j_dinner_squash",
        label: "Butternut squash",
        children: [
          { id: "j_dinner_squash_chicken", label: "Added chicken" },
          { id: "j_dinner_squash_egg", label: "Added egg" },
          { id: "j_dinner_squash_avocado", label: "Added avocado" },
          { id: "j_dinner_squash_fermented", label: "Added fermented veggies" },
        ],
      },
      {
        id: "j_dinner_beef",
        label: "Beef",
        children: [
          { id: "j_dinner_beef_chicken", label: "Added chicken" },
          { id: "j_dinner_beef_egg", label: "Added egg" },
          { id: "j_dinner_beef_avocado", label: "Added avocado" },
          { id: "j_dinner_beef_fermented", label: "Added fermented veggies" },
        ],
      },
    ],
  },
  {
    title: "Evening Medications & Supplements",
    items: [
      { id: "j_evening_magnesium", label: "Magnesium" },
      { id: "j_evening_olanzapine", label: "Olanzapine" },
      { id: "j_evening_ativan", label: "Ativan" },
      { id: "j_evening_hydroxyzine", label: "Hydroxyzine" },
    ],
  },
];

const KELSEY_SECTIONS: TaskSection[] = [
  {
    title: "AM",
    items: [
      { id: "k_am_hours_sleep", label: "Hours of sleep", inputType: "number" },
      { id: "k_am_sleep_interrupted", label: "How many times sleep interrupted", inputType: "number" },
      { id: "k_am_quality_sleep", label: "Quality of sleep", inputType: "number", min: 1, max: 10 },
      { id: "k_am_mood_morning", label: "Mood in morning", inputType: "number", min: 1, max: 10 },
      { id: "k_am_oz_water", label: "Oz of water", inputType: "number" },
      { id: "k_am_word_mood", label: "Word for mood", inputType: "text" },
      { id: "k_am_feel_physically", label: "How do you feel physically", inputType: "number", min: 1, max: 10 },
      { id: "k_am_word_physically", label: "Word for feeling physically", inputType: "text" },
      { id: "k_am_digestive", label: "Digestive enzyme" },
      {
        id: "k_am_squash",
        label: "Butternut squash",
        children: [
          { id: "k_am_squash_chicken", label: "Added chicken" },
          { id: "k_am_squash_egg", label: "Added egg" },
          { id: "k_am_squash_avocado", label: "Added avocado" },
          { id: "k_am_squash_fermented", label: "Added fermented veggies" },
        ],
      },
      {
        id: "k_am_beef",
        label: "Beef",
        children: [
          { id: "k_am_beef_egg", label: "Added egg" },
          { id: "k_am_beef_avocado", label: "Added avocado" },
          { id: "k_am_beef_fermented", label: "Added fermented veggies" },
        ],
      },
    ],
  },
  {
    title: "Lunch",
    items: [
      { id: "k_lunch_mood_midday", label: "Mood midday", inputType: "number", min: 1, max: 10 },
      { id: "k_lunch_word_mood", label: "Word for mood", inputType: "text" },
      { id: "k_lunch_feel_physically", label: "How do you feel physically", inputType: "number", min: 1, max: 10 },
      { id: "k_lunch_word_physically", label: "Word for feeling physically", inputType: "text" },
      { id: "k_lunch_digestive", label: "Digestive enzyme" },
      {
        id: "k_lunch_squash",
        label: "Butternut squash",
        children: [
          { id: "k_lunch_squash_chicken", label: "Added chicken" },
          { id: "k_lunch_squash_egg", label: "Added egg" },
          { id: "k_lunch_squash_avocado", label: "Added avocado" },
          { id: "k_lunch_squash_fermented", label: "Added fermented veggies" },
        ],
      },
      {
        id: "k_lunch_beef",
        label: "Beef",
        children: [
          { id: "k_lunch_beef_egg", label: "Added egg" },
          { id: "k_lunch_beef_avocado", label: "Added avocado" },
          { id: "k_lunch_beef_fermented", label: "Added fermented veggies" },
        ],
      },
    ],
  },
  {
    title: "Detoxifying Practices",
    items: [
      { id: "k_detox_drybrush", label: "Dry brushing" },
      { id: "k_detox_epsom", label: "Epsom salt bath" },
      { id: "k_detox_sauna", label: "Sauna" },
    ],
  },
  {
    title: "Movement",
    items: [
      { id: "k_movement_walk", label: "30 min walking" },
      { id: "k_movement_stretch", label: "Stretching" },
      {
        id: "k_movement_gym",
        label: "Gym",
        children: [
          { id: "k_movement_gym_cardio", label: "Cardio" },
          { id: "k_movement_gym_glutes", label: "Glute program" },
          { id: "k_movement_gym_upper", label: "Upper body lift" },
          { id: "k_movement_gym_fascia", label: "Fascia maneuvers" },
        ],
      },
    ],
  },
  {
    title: "Dinner",
    items: [
      { id: "k_dinner_mood_night", label: "Mood at night", inputType: "number", min: 1, max: 10 },
      { id: "k_dinner_word_mood", label: "Word for mood", inputType: "text" },
      { id: "k_dinner_feel_physically", label: "How do you feel physically", inputType: "number", min: 1, max: 10 },
      { id: "k_dinner_word_physically", label: "Word for feeling physically", inputType: "text" },
      { id: "k_dinner_digestive", label: "Digestive enzyme" },
      {
        id: "k_dinner_squash",
        label: "Butternut squash",
        children: [
          { id: "k_dinner_squash_chicken", label: "Added chicken" },
          { id: "k_dinner_squash_egg", label: "Added egg" },
          { id: "k_dinner_squash_avocado", label: "Added avocado" },
          { id: "k_dinner_squash_fermented", label: "Added fermented veggies" },
        ],
      },
      {
        id: "k_dinner_beef",
        label: "Beef",
        children: [
          { id: "k_dinner_beef_chicken", label: "Added chicken" },
          { id: "k_dinner_beef_egg", label: "Added egg" },
          { id: "k_dinner_beef_avocado", label: "Added avocado" },
          { id: "k_dinner_beef_fermented", label: "Added fermented veggies" },
        ],
      },
    ],
  },
  {
    title: "Medications & Supplements",
    items: [
      { id: "k_meds_testosterone", label: "Testosterone" },
      { id: "k_meds_estrogen", label: "Estrogen" },
      { id: "k_meds_omega", label: "Omega" },
      { id: "k_meds_progesterone", label: "Progesterone" },
      { id: "k_meds_magnesium", label: "Magnesium" },
      { id: "k_meds_vitamind", label: "Vitamin D" },
      { id: "k_meds_carnitine", label: "L-carnitine" },
    ],
  },
];

function ensureDbFile(): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const initial: DbShape = {
      users: DEFAULT_USERS,
      tasksJasmin: JASMIN_SECTIONS,
      tasksKelsey: KELSEY_SECTIONS,
      checklists: {},
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), "utf8");
  }
}

function readDb(): DbShape {
  ensureDbFile();
  const raw = fs.readFileSync(DB_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw) as Partial<DbShape>;
    if (!parsed.tasksJasmin || !parsed.tasksKelsey) {
      const migrated: DbShape = {
        users: parsed.users ?? DEFAULT_USERS,
        tasksJasmin: JASMIN_SECTIONS,
        tasksKelsey: KELSEY_SECTIONS,
        checklists: parsed.checklists ?? {},
      };
      fs.writeFileSync(DB_PATH, JSON.stringify(migrated, null, 2), "utf8");
      return migrated;
    }
    // Always use the task templates from code so new items (e.g. Stretching) appear
    const db: DbShape = {
      users: parsed.users ?? DEFAULT_USERS,
      tasksJasmin: JASMIN_SECTIONS,
      tasksKelsey: KELSEY_SECTIONS,
      checklists: parsed.checklists ?? {},
    };
    writeDb(db);
    return db;
  } catch {
    const reset: DbShape = {
      users: DEFAULT_USERS,
      tasksJasmin: JASMIN_SECTIONS,
      tasksKelsey: KELSEY_SECTIONS,
      checklists: {},
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(reset, null, 2), "utf8");
    return reset;
  }
}

function writeDb(db: DbShape): void {
  ensureDbFile();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

export function getUsers(): User[] {
  if (isSupabaseConfigured()) return DEFAULT_USERS;
  const db = readDb();
  return db.users;
}

export function getTasksForUser(userId: UserId): TaskSection[] {
  if (isSupabaseConfigured())
    return userId === "jasmin" ? JASMIN_SECTIONS : KELSEY_SECTIONS;
  const db = readDb();
  return userId === "jasmin" ? db.tasksJasmin : db.tasksKelsey;
}

export function getTodayKey(date?: Date): string {
  const d = date ?? new Date();
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getAllTaskIdsForUser(userId: UserId): string[] {
  const sections = getTasksForUser(userId);
  return flattenSectionIds(sections);
}

export async function getChecklistForDate(dateKey: string): Promise<{
  date: string;
  users: User[];
  tasksJasmin: TaskSection[];
  tasksKelsey: TaskSection[];
  checklists: ChecklistState;
}> {
  const users = DEFAULT_USERS;
  const tasksJasmin = JASMIN_SECTIONS;
  const tasksKelsey = KELSEY_SECTIONS;

  if (isSupabaseConfigured()) {
    const checklists = await getChecklistStateFromSupabase(dateKey);
    return {
      date: dateKey,
      users,
      tasksJasmin,
      tasksKelsey,
      checklists,
    };
  }

  const db = readDb();
  if (!db.checklists[dateKey]) {
    const emptyByUser: ChecklistState = {
      jasmin: {},
      kelsey: {},
    };
    for (const id of flattenSectionIds(tasksJasmin)) emptyByUser.jasmin[id] = false;
    for (const id of flattenSectionIds(tasksKelsey)) emptyByUser.kelsey[id] = false;
    db.checklists[dateKey] = emptyByUser;
    writeDb(db);
  }

  return {
    date: dateKey,
    users: db.users,
    tasksJasmin: db.tasksJasmin,
    tasksKelsey: db.tasksKelsey,
    checklists: db.checklists[dateKey],
  };
}

export async function getAllDateKeys(): Promise<string[]> {
  if (isSupabaseConfigured()) {
    return getAllDateKeysFromSupabase();
  }
  const db = readDb();
  return Object.keys(db.checklists).sort();
}

export async function updateChecklistEntry(options: {
  dateKey: string;
  userId: UserId;
  taskId: string;
  value: boolean | number | string;
}): Promise<ChecklistState> {
  const { dateKey, userId, taskId, value } = options;
  const validIds = new Set(getAllTaskIdsForUser(userId));
  if (!validIds.has(taskId)) {
    throw new Error("Invalid task for user");
  }

  if (isSupabaseConfigured()) {
    const state = await getChecklistStateFromSupabase(dateKey);
    const userValues = { ...(state[userId] ?? {}), [taskId]: value };
    await upsertChecklistStateInSupabase(dateKey, userId, userValues);
    return {
      ...state,
      [userId]: userValues,
    };
  }

  const db = readDb();
  if (!db.checklists[dateKey]) {
    await getChecklistForDate(dateKey);
    return updateChecklistEntry(options);
  }

  const userChecklist = db.checklists[dateKey][userId] ?? {};
  userChecklist[taskId] = value;
  db.checklists[dateKey][userId] = userChecklist;

  writeDb(db);
  return db.checklists[dateKey];
}
