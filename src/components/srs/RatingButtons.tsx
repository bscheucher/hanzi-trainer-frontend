"use client";

import { useEffect } from "react";
import { formatInterval } from "@/lib/intervals";
import type { Rating, ReviewItemDto } from "@/lib/types";

export const RATINGS: { rating: Rating; label: string }[] = [
  { rating: 1, label: "Again" },
  { rating: 2, label: "Hard" },
  { rating: 3, label: "Good" },
  { rating: 4, label: "Easy" },
];

/**
 * The four FSRS ratings with the interval each would schedule (spec 09). The suggested one is pre-selected;
 * keys 1–4 rate, Enter accepts the suggestion.
 */
export default function RatingButtons({
  suggested,
  previews,
  disabled,
  onRate,
}: {
  suggested: Rating;
  previews: ReviewItemDto["previewIntervals"];
  disabled: boolean;
  onRate(rating: Rating): void;
}) {
  useEffect(() => {
    if (disabled) return;
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Enter") {
        e.preventDefault();
        onRate(suggested);
      } else if (["1", "2", "3", "4"].includes(e.key)) {
        onRate(Number(e.key) as Rating);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [disabled, onRate, suggested]);

  return (
    <div role="group" aria-label="Rate this card" className="grid grid-cols-4 gap-2">
      {RATINGS.map(({ rating, label }) => {
        const isSuggested = rating === suggested;
        const interval = formatInterval(previews[String(rating) as keyof typeof previews]);
        return (
          <button
            key={rating}
            onClick={() => onRate(rating)}
            disabled={disabled}
            aria-label={`${label}${isSuggested ? " (suggested)" : ""}, ${interval}`}
            aria-keyshortcuts={String(rating)}
            className={`flex flex-col items-center rounded border px-2 py-1.5 text-sm disabled:opacity-50 ${
              isSuggested ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"
            }`}
          >
            <span className="font-medium">{label}</span>
            <span className={isSuggested ? "text-xs opacity-80" : "text-xs text-muted"}>{interval}</span>
          </button>
        );
      })}
    </div>
  );
}
