"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import ExerciseStep from "@/components/exercises/ExerciseStep";
import { ApiError, answerReview, getDueReviews, rateReview } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import type { AnswerResult, ExerciseResponse, Rating, ReviewItemDto } from "@/lib/types";
import RatingButtons from "./RatingButtons";

const CARD_LABELS: Record<ReviewItemDto["cardType"], string> = {
  RECOGNITION: "Recognition",
  WRITING: "Writing",
  TONE: "Tones",
};

type Phase =
  | { name: "loading" }
  | { name: "running"; queue: ReviewItemDto[] }
  | { name: "done" }
  | { name: "error"; message: string };

/** The next cards from the server: a running queue, done when none are due, or the error. */
async function fetchQueue(): Promise<Phase> {
  try {
    const due = await getDueReviews();
    return due.length === 0 ? { name: "done" } : { name: "running", queue: due };
  } catch (err) {
    return { name: "error", message: errorMessage(err) };
  }
}

/**
 * A review session across all lessons (spec 09): a local queue from GET /reviews/due, refetched when it is empty;
 * the session ends when the server returns no cards. Each answer is graded, then rated (suggestion pre-selected).
 */
export default function ReviewSession() {
  const [phase, setPhase] = useState<Phase>({ name: "loading" });
  const [reviewed, setReviewed] = useState(0);

  const load = useCallback(async () => setPhase(await fetchQueue()), []);

  useEffect(() => {
    let cancelled = false;
    void fetchQueue().then((next) => {
      if (!cancelled) setPhase(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const next = useCallback(
    (queue: ReviewItemDto[]) => {
      setReviewed((n) => n + 1);
      const rest = queue.slice(1);
      if (rest.length > 0) {
        setPhase({ name: "running", queue: rest });
      } else {
        setPhase({ name: "loading" });
        void load();
      }
    },
    [load],
  );

  if (phase.name === "loading") {
    return (
      <p role="status" className="text-muted">
        Loading cards…
      </p>
    );
  }
  if (phase.name === "error") {
    return (
      <div className="flex flex-col items-start gap-3">
        <p role="alert" className="text-accent">
          {phase.message}
        </p>
        <button onClick={() => void load()} className="rounded border border-border px-4 py-1.5 text-sm">
          Try again
        </button>
      </div>
    );
  }
  if (phase.name === "done") {
    return (
      <section className="flex flex-col items-start gap-4">
        <h2 className="text-xl font-semibold">{reviewed > 0 ? "Session finished" : "Nothing due"}</h2>
        <p role="status">
          {reviewed > 0
            ? `${reviewed} card${reviewed === 1 ? "" : "s"} reviewed. Cards still in learning come back in the next session.`
            : "No cards are due right now."}
        </p>
        <Link href="/review" className="rounded bg-foreground px-4 py-1.5 text-sm text-background">
          Back to the dashboard
        </Link>
      </section>
    );
  }

  const item = phase.queue[0];
  return (
    <ReviewStep
      key={`${item.cardId}-${reviewed}`}
      item={item}
      reviewed={reviewed}
      onRated={() => next(phase.queue)}
      onQuit={() => setPhase({ name: "done" })}
    />
  );
}

function ReviewStep({
  item,
  reviewed,
  onRated,
  onQuit,
}: {
  item: ReviewItemDto;
  reviewed: number;
  onRated(): void;
  onQuit(): void;
}) {
  const [rating, setRating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answer = useCallback(
    (response: ExerciseResponse, durationMs: number) =>
      answerReview(item.cardId, { response, durationMs, exerciseId: item.exercise.id ?? undefined }),
    [item],
  );

  const rate = useCallback(
    async (value: Rating) => {
      if (rating) return;
      setRating(true);
      setError(null);
      try {
        await rateReview(item.cardId, value);
        onRated();
      } catch (err) {
        if (err instanceof ApiError && err.problem.status === 409) {
          onRated(); // already rated, e.g. a double click
          return;
        }
        setError(errorMessage(err));
        setRating(false);
      }
    },
    [item.cardId, onRated, rating],
  );

  return (
    <ExerciseStep
      exercise={item.exercise}
      label={`Review: ${CARD_LABELS[item.cardType]}`}
      answer={answer}
      header={
        <div className="flex items-center justify-between text-sm text-muted">
          <span>
            {CARD_LABELS[item.cardType]} · {reviewed} reviewed
          </span>
          <button onClick={onQuit} className="hover:text-foreground">
            End session
          </button>
        </div>
      }
      actions={(result: AnswerResult) => (
        <>
          <RatingButtons
            suggested={result.suggestedRating}
            previews={item.previewIntervals}
            disabled={rating}
            onRate={rate}
          />
          <p className="text-center text-xs text-muted">Keys 1–4 rate; Enter accepts the suggestion.</p>
          {error && (
            <p role="alert" className="text-center text-sm text-accent">
              {error}
            </p>
          )}
        </>
      )}
    />
  );
}
