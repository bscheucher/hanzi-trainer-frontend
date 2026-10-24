"use client";

import { useState } from "react";
import type { ForecastDayDto } from "@/lib/types";

const HEIGHT = 140;

function dayLabel(date: string, style: "short" | "long") {
  const d = new Date(`${date}T00:00:00`);
  return style === "short"
    ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/**
 * Cards falling due per day, today first (spec 09): one column per day, a tooltip per column on hover or focus,
 * and the same numbers as a table for screen readers. Overdue cards count on today.
 */
export default function ForecastChart({ days }: { days: ForecastDayDto[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((sum, d) => sum + d.count, 0);

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex items-baseline justify-between">
        <span className="font-semibold">Due in the next {days.length} days</span>
        <span className="text-sm text-muted">
          {total} card{total === 1 ? "" : "s"}
        </span>
      </figcaption>
      <div aria-hidden className="relative" onMouseLeave={() => setActive(null)}>
        <span className="absolute -top-1 left-0 text-xs text-muted">{max}</span>
        <div className="flex items-end gap-[2px] border-b border-border pt-4" style={{ height: HEIGHT }}>
          {days.map((day, i) => (
            <div
              key={day.date}
              tabIndex={0}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="relative flex h-full flex-1 items-end justify-center outline-none focus-visible:bg-border/50"
            >
              {day.count > 0 && (
                <div
                  data-testid="forecast-bar"
                  className={`w-full max-w-6 rounded-t ${active === i ? "bg-foreground" : "bg-foreground/70"}`}
                  style={{ height: `${(day.count / max) * 100}%` }}
                />
              )}
              {active === i && (
                <div className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded border border-border bg-background px-2 py-1 text-xs shadow">
                  {dayLabel(day.date, "long")}: {day.count} card{day.count === 1 ? "" : "s"}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-1 flex text-xs text-muted">
          {days.map((day, i) => (
            <span key={day.date} className="flex-1 text-center">
              {i === 0 ? "Today" : i % 7 === 0 ? dayLabel(day.date, "short") : ""}
            </span>
          ))}
        </div>
      </div>
      <table className="sr-only">
        <caption>Cards due per day</caption>
        <thead>
          <tr>
            <th>Day</th>
            <th>Cards</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.date}>
              <td>{dayLabel(day.date, "long")}</td>
              <td>{day.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
