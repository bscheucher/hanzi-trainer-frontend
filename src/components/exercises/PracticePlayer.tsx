"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { answerExercise, createPracticeSession } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { toToneMarks } from "@/lib/pinyin";
import type { AnswerResult, ExerciseDto, ExerciseResponse, ExerciseType } from "@/lib/types";
import AnswerFeedback from "./AnswerFeedback";
import HanziToMeaningExercise from "./HanziToMeaningExercise";
import ToneExercise from "./ToneExercise";

/** The types the player can show so far (M5). */
const TYPE_CHOICES: { type: ExerciseType; label: string }[] = [
  { type: "HANZI_TO_MEANING", label: "Meaning" },
  { type: "TONE", label: "Tones" },
];
const SIZES = [5, 10, 15, 20, 30];
export const DEFAULT_SIZE = 15;

interface Answered {
  exercise: ExerciseDto;
  result: AnswerResult;
}

type Phase =
  | { name: "setup" }
  | { name: "running"; exercises: ExerciseDto[]; index: number; answered: Answered[] }
  | { name: "done"; answered: Answered[] };

/**
 * Free practice for one lesson (spec 07): choose types and size, then one exercise at a time with the grade, the
 * correct answer and feedback, then a summary. Ratings are not applied here; only /review updates FSRS.
 */
