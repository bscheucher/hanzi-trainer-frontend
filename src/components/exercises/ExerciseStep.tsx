"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { errorMessage } from "@/lib/errors";
import type { AnswerResult, ExerciseDto, ExerciseResponse } from "@/lib/types";
import AnswerFeedback from "./AnswerFeedback";
import FillBlankExercise from "./FillBlankExercise";
import HanziToMeaningExercise from "./HanziToMeaningExercise";
import MeaningToHanziExercise from "./MeaningToHanziExercise";
import ToneExercise from "./ToneExercise";
import TranslationExercise from "./TranslationExercise";
import WordOrderExercise from "./WordOrderExercise";

/**
 * One exercise: the player for its type, timed from when it is shown, then the grade and feedback, then whatever
 * comes next (`actions`): a Next button in free practice, rating buttons in reviews. Shared by practice (spec 07)
 * and reviews (spec 09).
 */
export default function ExerciseStep({
  exercise,
  label,
  header,
  answer,
  actions,
}: {
  exercise: ExerciseDto;
  /** Accessible name of the step, e.g. "Exercise 2 of 10". */
  label: string;
  header: ReactNode;
  /** Grades the response; nothing is saved by the step itself. */
  answer(response: ExerciseResponse, durationMs: number): Promise<AnswerResult>;
  actions(result: AnswerResult): ReactNode;
}) {
  const shownAt = useRef(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    shownAt.current = performance.now();
  }, []);

  /** @param measuredMs set by exercises that time themselves, e.g. writing excludes the final animation */
  const submit = useCallback(
    async (response: ExerciseResponse, measuredMs?: number) => {
      setSubmitting(true);
      setError(null);
      try {
        const durationMs = measuredMs ?? Math.round(performance.now() - shownAt.current);
        setResult(await answer(response, durationMs));
      } catch (err) {
        setError(errorMessage(err));
        setSelected(null);
      } finally {
        setSubmitting(false);
      }
    },
    [answer],
  );

  const answerOption = useCallback(
    (option: string) => {
      setSelected(option);
      void submit({ selected: option });
    },
    [submit],
  );

  return (
    <section className="flex flex-col gap-6" aria-label={label}>
      {header}

      {exercise.type === "HANZI_TO_MEANING" ? (
        <HanziToMeaningExercise prompt={exercise.prompt} result={result} selected={selected} onAnswer={answerOption} />
      ) : exercise.type === "TONE" ? (
        <ToneExercise prompt={exercise.prompt} result={result} submitting={submitting} onAnswer={(tones) => submit({ tones })} />
      ) : exercise.type === "MEANING_TO_HANZI" ? (
        <MeaningToHanziExercise prompt={exercise.prompt} result={result} submitting={submitting} onAnswer={submit} />
      ) : exercise.type === "FILL_BLANK" ? (
        <FillBlankExercise prompt={exercise.prompt} result={result} selected={selected} onAnswer={answerOption} />
      ) : exercise.type === "WORD_ORDER" ? (
        <WordOrderExercise prompt={exercise.prompt} result={result} submitting={submitting} onAnswer={(order) => submit({ order })} />
      ) : (
        <TranslationExercise prompt={exercise.prompt} result={result} submitting={submitting} onAnswer={(text) => submit({ text })} />
      )}

      {error && (
        <p role="alert" className="text-center text-sm text-accent">
          {error}
        </p>
      )}
      {result && (
        <div className="mx-auto flex w-full max-w-xl flex-col gap-3">
          <AnswerFeedback result={result} />
          {actions(result)}
        </div>
      )}
    </section>
  );
}
