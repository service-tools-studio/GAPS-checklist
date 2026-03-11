import {
  getAllDateKeys,
  getChecklistForDate,
  getTasksForUser,
  type ChecklistState,
  type TaskNode,
  type TaskSection,
  type UserId,
} from "./store";

type PillarKey = "full" | "meals" | "movement" | "detox";

export type StreakStats = {
  current: number;
  best: number;
};

export type UserStreaks = Record<PillarKey, StreakStats>;

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map((v) => Number.parseInt(v, 10));
  return new Date(y, m - 1, d);
}

function isNextDay(prevKey: string, currKey: string): boolean {
  const prev = parseDateKey(prevKey);
  const curr = parseDateKey(currKey);
  const next = new Date(prev);
  next.setDate(prev.getDate() + 1);
  return (
    next.getFullYear() === curr.getFullYear() &&
    next.getMonth() === curr.getMonth() &&
    next.getDate() === curr.getDate()
  );
}

function collectTaskIdsFromSectionItems(items: TaskSection["items"]): string[] {
  const ids: string[] = [];
  const stack = [...items];
  while (stack.length) {
    const node = stack.pop()!;
    ids.push(node.id);
    if (node.children?.length) {
      stack.push(...node.children);
    }
  }
  return ids;
}

function collectTaskNodesFromSectionItems(items: TaskSection["items"]): { id: string; node: TaskNode }[] {
  const out: { id: string; node: TaskNode }[] = [];
  const stack = [...items];
  while (stack.length) {
    const node = stack.pop()!;
    out.push({ id: node.id, node });
    if (node.children?.length) {
      stack.push(...node.children);
    }
  }
  return out;
}

function isTaskComplete(node: TaskNode, value: boolean | number | string | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (node.inputType === "number") {
    if (typeof value !== "number" || Number.isNaN(value)) return false;
    if (node.min != null && value < node.min) return false;
    if (node.max != null && value > node.max) return false;
    return true;
  }
  if (node.inputType === "text") return typeof value === "string" && value.trim() !== "";
  return value === true;
}

const OPTIONAL_TASK_IDS = new Set<string>([
  // Jasmin - AM meds
  "j_am_meds_olanzapine",
  "j_am_meds_ativan",
  "j_am_meds_hydroxyzine",
  // Jasmin - Mid-day as-needed meds
  "j_midday_olanzapine",
  "j_midday_ativan",
  "j_midday_hydroxyzine",
  // Jasmin - Evening meds
  "j_evening_olanzapine",
  "j_evening_ativan",
  "j_evening_hydroxyzine",
  // Jasmin - Movement -> Gym (all sub-items optional)
  "j_movement_gym_cardio",
  "j_movement_gym_glutes",
  "j_movement_gym_fascia",
  // Jasmin - Squash & Beef sub-items (all optional)
  "j_am_squash_chicken",
  "j_am_squash_egg",
  "j_am_squash_avocado",
  "j_am_squash_fermented",
  "j_am_beef_egg",
  "j_am_beef_avocado",
  "j_am_beef_fermented",
  "j_lunch_squash_chicken",
  "j_lunch_squash_egg",
  "j_lunch_squash_avocado",
  "j_lunch_squash_fermented",
  "j_lunch_beef_egg",
  "j_lunch_beef_avocado",
  "j_lunch_beef_fermented",
  "j_dinner_squash_chicken",
  "j_dinner_squash_egg",
  "j_dinner_squash_avocado",
  "j_dinner_squash_fermented",
  "j_dinner_beef_chicken",
  "j_dinner_beef_egg",
  "j_dinner_beef_avocado",
  "j_dinner_beef_fermented",
  "j_am_squash_sourcream",
  "j_am_beef_sourcream",
  "j_lunch_squash_sourcream",
  "j_lunch_beef_sourcream",
  "j_dinner_squash_sourcream",
  "j_dinner_beef_sourcream",
  // Kelsey - Movement -> Gym (all sub-items optional)
  "k_movement_gym_cardio",
  "k_movement_gym_glutes",
  "k_movement_gym_upper",
  "k_movement_gym_fascia",
  // Kelsey - Squash & Beef sub-items (all optional)
  "k_am_squash_chicken",
  "k_am_squash_egg",
  "k_am_squash_avocado",
  "k_am_squash_fermented",
  "k_am_beef_egg",
  "k_am_beef_avocado",
  "k_am_beef_fermented",
  "k_lunch_squash_chicken",
  "k_lunch_squash_egg",
  "k_lunch_squash_avocado",
  "k_lunch_squash_fermented",
  "k_lunch_beef_egg",
  "k_lunch_beef_avocado",
  "k_lunch_beef_fermented",
  "k_dinner_squash_chicken",
  "k_dinner_squash_egg",
  "k_dinner_squash_avocado",
  "k_dinner_squash_fermented",
  "k_dinner_beef_chicken",
  "k_dinner_beef_egg",
  "k_dinner_beef_avocado",
  "k_dinner_beef_fermented",
  "k_am_squash_sourcream",
  "k_am_beef_sourcream",
  "k_lunch_squash_sourcream",
  "k_lunch_beef_sourcream",
  "k_dinner_squash_sourcream",
  "k_dinner_beef_sourcream",
]);

