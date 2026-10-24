import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ForecastDayDto, ReviewStatsDto } from "@/lib/types";
import ForecastChart from "./ForecastChart";
import ReviewDashboard from "./ReviewDashboard";

const STATS: ReviewStatsDto = {
  dueNow: 4,
  dueToday: 6,
  reviewedToday: 2,
  newCardsLeftToday: 13,
  byState: { NEW: 9, LEARNING: 1, REVIEW: 5, RELEARNING: 0 },
  byType: { RECOGNITION: 5, WRITING: 5, TONE: 5 },
};
const FORECAST: ForecastDayDto[] = Array.from({ length: 30 }, (_, i) => ({
  date: `2026-01-${String(5 + i).padStart(2, "0")}`.replace(/-(3[2-9]|[4-9]\d)$/, "-31"),
  count: i === 0 ? 3 : i === 8 ? 1 : 0,
}));

describe("ReviewDashboard", () => {
  it("shows the headline counts, counts per state and type, and starts a review", () => {
    render(<ReviewDashboard stats={STATS} forecast={FORECAST} />);

    for (const [label, value] of [
      ["Due now", "4"],
      ["Due today", "6"],
      ["Reviewed today", "2"],
      ["New cards left today", "13"],
      ["Learning", "1"],
      ["Tones", "5"],
    ]) {
      expect(screen.getByText(label).nextElementSibling).toHaveTextContent(value);
    }
    expect(screen.getByRole("link", { name: "Start review" })).toHaveAttribute("href", "/review/session");
  });

  it("offers no session when nothing is due", () => {
    render(<ReviewDashboard stats={{ ...STATS, dueNow: 0 }} forecast={FORECAST} />);

    expect(screen.queryByRole("link", { name: "Start review" })).not.toBeInTheDocument();
    expect(screen.getByText("Nothing due right now.")).toBeInTheDocument();
  });
});

describe("ForecastChart", () => {
  it("draws a column per day with cards, a tooltip on hover and a table", () => {
    render(<ForecastChart days={FORECAST} />);

    expect(screen.getAllByTestId("forecast-bar")).toHaveLength(2);
    expect(screen.getByText("4 cards")).toBeInTheDocument();
    fireEvent.mouseEnter(screen.getAllByTestId("forecast-bar")[0].parentElement!);
    expect(screen.getByText("Mon 5 Jan: 3 cards")).toBeInTheDocument();

    const table = screen.getByRole("table", { name: "Cards due per day" });
    expect(within(table).getAllByRole("row")).toHaveLength(31);
  });
});
