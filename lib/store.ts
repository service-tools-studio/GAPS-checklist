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
};

export type TaskSection = {
  title: string;
  items: TaskNode[];
};

export type ChecklistState = Record<UserId, Record<string, boolean>>;

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
      { id: "j_am_sleep", label: "Did I get enough sleep?" },
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
      {
        id: "j_am_water",
        label: "Water",
        children: [{ id: "j_am_water_minerals", label: "With minerals" }],
      },
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
      {
        id: "j_lunch_water",
        label: "Water",
        children: [{ id: "j_lunch_water_minerals", label: "With minerals" }],
      },
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
      {
        id: "j_dinner_water",
        label: "Water",
        children: [{ id: "j_dinner_water_minerals", label: "With minerals" }],
      },
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
      { id: "k_am_sleep", label: "Did I get enough sleep?" },
      {
        id: "k_am_meds",
        label: "Morning Medications & Supplements",
        children: [
          { id: "k_am_meds_testosterone", label: "Testosterone" },
          { id: "k_am_meds_estrogen", label: "Estrogen" },
          { id: "k_am_meds_omega", label: "Omega" },
        ],
      },
      {
        id: "k_am_water",
        label: "Water",
        children: [{ id: "k_am_water_minerals", label: "With minerals" }],
      },
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
      {
        id: "k_lunch_water",
        label: "Water",
        children: [{ id: "k_lunch_water_minerals", label: "With minerals" }],
      },
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
      {
        id: "k_dinner_water",
        label: "Water",
        children: [{ id: "k_dinner_water_minerals", label: "With minerals" }],
      },
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
    title: "Evening Medications & Supplements",
    items: [
      { id: "k_evening_progesterone", label: "Progesterone" },
      { id: "k_evening_magnesium", label: "Magnesium" },
      { id: "k_evening_vitamind", label: "Vitamin D" },
      { id: "k_evening_carnitine", label: "L-carnitine" },
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
  completed: boolean;
}): Promise<ChecklistState> {
  const { dateKey, userId, taskId, completed } = options;
  const validIds = new Set(getAllTaskIdsForUser(userId));
  if (!validIds.has(taskId)) {
    throw new Error("Invalid task for user");
  }

  if (isSupabaseConfigured()) {
    const state = await getChecklistStateFromSupabase(dateKey);
    const userCompleted = { ...(state[userId] ?? {}), [taskId]: completed };
    await upsertChecklistStateInSupabase(dateKey, userId, userCompleted);
    return {
      ...state,
      [userId]: userCompleted,
    };
  }

  const db = readDb();
  if (!db.checklists[dateKey]) {
    await getChecklistForDate(dateKey);
    return updateChecklistEntry(options);
  }

  const userChecklist = db.checklists[dateKey][userId] ?? {};
  userChecklist[taskId] = completed;
  db.checklists[dateKey][userId] = userChecklist;

  writeDb(db);
  return db.checklists[dateKey];
}
