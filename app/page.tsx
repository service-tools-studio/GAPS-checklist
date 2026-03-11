"use client";

import { useEffect, useState } from "react";

type UserId = "jasmin" | "kelsey";

type User = {
  id: UserId;
  name: string;
};

type TaskNode = {
  id: string;
  label: string;
  children?: TaskNode[];
  inputType?: "check" | "number" | "text";
  min?: number;
  max?: number;
};

type TaskSection = {
  title: string;
  items: TaskNode[];
};

type ChecklistState = Record<UserId, Record<string, boolean | number | string>>;

type ChecklistResponse = {
  date: string;
  users: User[];
  tasksJasmin: TaskSection[];
  tasksKelsey: TaskSection[];
  checklists: ChecklistState;
};

function collectTaskIds(nodes: TaskNode[]): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    ids.push(node.id);
    if (node.children?.length) {
      ids.push(...collectTaskIds(node.children));
    }
  }
  return ids;
}

function collectTaskNodes(nodes: TaskNode[]): { id: string; node: TaskNode }[] {
  const out: { id: string; node: TaskNode }[] = [];
  for (const node of nodes) {
    out.push({ id: node.id, node });
    if (node.children?.length) out.push(...collectTaskNodes(node.children));
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
  // Kelsey - Movement -> Gym (all sub-items optional)
  "k_movement_gym_cardio",
  "k_movement_gym_glutes",
  "k_movement_gym_upper",
  "k_movement_gym_fascia",
]);

const inputClass =
  "w-20 rounded-lg border border-rose-200 bg-rose-50/50 px-2 py-1.5 text-sm text-rose-900 placeholder:text-rose-400 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/20 disabled:opacity-60";

function TaskRow({
  node,
  getValue,
  disabled,
  onValueChange,
  depth = 0,
}: {
  node: TaskNode;
  getValue: (taskId: string) => boolean | number | string | undefined;
  disabled: boolean;
  onValueChange: (taskId: string, value: boolean | number | string) => void;
  depth?: number;
}) {
  const type = node.inputType ?? "check";
  const value = getValue(node.id);

  return (
    <>
      <div
        className="flex flex-wrap items-center gap-2 py-1.5"
        style={{ paddingLeft: depth * 20 }}
      >
        <span className="min-w-0 flex-1 text-sm text-rose-900">{node.label}</span>
        {type === "check" && (
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 cursor-pointer rounded border-rose-300 bg-rose-50 text-rose-500 outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-rose-50 disabled:cursor-default disabled:opacity-60"
              checked={value === true}
              disabled={disabled}
              onChange={(e) => onValueChange(node.id, e.target.checked)}
            />
          </label>
        )}
        {type === "number" && (
          <input
            type="number"
            className={node.max != null ? `${inputClass} w-14` : inputClass}
            min={node.min}
            max={node.max}
            value={typeof value === "number" && !Number.isNaN(value) ? value : ""}
            placeholder={node.max != null ? `${node.min}-${node.max}` : ""}
            disabled={disabled}
            onChange={(e) => {
              const raw = e.target.value;
              onValueChange(node.id, raw === "" ? "" : Number(raw));
            }}
          />
        )}
        {type === "text" && (
          <input
            type="text"
            className={`${inputClass} min-w-[120px] max-w-[200px]`}
            value={typeof value === "string" ? value : ""}
            placeholder=""
            disabled={disabled}
            onChange={(e) => onValueChange(node.id, e.target.value)}
          />
        )}
      </div>
      {node.children?.map((child) => (
        <TaskRow
          key={child.id}
          node={child}
          getValue={getValue}
          disabled={disabled}
          onValueChange={onValueChange}
          depth={depth + 1}
        />
      ))}
    </>
  );
}

