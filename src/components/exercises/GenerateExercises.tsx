"use client";

import { useEffect, useState, type FormEvent } from "react";
import { generateExercises, getGenerationJob } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import type { GeneratedExerciseType, GenerationJobDto } from "@/lib/types";

export const POLL_INTERVAL_MS = 2000;
const TYPES: { type: GeneratedExerciseType; label: string }[] = [
  { type: "FILL_BLANK", label: "Fill in the blank" },
  { type: "WORD_ORDER", label: "Word order" },
  { type: "TRANSLATION", label: "Translation" },
];
const COUNTS = [3, 5, 10, 20];

/**
 * Writes sentence exercises for a lesson with the LLM (spec 07): choose types and how many of each, then the job
 * is polled until it is done. Sentences using characters the lesson does not know yet are discarded (rejected).
 */
export default function GenerateExercises({ lessonId }: { lessonId: number }) {
  const [types, setTypes] = useState<GeneratedExerciseType[]>(TYPES.map((t) => t.type));
  const [count, setCount] = useState(5);
  const [job, setJob] = useState<GenerationJobDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const running = job?.status === "RUNNING";

  useEffect(() => {
    if (!running || !job) return;
    const timer = setInterval(async () => {
      try {
        setJob(await getGenerationJob(job.id));
      } catch (err) {
        setError(errorMessage(err));
        setJob(null);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [running, job]);

  async function start(e: FormEvent) {
    e.preventDefault();
    setStarting(true);
    setError(null);
    try {
      setJob(await generateExercises(lessonId, { types, count }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setStarting(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Sentence exercises</h2>
      <p className="text-sm text-muted">
        Written by the LLM using only words from this and earlier lessons. Practice uses the stored ones.
      </p>
      <form onSubmit={start} className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {TYPES.map((t) => (
          <label key={t.type} className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={types.includes(t.type)}
              disabled={running}
              onChange={(e) =>
                setTypes((cur) => (e.target.checked ? [...cur, t.type] : cur.filter((x) => x !== t.type)))
              }
            />
            {t.label}
          </label>
        ))}
        <label className="flex items-center gap-1.5 text-sm">
          Each
          <select
            value={count}
            disabled={running}
            onChange={(e) => setCount(Number(e.target.value))}
            className="rounded border border-border bg-background px-2 py-1"
          >
            {COUNTS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={types.length === 0 || running || starting}
          className="rounded border border-border px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {running || starting ? "Generating…" : "Generate"}
        </button>
      </form>
      {job && <JobStatus job={job} />}
      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}
    </section>
  );
}

function JobStatus({ job }: { job: GenerationJobDto }) {
  const counts = `${job.created} created, ${job.rejected} rejected`;
  return (
    <p role="status" className="text-sm">
      {job.status === "RUNNING" && `Generating… ${counts} so far.`}
      {job.status === "DONE" && `Done: ${counts}${job.rejected > 0 ? " (used words the lesson does not have, or did not fit)" : ""}.`}
      {job.status === "FAILED" && `Failed after ${counts}: ${job.error ?? "unknown error"}`}
    </p>
  );
}
