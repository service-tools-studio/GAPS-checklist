"use client";

import type { ReflectionTimeSeries } from "@/lib/reflection-data";

const CHART_COLORS = [
  "#7c3aed", // violet - Quality of sleep
  "#db2777", // pink - Mood
  "#059669", // emerald - Feel physically
];

function formatDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ReflectionChart({
  data,
  user,
  accentClass,
}: {
  data: ReflectionTimeSeries;
  user: "Jasmin" | "Kelsey";
  accentClass: string;
}) {
  const series = user === "Jasmin" ? data.jasmin : data.kelsey;
  const metrics = data.metrics;
  const dates = data.dates;
  const width = 800;
  const height = 280;
  const padding = { top: 20, right: 20, bottom: 36, left: 44 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const yMin = 0;
  const yMax = 10;
  const hasData = dates.length > 0;

  const xScale = (i: number) =>
    padding.left + (i / Math.max(1, dates.length - 1)) * chartWidth;
  const yScale = (v: number) =>
    padding.top + chartHeight - ((v - yMin) / (yMax - yMin)) * chartHeight;

  const lines = metrics.map((metric, idx) => {
    const values = series[metric.id] ?? [];
    const points = values
      .map((v, i) => {
        if (typeof v !== "number" || Number.isNaN(v)) return null;
        return `${xScale(i)},${yScale(v)}`;
      })
      .filter((p): p is string => p != null);
    if (points.length < 2) return null;
    return {
      id: metric.id,
      label: metric.label,
      color: CHART_COLORS[idx % CHART_COLORS.length],
      d: `M ${points.join(" L ")}`,
    };
  }).filter((l): l is NonNullable<typeof l> => l != null);

  return (
    <div className="rounded-2xl border border-rose-100 bg-white/80 p-4 shadow-sm">
      <h3 className={`mb-3 text-sm font-semibold uppercase tracking-wider ${accentClass}`}>
        Reflection over time — {user}
      </h3>
      {!hasData ? (
        <p className="py-8 text-center text-sm text-rose-500">
          No reflection data yet. Log mood &amp; physical feeling on the daily checklist.
        </p>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full max-w-full"
            style={{ height: "auto", minHeight: 280 }}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {lines.map((line) => (
                <linearGradient
                  key={line.id}
                  id={`grad-${user}-${line.id}`}
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor={line.color} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={line.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            {/* Y axis grid & labels */}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((v) => (
              <g key={v}>
                <line
                  x1={padding.left}
                  y1={yScale(v)}
                  x2={width - padding.right}
                  y2={yScale(v)}
                  stroke="currentColor"
                  strokeOpacity={0.12}
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 8}
                  y={yScale(v)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-rose-500 text-[10px]"
                >
                  {v}
                </text>
              </g>
            ))}
            {/* X axis labels (every nth date to avoid crowding) */}
            {dates.map((key, i) => {
              const step = Math.max(1, Math.floor(dates.length / 8));
              if (i % step !== 0 && i !== dates.length - 1) return null;
              return (
                <text
                  key={key}
                  x={xScale(i)}
                  y={height - 8}
                  textAnchor="middle"
                  className="fill-rose-500 text-[10px]"
                >
                  {formatDate(key)}
                </text>
              );
            })}
            {/* Lines with area fill */}
            {lines.map((line) => (
              <g key={line.id}>
                <path
                  d={`${line.d} L ${xScale(dates.length - 1)},${padding.top + chartHeight} L ${padding.left},${padding.top + chartHeight} Z`}
                  fill={`url(#grad-${user}-${line.id})`}
                />
                <path
                  d={line.d}
                  fill="none"
                  stroke={line.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            ))}
          </svg>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-rose-100 pt-3">
            {lines.map((line) => (
              <span
                key={line.id}
                className="flex items-center gap-1.5 text-xs text-rose-700"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: line.color }}
                />
                {line.label}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