function UserChecklist({
  userName,
  sections,
  userChecklist,
  canEdit,
  onValueChange,
  headerAccentClass = "border-rose-200 text-rose-500",
}: {
  userName: string;
  sections: TaskSection[];
  userChecklist: Record<string, boolean | number | string>;
  canEdit: boolean;
  onValueChange: (taskId: string, value: boolean | number | string) => void;
  headerAccentClass?: string;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const getValue = (taskId: string) => userChecklist[taskId];

  const toggleSection = (title: string) => {
    setExpanded((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <div className="rounded-2xl border border-rose-100 bg-white/80">
      <h3 className={`border-b px-4 py-3 text-sm font-semibold uppercase tracking-wider ${headerAccentClass}`}>
        {userName}&apos;s GAPS checklist
        {!canEdit && (
          <span className="ml-2 text-xs font-normal normal-case opacity-80">
            (view only)
          </span>
        )}
      </h3>
      <div className="max-h-[70vh] overflow-y-auto p-4">
        {sections.map((section) => {
          const isExpanded = expanded[section.title] === true;
          const taskNodes = collectTaskNodes(section.items);
          const isMealSection =
            section.title === "AM" ||
            section.title === "Lunch" ||
            section.title === "Dinner";

          let sectionComplete = false;

          if (isMealSection) {
            const mealNodes = section.items.filter(
              (node) =>
                node.id.endsWith("_squash") || node.id.endsWith("_beef"),
            );
            const allMealIds = new Set(mealNodes.flatMap((n) => collectTaskIds([n])));
            const requiredNonMeal = taskNodes.filter(
              ({ id }) => !allMealIds.has(id) && !OPTIONAL_TASK_IDS.has(id),
            );
            const nonMealComplete =
              requiredNonMeal.length === 0 ||
              requiredNonMeal.every(({ id, node }) => isTaskComplete(node, getValue(id)));
            const mealOptionComplete =
              mealNodes.length === 0 ||
              mealNodes.some((node) => {
                const pairs = collectTaskNodes([node]).filter(({ id }) => !OPTIONAL_TASK_IDS.has(id));
                return pairs.length === 0 || pairs.every(({ id, node }) => isTaskComplete(node, getValue(id)));
              });
            sectionComplete = nonMealComplete && mealOptionComplete;
          } else {
            const required = taskNodes.filter(({ id }) => !OPTIONAL_TASK_IDS.has(id));
            sectionComplete =
              required.length > 0 &&
              required.every(({ id, node }) => isTaskComplete(node, getValue(id)));
          }
          return (
            <div key={section.title} className="mb-4">
              <button
                type="button"
                onClick={() => toggleSection(section.title)}
                className="mb-2 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wider text-rose-500 transition hover:bg-rose-50/80"
              >
                <span className="flex items-center gap-2">
                  <span>{section.title}</span>
                  {sectionComplete && (
                    <span className="inline-flex items-center justify-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-emerald-700">
                      ✓
                    </span>
                  )}
                </span>
                <span
                  className={`inline-block text-[0.7rem] transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  aria-hidden
                >
                  ▼
                </span>
              </button>
              {isExpanded && (
                <div className="space-y-0">
                  {section.items.map((node) => (
                    <TaskRow
                      key={node.id}
                      node={node}
                      getValue={getValue}
                      disabled={!canEdit}
                      onValueChange={onValueChange}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [checklist, setChecklist] = useState<ChecklistResponse | null>(null);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    void fetchCurrentUser();
  }, []);

  async function fetchCurrentUser() {
    setLoadingUser(true);
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      const data = (await res.json()) as { user: User | null };
      setCurrentUser(data.user);
      if (data.user) {
        await fetchChecklist();
      }
    } catch (err) {
      console.error(err);
      setError("Unable to load current user.");
    } finally {
      setLoadingUser(false);
    }
  }

  async function fetchChecklist(date?: string) {
    setLoadingChecklist(true);
    try {
      const url = date ? `/api/checklist?date=${date}` : "/api/checklist";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Failed to load checklist");
      }
      const data = (await res.json()) as ChecklistResponse;
      setChecklist(data);
      setSelectedDate(data.date);
    } catch (err) {
      console.error(err);
      setError("Unable to load checklist.");
    } finally {
      setLoadingChecklist(false);
    }
  }

  async function handleLogin(userId: UserId) {
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error || "Login failed");
      }

      const data = (await res.json()) as { user: User };
      setCurrentUser(data.user);
      await fetchChecklist();
    } catch (err) {
      console.error(err);
      setError("Login failed. Please try again.");
    }
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    setCurrentUser(null);
    setChecklist(null);
    setSelectedDate(null);
  }

  async function updateValue(taskId: string, value: boolean | number | string) {
    if (!currentUser) return;
    setError(null);

    setChecklist((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        checklists: {
          ...prev.checklists,
          [currentUser.id]: {
            ...prev.checklists[currentUser.id],
            [taskId]: value,
          },
        },
      };
    });

    try {
      const res = await fetch("/api/checklist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ taskId, value, date: selectedDate ?? undefined }),
      });
      if (!res.ok) {
        throw new Error("Failed to update checklist");
      }
      const data = (await res.json()) as ChecklistResponse;
      setChecklist(data);
    } catch (err) {
      console.error(err);
      setError("Unable to save change. Please try again.");
      void fetchChecklist(selectedDate ?? undefined);
    }
  }

  function shiftDate(base: string, deltaDays: number): string {
    const d = new Date(base + "T00:00:00");
    d.setDate(d.getDate() + deltaDays);
    const year = d.getFullYear();
    const month = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, "0")}-${`${today.getDate()}`.padStart(2, "0")}`;

  const effectiveDate = selectedDate ?? checklist?.date ?? todayKey;

  const prettyDate =
    effectiveDate &&
    new Date(effectiveDate + "T00:00:00").toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-200 via-amber-50 to-sky-100 px-4 py-10 text-rose-950">
      <main className="w-full max-w-6xl rounded-3xl border border-rose-100 bg-white/80 p-6 shadow-[0_24px_80px_rgba(244,114,182,0.35)] backdrop-blur-xl sm:p-8">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              GAPS Daily Care
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-rose-950 sm:text-4xl">
              GAPS Checklist
            </h1>
            <p className="mt-1 text-sm text-rose-700">
              For Jasmin &amp; Kelsey to track nourishing GAPS
              meals, supplements, and daily practices.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {currentUser ? (
              <>
                <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Signed in as {currentUser.name}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full bg-rose-500 px-3 py-1.5 text-xs font-semibold text-rose-50 shadow-sm shadow-rose-300 transition hover:bg-rose-400"
                >
                  Log out
                </button>
              </>
            ) : (
              <span className="text-xs text-rose-700">
                {loadingUser ? "Checking session..." : "Not signed in"}
              </span>
            )}
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!currentUser && !loadingUser && (
          <section className="mb-4 rounded-2xl border border-rose-100 bg-white/80 px-4 py-5">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.15em] text-rose-500">
              Choose user
            </h2>
            <p className="mb-4 text-sm text-rose-700">
              Sign in as Jasmin or Kelsey to track your GAPS protocol
              for the day. You&apos;ll always be able to see each other&apos;s
              progress... and streaks!
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleLogin("jasmin")}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-purple-400 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-purple-300 transition hover:bg-purple-300 sm:flex-none"
              >
                Sign in as Jasmin
              </button>
              <button
                type="button"
                onClick={() => handleLogin("kelsey")}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-pink-400/50 transition hover:bg-pink-400 sm:flex-none"
              >
                Sign in as Kelsey
              </button>
            </div>
          </section>
        )}

        {currentUser && (
          <section className="space-y-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-rose-500">
                  GAPS daily checklist
                </h2>
                <p className="text-sm text-rose-800">
                  {prettyDate || "Today"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-rose-700">
                <span className="mr-1 font-semibold uppercase tracking-[0.15em] text-rose-400">
                  Day:
                </span>
                <button
                  type="button"
                  className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 font-medium text-rose-800 shadow-sm transition hover:bg-rose-100"
                  onClick={() => {
                    if (!effectiveDate) return;
                    const prev = shiftDate(effectiveDate, -1);
                    void fetchChecklist(prev);
                  }}
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  className={`rounded-full border px-3 py-1 font-medium shadow-sm transition ${effectiveDate >= todayKey
                    ? "cursor-not-allowed border-rose-200 bg-rose-50 text-rose-300"
                    : "border-rose-300 bg-white text-rose-800 hover:bg-rose-50"
                    }`}
                  onClick={() => {
                    if (!effectiveDate || effectiveDate >= todayKey) return;
                    const next = shiftDate(effectiveDate, 1);
                    void fetchChecklist(next);
                  }}
                >
                  Next →
                </button>
                <button
                  type="button"
                  className="rounded-full border border-emerald-400/80 bg-emerald-50 px-3 py-1 font-semibold text-emerald-700 shadow-sm shadow-emerald-200 transition hover:bg-emerald-100"
                  onClick={() => void fetchChecklist()}
                >
                  Today
                </button>
              </div>
            </div>

            {loadingChecklist && (
              <div className="rounded-xl border border-rose-100 bg-white/80 px-4 py-6 text-sm text-rose-800">
                Loading checklist...
              </div>
            )}

            {!loadingChecklist && checklist && (
              <div className="grid gap-6 lg:grid-cols-2">
                {currentUser.id === "kelsey" ? (
                  <>
                    <UserChecklist
                      userName="Kelsey"
                      sections={checklist.tasksKelsey}
                      userChecklist={checklist.checklists.kelsey ?? {}}
                      canEdit={true}
                      onValueChange={updateValue}
                      headerAccentClass="border-pink-400 text-pink-500"
                    />
                    <UserChecklist
                      userName="Jasmin"
                      sections={checklist.tasksJasmin}
                      userChecklist={checklist.checklists.jasmin ?? {}}
                      canEdit={false}
                      onValueChange={updateValue}
                      headerAccentClass="border-purple-200 text-purple-600"
                    />
                  </>
                ) : (
                  <>
                    <UserChecklist
                      userName="Jasmin"
                      sections={checklist.tasksJasmin}
                      userChecklist={checklist.checklists.jasmin ?? {}}
                      canEdit={true}
                      onValueChange={updateValue}
                      headerAccentClass="border-purple-200 text-purple-600"
                    />
                    <UserChecklist
                      userName="Kelsey"
                      sections={checklist.tasksKelsey}
                      userChecklist={checklist.checklists.kelsey ?? {}}
                      canEdit={false}
                      onValueChange={updateValue}
                      headerAccentClass="border-pink-400 text-pink-500"
                    />
                  </>
                )}
              </div>
            )}
          </section>
        )}

        {!currentUser && loadingUser && (
          <div className="mt-6 rounded-xl border border-rose-100 bg-white/80 px-4 py-4 text-sm text-rose-800">
            Setting things up with a warm GAPS hug...
          </div>
        )}
      </main>
    </div>
  );
}