function isSectionComplete(
  section: TaskSection,
  userChecklist: ChecklistState[UserId],
): boolean {
  const getValue = (taskId: string) => userChecklist?.[taskId];
  const taskNodes = collectTaskNodesFromSectionItems(section.items);

  const isMealSection =
    section.title === "Breakfast" ||
    section.title === "Lunch" ||
    section.title === "Dinner";

  if (isMealSection) {
    const mealNodes = section.items.filter(
      (node) => node.id.endsWith("_squash") || node.id.endsWith("_beef"),
    );
    const allMealIds = new Set(mealNodes.flatMap((n) => collectTaskIdsFromSectionItems([n])));
    const requiredNonMeal = taskNodes.filter(
      ({ id }) => !allMealIds.has(id) && !OPTIONAL_TASK_IDS.has(id),
    );
    const nonMealComplete =
      requiredNonMeal.length === 0 ||
      requiredNonMeal.every(({ id, node }) => isTaskComplete(node, getValue(id)));
    const mealOptionComplete =
      mealNodes.length === 0 ||
      mealNodes.some((node) => {
        const pairs = collectTaskNodesFromSectionItems([node]).filter(
          ({ id }) => !OPTIONAL_TASK_IDS.has(id),
        );
        return pairs.length === 0 || pairs.every(({ id, node }) => isTaskComplete(node, getValue(id)));
      });
    return nonMealComplete && mealOptionComplete;
  }

  if (section.title === "Detoxifying Practices" || section.title === "Snacks") {
    return taskNodes.some(({ id, node }) => isTaskComplete(node, getValue(id)));
  }

  const required = taskNodes.filter(({ id }) => !OPTIONAL_TASK_IDS.has(id));
  return (
    required.length > 0 &&
    required.every(({ id, node }) => isTaskComplete(node, getValue(id)))
  );
}

async function evaluatePillarsForUserOnDate(
  dateKey: string,
  userId: UserId,
): Promise<Record<PillarKey, boolean>> {
  const { tasksJasmin, tasksKelsey, checklists } =
    await getChecklistForDate(dateKey);
  const sections = userId === "jasmin" ? tasksJasmin : tasksKelsey;
  const userChecklist = checklists[userId];

  const sectionMap = new Map<string, boolean>();
  for (const section of sections) {
    sectionMap.set(section.title, isSectionComplete(section, userChecklist));
  }

  const meals =
    (sectionMap.get("Breakfast") ?? false) &&
    (sectionMap.get("Lunch") ?? false) &&
    (sectionMap.get("Dinner") ?? false);
  const movement = sectionMap.get("Movement") ?? false;
  const detox = sectionMap.get("Detoxifying Practices") ?? false;

  return {
    meals,
    movement,
    detox,
    full: meals && movement && detox,
  };
}

function computeStreakForPillar(
  dates: string[],
  successes: boolean[],
): StreakStats {
  if (dates.length !== successes.length) {
    throw new Error("dates and successes length mismatch");
  }

  let best = 0;
  let run = 0;

  for (let i = 0; i < dates.length; i += 1) {
    if (!successes[i]) {
      run = 0;
      continue;
    }
    if (i > 0 && !isNextDay(dates[i - 1]!, dates[i]!)) {
      run = 0;
    }
    run += 1;
    if (run > best) best = run;
  }

  // Current streak: walk backwards from most recent date
  let current = 0;
  for (let i = dates.length - 1; i >= 0; i -= 1) {
    if (!successes[i]) break;
    if (
      i < dates.length - 1 &&
      !isNextDay(dates[i]!, dates[i + 1]!)
    ) {
      break;
    }
    current += 1;
  }

  return { current, best };
}

export async function getStreaksForUser(userId: UserId): Promise<UserStreaks> {
  const allDates = await getAllDateKeys();
  if (allDates.length === 0) {
    return {
      full: { current: 0, best: 0 },
      meals: { current: 0, best: 0 },
      movement: { current: 0, best: 0 },
      detox: { current: 0, best: 0 },
    };
  }

  // Filter out future dates, just in case
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(
    2,
    "0",
  )}-${`${today.getDate()}`.padStart(2, "0")}`;
  const dates = allDates.filter((d) => d <= todayKey);

  const mealsFlags: boolean[] = [];
  const movementFlags: boolean[] = [];
  const detoxFlags: boolean[] = [];
  const fullFlags: boolean[] = [];

  for (const dateKey of dates) {
    const pillars = await evaluatePillarsForUserOnDate(dateKey, userId);
    mealsFlags.push(pillars.meals);
    movementFlags.push(pillars.movement);
    detoxFlags.push(pillars.detox);
    fullFlags.push(pillars.full);
  }

  return {
    full: computeStreakForPillar(dates, fullFlags),
    meals: computeStreakForPillar(dates, mealsFlags),
    movement: computeStreakForPillar(dates, movementFlags),
    detox: computeStreakForPillar(dates, detoxFlags),
  };
}

