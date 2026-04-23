"use client";

import type { Issue } from "@/types/issue";

interface BurndownChartProps {
  startDate: string;
  endDate: string;
  issues: Issue[];
  today?: Date;
}

function dayDiff(a: Date, b: Date) {
  const ms = 24 * 60 * 60 * 1000;
  return Math.max(
    0,
    Math.round(
      (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
        Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) /
        ms
    )
  );
}

function formatShort(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function BurndownChart({
  startDate,
  endDate,
  issues,
  today = new Date(),
}: BurndownChartProps) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.max(1, dayDiff(start, end));
  const totalIssues = issues.length;

  if (totalIssues === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-sm text-gray-500">
        스프린트에 이슈가 없어 번다운 차트를 표시할 수 없습니다.
      </div>
    );
  }

  const width = 640;
  const height = 240;
  // padding.left: fontSize 18에서 y-tick 레이블 3자리("100" 등) 수용 여유.
  const padding = { top: 16, right: 16, bottom: 32, left: 48 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const xAt = (day: number) =>
    padding.left + (day / totalDays) * chartW;
  const yAt = (remaining: number) =>
    padding.top + (1 - remaining / totalIssues) * chartH;

  // Ideal line: totalIssues → 0 over totalDays
  const idealPath = `M ${xAt(0)} ${yAt(totalIssues)} L ${xAt(totalDays)} ${yAt(0)}`;

  // Actual line: for each day from start to min(today, end),
  // count issues not DONE by end-of-day
  const daysElapsed = Math.min(totalDays, dayDiff(start, today));
  const doneDates = issues
    .filter((i) => i.status === "DONE")
    .map((i) => new Date(i.completedAt ?? i.updatedAt));

  const actualPoints: { day: number; remaining: number }[] = [];
  for (let d = 0; d <= daysElapsed; d++) {
    const boundary = new Date(start);
    boundary.setDate(boundary.getDate() + d);
    boundary.setHours(23, 59, 59, 999);
    const doneByThen = doneDates.filter((dd) => dd <= boundary).length;
    actualPoints.push({ day: d, remaining: totalIssues - doneByThen });
  }

  const actualPath = actualPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(p.day)} ${yAt(p.remaining)}`)
    .join(" ");

  const yTicks = Array.from({ length: totalIssues + 1 }, (_, i) => i).filter(
    (n, _, arr) => arr.length <= 6 || n % Math.ceil(arr.length / 5) === 0
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">번다운</h3>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto max-w-[640px] mx-auto"
        role="img"
        aria-label="스프린트 번다운 차트"
      >
        {/* Grid */}
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={yAt(t)}
              y2={yAt(t)}
              stroke="#e5e7eb"
              strokeDasharray="2 2"
            />
            <text
              x={padding.left - 8}
              y={yAt(t) + 6}
              textAnchor="end"
              className="fill-gray-500"
              style={{ fontSize: 18 }}
            >
              {t}
            </text>
          </g>
        ))}

        {/* X axis labels */}
        <text
          x={xAt(0)}
          y={height - 10}
          textAnchor="start"
          className="fill-gray-500"
          style={{ fontSize: 18 }}
        >
          {formatShort(start)}
        </text>
        <text
          x={xAt(totalDays)}
          y={height - 10}
          textAnchor="end"
          className="fill-gray-500"
          style={{ fontSize: 18 }}
        >
          {formatShort(end)}
        </text>

        {/* Ideal */}
        <path d={idealPath} stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="4 3" fill="none" />

        {/* Actual */}
        <path d={actualPath} stroke="#2563eb" strokeWidth={2} fill="none" />

        {/* Today marker */}
        {daysElapsed > 0 && daysElapsed < totalDays && (
          <line
            x1={xAt(daysElapsed)}
            x2={xAt(daysElapsed)}
            y1={padding.top}
            y2={height - padding.bottom}
            stroke="#f97316"
            strokeDasharray="3 3"
            strokeWidth={1}
          />
        )}
      </svg>
      <div className="flex gap-4 text-xs text-gray-600 mt-2">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-gray-400" /> 이상치
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-blue-600" /> 실제
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-orange-500" /> 오늘
        </span>
      </div>
    </div>
  );
}
