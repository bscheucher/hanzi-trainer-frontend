import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RatingButtons from "./RatingButtons";

const PREVIEWS = { "1": "PT1M", "2": "PT5M30S", "3": "PT10M", "4": "P8D" } as const;

describe("RatingButtons", () => {
  it("shows each rating with its interval and marks the suggestion", () => {
    render(<RatingButtons suggested={3} previews={PREVIEWS} disabled={false} onRate={vi.fn()} />);

    expect(screen.getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual([
      "Again, <1m",
      "Hard, <6m",
      "Good (suggested), <10m",
      "Easy, 8d",
    ]);
    expect(screen.getByRole("button", { name: "Good (suggested), <10m" })).toHaveTextContent("Good<10m");
  });

  it("rates by click, by keys 1–4 and with Enter for the suggestion", () => {
    const onRate = vi.fn();
    render(<RatingButtons suggested={2} previews={PREVIEWS} disabled={false} onRate={onRate} />);

    fireEvent.click(screen.getByRole("button", { name: /Easy/ }));
    fireEvent.keyDown(window, { key: "1" });
    fireEvent.keyDown(window, { key: "Enter" });
    fireEvent.keyDown(window, { key: "7" });

    expect(onRate.mock.calls).toEqual([[4], [1], [2]]);
  });

  it("ignores keys while disabled", () => {
    const onRate = vi.fn();
    render(<RatingButtons suggested={2} previews={PREVIEWS} disabled onRate={onRate} />);

    fireEvent.keyDown(window, { key: "Enter" });

    expect(onRate).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Again/ })).toBeDisabled();
  });
});
