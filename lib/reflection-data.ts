import { getChecklistForDate, getTodayKey } from "./store";
import type { UserId } from "./store";

const RAW_IDS = {
  jasmin: {
    quality_sleep: "j_am_quality_sleep",
    mood_am: "j_am_mood_morning",
    mood_midday: "j_lunch_mood_midday",
    mood_night: "j_dinner_mood_night",
    feel_am: "j_am_feel_physically",
    feel_midday: "j_lunch_feel_physically",
    feel_night: "j_dinner_feel_physically",
  },
  kelsey: {
    quality_sleep: "k_am_quality_sleep",
    mood_am: "k_am_mood_morning",
    mood_midday: "k_lunch_mood_midday",
    mood_night: "k_dinner_mood_night",
    feel_am: "k_am_feel_physically",
    feel_midday: "k_lunch_feel_physically",
    feel_night: "k_dinner_feel_physically",
  },
} as const;

const CHART_METRICS = [
  { id: "quality_sleep", label: "Quality of sleep" },
  { id: "mood", label: "Mood" },
  { id: "feel_physically", label: "Feel physically" },
];

const DAYS_TO_FETCH = 30;

export type ReflectionTimeSeries = {
  dates: string[];
  jasmin: Record<string, number[]>;
  kelsey: Record<string, number[]>;
  metrics: { id: string; label: string }[];
};

export async function getReflectionTimeSeries(): Promise<ReflectionTimeSeries> {
  const todayKey = getTodayKey();
  const dates: string[] = [];
  const d = new Date();
  for (let i = DAYS_TO_FETCH - 1; i >= 0; i--) {
    const past = new Date(d);
    past.setDate(past.getDate() - i);
    const y = past.getFullYear();
    const m = `${past.getMonth() + 1}`.padStart(2, "0");
    const day = `${past.getDate()}`.padStart(2, "0");
    const key = `${y}-${m}-${day}`;
    if (key <= todayKey) dates.push(key);
  }

  const jasminRaw: Record<string, number[]> = {
    quality_sleep: [],
    mood_am: [],
    mood_midday: [],
    mood_night: [],
    feel_am: [],
    feel_midday: [],
    feel_night: [],
  };
  const kelseyRaw: Record<string, number[]> = {
    quality_sleep: [],
    mood_am: [],
    mood_midday: [],
    mood_night: [],
    feel_am: [],
    feel_midday: [],
    feel_night: [],
  };

  for (const dateKey of dates) {
    const { checklists } = await getChecklistForDate(dateKey);
    for (const key of Object.keys(RAW_IDS.jasmin) as (keyof typeof RAW_IDS.jasmin)[]) {
      const id = RAW_IDS.jasmin[key];
      const v = checklists.jasmin?.[id];
      const num = typeof v === "number" && !Number.isNaN(v) ? v : NaN;
      jasminRaw[key].push(num);
    }
    for (const key of Object.keys(RAW_IDS.kelsey) as (keyof typeof RAW_IDS.kelsey)[]) {
      const id = RAW_IDS.kelsey[key];
      const v = checklists.kelsey?.[id];
      const num = typeof v === "number" && !Number.isNaN(v) ? v : NaN;
      kelseyRaw[key].push(num);
    }
  }

  function avg(a: number, b: number, c: number): number {
    const vals = [a, b, c].filter((n) => typeof n === "number" && !Number.isNaN(n));
    if (vals.length === 0) return NaN;
    return vals.reduce((s, n) => s + n, 0) / vals.length;
  }

  const jasmin: Record<string, number[]> = {
    quality_sleep: jasminRaw.quality_sleep,
    mood: jasminRaw.mood_am.map((_, i) =>
      avg(jasminRaw.mood_am[i], jasminRaw.mood_midday[i], jasminRaw.mood_night[i]),
    ),
    feel_physically: jasminRaw.feel_am.map((_, i) =>
      avg(jasminRaw.feel_am[i], jasminRaw.feel_midday[i], jasminRaw.feel_night[i]),
    ),
  };
  const kelsey: Record<string, number[]> = {
    quality_sleep: kelseyRaw.quality_sleep,
    mood: kelseyRaw.mood_am.map((_, i) =>
      avg(kelseyRaw.mood_am[i], kelseyRaw.mood_midday[i], kelseyRaw.mood_night[i]),
    ),
    feel_physically: kelseyRaw.feel_am.map((_, i) =>
      avg(kelseyRaw.feel_am[i], kelseyRaw.feel_midday[i], kelseyRaw.feel_night[i]),
    ),
  };

  return {
    dates,
    jasmin,
    kelsey,
    metrics: CHART_METRICS,
  };
}
