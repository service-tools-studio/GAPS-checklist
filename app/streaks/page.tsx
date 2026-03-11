import { getReflectionTimeSeries } from "@/lib/reflection-data";
import { getStreaksForUser } from "@/lib/streaks";
import type { UserStreaks } from "@/lib/streaks";
import ReflectionChart from "./ReflectionChart";

const LABELS: Record<keyof UserStreaks, string> = {
  full: "Complete GAPS day",
  meals: "Meals (Breakfast + Lunch + Dinner)",
  movement: "Movement",
  detox: "Detox practices",
};

function PillarRow({
  label,
  current,
  best,
}: {
  label: string;
  current: number;
  best: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-rose-50/80 px-3 py-2 text-xs text-rose-900">
      <div className="flex flex-col">
        <span className="font-semibold">{label}</span>
        <span className="text-[0.7rem] text-rose-500">
          Current: {current} day{current === 1 ? "" : "s"}
        </span>
      </div>
      <span className="text-[0.7rem] font-semibold text-rose-600">
        Best: {best} day{best === 1 ? "" : "s"}
      </span>
    </div>
  );
}

function UserStreakCard({
  name,
  streaks,
  accentClass,
}: {
  name: "Jasmin" | "Kelsey";
  streaks: UserStreaks;
  accentClass: string;
}) {
  return (
    <section className="flex flex-1 flex-col gap-3 rounded-3xl border border-rose-100 bg-white/80 p-4 shadow-sm">
      <header className="mb-1 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-400">
            {name}
          </h2>
          <p className="text-xs text-rose-700">
            GAPS streaks across meals, movement, and detox.
          </p>
        </div>
        <div
          className={`flex h-auto min-h-9 shrink-0 flex-col justify-center rounded-full px-4 py-1.5 text-[0.7rem] font-semibold text-white ${accentClass}`}
        >
          <span className="whitespace-nowrap uppercase tracking-[0.18em]">Complete GAPS</span>
          <span className="text-[0.65rem]">
            {streaks.full.current} day
            {streaks.full.current === 1 ? "" : "s"}
          </span>
        </div>
      </header>
      <div className="space-y-2">
        <PillarRow
          label={LABELS.full}
          current={streaks.full.current}
          best={streaks.full.best}
        />
        <PillarRow
          label={LABELS.meals}
          current={streaks.meals.current}
          best={streaks.meals.best}
        />
        <PillarRow
          label={LABELS.movement}
          current={streaks.movement.current}
          best={streaks.movement.best}
        />
        <PillarRow
          label={LABELS.detox}
          current={streaks.detox.current}
          best={streaks.detox.best}
        />
      </div>
    </section>
  );
}

export default async function StreaksPage() {
  const [jasminStreaks, kelseyStreaks, reflectionData] = await Promise.all([
    getStreaksForUser("jasmin"),
    getStreaksForUser("kelsey"),
    getReflectionTimeSeries(),
  ]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-200 via-amber-50 to-sky-100 px-4 py-10 text-rose-950">
      <main className="w-full max-w-5xl rounded-3xl border border-rose-100 bg-white/80 p-6 shadow-[0_24px_80px_rgba(244,114,182,0.35)] backdrop-blur-xl sm:p-8">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              Dashboard
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-rose-950 sm:text-3xl">
              GAPS Dashboard
            </h1>
            <p className="mt-1 text-sm text-rose-700">
              Streaks and reflection over time for Jasmin &amp; Kelsey.
            </p>
          </div>
        </header>

        <section className="mb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-rose-500">
            Streaks
          </h2>
          <div className="flex flex-col gap-4 sm:flex-row">
            <UserStreakCard
              name="Jasmin"
              streaks={jasminStreaks}
              accentClass="bg-purple-400"
            />
            <UserStreakCard
              name="Kelsey"
              streaks={kelseyStreaks}
              accentClass="bg-pink-500"
            />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-rose-500">
            Reflection (mood &amp; physical feeling)
          </h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <ReflectionChart
              data={reflectionData}
              user="Jasmin"
              accentClass="text-purple-500"
            />
            <ReflectionChart
              data={reflectionData}
              user="Kelsey"
              accentClass="text-pink-500"
            />
          </div>
        </section>
      </main>
    </div>
  );
}

