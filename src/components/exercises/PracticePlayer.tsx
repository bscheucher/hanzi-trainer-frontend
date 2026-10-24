"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { answerExercise, createPracticeSession } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { toToneMarks } from "@/lib/pinyin";
import type { AnswerResult, ExerciseDto, ExerciseResponse, ExerciseType } from "@/lib/types";
import ExerciseStep from "./ExerciseStep";

const TYPE_CHOICES: { type: ExerciseType; label: string }[] = [
  { type: "HANZI_TO_MEANING", label: "Meaning" },
  { type: "TONE", label: "Tones" },
  { type: "MEANING_TO_HANZI", label: "Writing" },
  { type: "FILL_BLANK", label: "Fill in the blank" },
  { type: "WORD_ORDER", label: "Word order" },
  { type: "TRANSLATION", label: "Translation" },
];
/** Only stored exercises of these types are used; they are generated on the lesson page. */
const GENERATED: ExerciseType[] = ["FILL_BLANK", "WORD_ORDER", "TRANSLATION"];
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
        setError(
          "No exercises for these settings: the lesson has no confirmed words that fit." +
            (types.some((t) => GENERATED.includes(t)) ? " Sentence exercises are generated on the lesson page." : ""),
        );
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
      <PracticeStep
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

/** A practice step: progress, then the exercise; Next (or Enter) after the answer. */
function PracticeStep({
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
  const answer = useCallback(
    (response: ExerciseResponse, durationMs: number) => {
      if (exercise.id === null) return Promise.reject(new Error("Practice exercises are stored"));
      return answerExercise(exercise.id, { response, durationMs });
    },
    [exercise.id],
  );

  return (
    <ExerciseStep
      exercise={exercise}
      label={`Exercise ${position} of ${total}`}
      answer={answer}
      header={
        <>
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
        </>
      }
      actions={(result) => <NextButton label={position < total ? "Next" : "Finish"} onNext={() => onNext(result)} />}
    />
  );
}

function NextButton({ label, onNext }: { label: string; onNext(): void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter") onNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNext]);

  return (
    <button onClick={onNext} autoFocus className="self-end rounded bg-foreground px-4 py-1.5 text-sm text-background">
      {label}
    </button>
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
                <span lang={exercise.type === "TRANSLATION" ? exercise.prompt.sourceLang : "zh-CN"} className="text-lg">
                  {promptLabel(exercise)}
                </span>
                <span lang={chineseAnswer(exercise) ? "zh-CN" : undefined} className="text-muted">
                  {correctAnswer(exercise, result)}
                </span>
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

/** What was asked, for the summary: the word, or the sentence (Chinese, or the source of a translation). */
function promptLabel(exercise: ExerciseDto): string {
  switch (exercise.type) {
    case "FILL_BLANK":
      return exercise.prompt.sentence;
    case "WORD_ORDER":
      return exercise.prompt.tokens.join(" ");
    case "TRANSLATION":
      return exercise.prompt.source;
    default:
      return exercise.prompt.hanzi;
  }
}

const chineseAnswer = (exercise: ExerciseDto) =>
  exercise.type === "FILL_BLANK" || exercise.type === "WORD_ORDER" || exercise.type === "TRANSLATION";

/**
 * The right answer in a few words, for the summary: the meaning, the tone-marked syllables, pinyin and meaning,
 * or the Chinese sentence.
 */
function correctAnswer(exercise: ExerciseDto, result: AnswerResult): string {
  switch (exercise.type) {
    case "MEANING_TO_HANZI":
      return `${exercise.prompt.pinyin}, ${exercise.prompt.meaningEn}`;
    case "TONE": {
      const tones = result.expected.tones ?? [];
      return exercise.prompt.syllables.map((s, i) => toToneMarks(`${s}${tones[i]}`)).join(" ");
    }
    case "FILL_BLANK":
      return result.expected.fullSentence ?? "";
    case "WORD_ORDER":
      return result.expected.accepted?.[0]?.join("") ?? "";
    case "TRANSLATION":
      return result.expected.reference ?? "";
    default:
      return result.expected.correct ?? "";
  }
}