export default function PracticePlayer({ lessonId, lessonUrl }: { lessonId: number; lessonUrl: string }) {
  const [types, setTypes] = useState<ExerciseType[]>(TYPE_CHOICES.map((c) => c.type));
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [phase, setPhase] = useState<Phase>({ name: "setup" });
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  async function start(e?: FormEvent) {
    e?.preventDefault();
    setStarting(true);
    setError(null);
    try {
      const session = await createPracticeSession({ lessonId, types, size });
      if (session.exercises.length === 0) {
        setError("No exercises for these settings: the lesson has no confirmed words that fit.");
        setPhase({ name: "setup" });
      } else {
        setPhase({ name: "running", exercises: session.exercises, index: 0, answered: [] });
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setStarting(false);
    }
  }

  if (phase.name === "running") {
    const exercise = phase.exercises[phase.index];
    return (
      <ExerciseStep
        key={`${phase.index}-${exercise.id}`}
        exercise={exercise}
        position={phase.index + 1}
        total={phase.exercises.length}
        onNext={(result) => {
          const answered = [...phase.answered, { exercise, result }];
          setPhase(
            phase.index + 1 < phase.exercises.length
              ? { ...phase, index: phase.index + 1, answered }
              : { name: "done", answered },
          );
        }}
        onQuit={() => setPhase({ name: "done", answered: phase.answered })}
      />
    );
  }

  if (phase.name === "done") {
    return <Summary answered={phase.answered} lessonUrl={lessonUrl} onAgain={() => start()} starting={starting} />;
  }

  return (
    <form onSubmit={start} className="flex max-w-md flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">Exercises</legend>
        {TYPE_CHOICES.map((c) => (
          <label key={c.type} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={types.includes(c.type)}
              onChange={(e) =>
                setTypes((cur) => (e.target.checked ? [...cur, c.type] : cur.filter((t) => t !== c.type)))
              }
            />
            {c.label}
          </label>
        ))}
      </fieldset>
      <label className="flex items-center gap-2">
        <span className="font-semibold">Session size</span>
        <select
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          className="rounded border border-border bg-background px-2 py-1"
        >
          {SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <p className="text-sm text-muted">Each word is asked at most once per exercise type, so small lessons give shorter sessions.</p>
      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={types.length === 0 || starting}
        className="self-start rounded bg-foreground px-4 py-1.5 text-sm text-background disabled:opacity-50"
      >
        {starting ? "Preparing…" : "Start"}
      </button>
    </form>
  );
}

function ExerciseStep({
  exercise,
  position,
  total,
  onNext,
  onQuit,
}: {
  exercise: ExerciseDto;
  position: number;
  total: number;
  onNext(result: AnswerResult): void;
  onQuit(): void;
}) {
  const shownAt = useRef(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    shownAt.current = performance.now();
  }, []);

  const submit = useCallback(
    async (response: ExerciseResponse) => {
      if (exercise.id === null) return;
      setSubmitting(true);
      setError(null);
      try {
        const durationMs = Math.round(performance.now() - shownAt.current);
        setResult(await answerExercise(exercise.id, { response, durationMs }));
      } catch (err) {
        setError(errorMessage(err));
        setSelected(null);
      } finally {
        setSubmitting(false);
      }
    },
    [exercise.id],
  );

  const answerMeaning = useCallback(
    (option: string) => {
      setSelected(option);
      void submit({ selected: option });
    },
    [submit],
  );

  useEffect(() => {
    if (!result) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter") onNext(result!);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [result, onNext]);

  return (
    <section className="flex flex-col gap-6" aria-label={`Exercise ${position} of ${total}`}>
      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          {position} / {total}
        </span>
        <button onClick={onQuit} className="hover:text-foreground">
          End session
        </button>
      </div>
      <div className="h-1 w-full overflow-hidden rounded bg-border">
        <div className="h-full bg-foreground" style={{ width: `${((position - 1) / total) * 100}%` }} />
      </div>

      {exercise.type === "HANZI_TO_MEANING" ? (
        <HanziToMeaningExercise prompt={exercise.prompt} result={result} selected={selected} onAnswer={answerMeaning} />
      ) : (
        <ToneExercise prompt={exercise.prompt} result={result} submitting={submitting} onAnswer={(tones) => submit({ tones })} />
      )}

      {error && (
        <p role="alert" className="text-center text-sm text-accent">
          {error}
        </p>
      )}
      {result && (
        <div className="mx-auto flex w-full max-w-xl flex-col gap-3">
          <AnswerFeedback result={result} />
          <button
            onClick={() => onNext(result)}
            autoFocus
            className="self-end rounded bg-foreground px-4 py-1.5 text-sm text-background"
          >
            {position < total ? "Next" : "Finish"}
          </button>
        </div>
      )}
    </section>
  );
}

function Summary({
  answered,
  lessonUrl,
  onAgain,
  starting,
}: {
  answered: Answered[];
  lessonUrl: string;
  onAgain(): void;
  starting: boolean;
}) {
  const correct = answered.filter((a) => a.result.correct).length;
  const missed = answered.filter((a) => !a.result.correct);
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Session finished</h2>
      <p role="status">
        {correct} of {answered.length} correct
        {answered.length > 0 && ` (${Math.round((correct / answered.length) * 100)} %)`}
      </p>
      {missed.length > 0 && (
        <div>
          <h3 className="font-semibold">To look at again</h3>
          <ul className="mt-1 flex flex-col gap-1">
            {missed.map(({ exercise, result }, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-2">
                <span lang="zh-CN" className="text-lg">
                  {exercise.prompt.hanzi}
                </span>
                <span className="text-muted">{correctAnswer(exercise, result)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex gap-3">
        <button
          onClick={onAgain}
          disabled={starting}
          className="rounded bg-foreground px-4 py-1.5 text-sm text-background disabled:opacity-50"
        >
          Practice again
        </button>
        <Link href={lessonUrl} className="rounded border border-border px-4 py-1.5 text-sm">
          Back to lesson
        </Link>
      </div>
    </section>
  );
}

/** The right answer in a few words, for the summary: the meaning, or the tone-marked syllables. */
function correctAnswer(exercise: ExerciseDto, result: AnswerResult): string {
  if (exercise.type === "TONE") {
    const tones = result.expected.tones ?? [];
    return exercise.prompt.syllables.map((s, i) => toToneMarks(`${s}${tones[i]}`)).join(" ");
  }
  return result.expected.correct ?? "";
}
