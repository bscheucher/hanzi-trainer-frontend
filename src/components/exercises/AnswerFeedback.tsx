import type { AnswerResult } from "@/lib/types";

/** Correct / wrong banner with the grader's feedback after an answer. */
export default function AnswerFeedback({ result }: { result: AnswerResult }) {
  const partial = !result.correct && result.score > 0;
  return (
    <div
      role="status"
      className={`rounded border p-3 text-sm ${result.correct ? "border-emerald-600" : "border-accent"}`}
    >
      <p className="font-semibold">
        {result.correct ? "Correct" : partial ? `Partly right (${Math.round(result.score * 100)} %)` : "Not quite"}
      </p>
      {result.feedback && <p className="mt-1">{result.feedback}</p>}
    </div>
  );
}
