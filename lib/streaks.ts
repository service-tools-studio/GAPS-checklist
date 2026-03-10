import {
  getAllDateKeys,
  getChecklistForDate,
  getTasksForUser,
  type ChecklistState,
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
  // Kelsey - Movement -> Gym (all sub-items optional)
  "k_movement_gym_cardio",
  "k_movement_gym_glutes",
  "k_movement_gym_upper",
  "k_movement_gym_fascia",
]);

function isSectionComplete(
  section: TaskSection,
  userChecklist: ChecklistState[UserId],
): boolean {
  const getChecked = (taskId: string) => userChecklist?.[taskId] ?? false;

  const sectionTaskIds = collectTaskIdsFromSectionItems(section.items);

  const isMealSection =
    section.title === "AM" ||
    section.title === "Lunch" ||
    section.title === "Dinner";

  if (isMealSection) {
    const mealNodes = section.items.filter(
      (node) => node.id.endsWith("_squash") || node.id.endsWith("_beef"),
    );

    const allMealIds: string[] = [];
    for (const node of mealNodes) {
      allMealIds.push(...collectTaskIdsFromSectionItems([node]));
    }

    const requiredNonMealTaskIds = sectionTaskIds.filter(
      (id) => !allMealIds.includes(id) && !OPTIONAL_TASK_IDS.has(id),
    );

    const nonMealComplete =
      requiredNonMealTaskIds.length === 0 ||
      requiredNonMealTaskIds.every((id) => getChecked(id));

    const mealOptionComplete =
      mealNodes.length === 0 ||
      mealNodes.some((node) => {
        const ids = collectTaskIdsFromSectionItems([node]).filter(
          (id) => !OPTIONAL_TASK_IDS.has(id),
        );
        return ids.length === 0 || ids.every((id) => getChecked(id));
      });

    return nonMealComplete && mealOptionComplete;
  }

  const requiredTaskIds = sectionTaskIds.filter(
    (id) => !OPTIONAL_TASK_IDS.has(id),
  );
  return (
    requiredTaskIds.length > 0 &&
    requiredTaskIds.every((id) => getChecked(id))
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
    (sectionMap.get("AM") ?? false) &&
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

