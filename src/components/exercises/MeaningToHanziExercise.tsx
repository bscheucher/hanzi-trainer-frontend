"use client";

import { useState } from "react";
import HanziQuiz, { type HanziQuizResult } from "@/components/handwriting/HanziQuiz";
import type { AnswerResult, MeaningToHanziPrompt, MeaningToHanziResponse } from "@/lib/types";

interface Props {
  prompt: MeaningToHanziPrompt;
  result: AnswerResult | null;
  submitting: boolean;
  onAnswer(response: MeaningToHanziResponse, durationMs: number): void;
}

/** Write a word from its meaning and pinyin (spec 07, spec 08); stroke mistakes are graded by the backend. */
export default function MeaningToHanziExercise({ prompt, result, submitting, onAnswer }: Props) {
  // Kept so a failed request can be sent again without writing the word a second time.
  const [written, setWritten] = useState<{ response: MeaningToHanziResponse; durationMs: number } | null>(null);

  function complete({ durationMs, ...quiz }: HanziQuizResult) {
    const response = { hanzi: prompt.hanzi, ...quiz };
    setWritten({ response, durationMs });
    onAnswer(response, durationMs);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-muted">
        Write the word ({prompt.characterCount} {prompt.characterCount === 1 ? "character" : "characters"})
      </p>
      <div className="text-center">
        <p className="text-2xl font-semibold">{prompt.meaningEn}</p>
        {prompt.meaningDe && <p className="text-muted">{prompt.meaningDe}</p>}
        <p className="mt-1 text-xl">{prompt.pinyin}</p>
      </div>
      {written ? (
        <>
          <p lang="zh-CN" className="text-6xl" aria-label="Answer">
            {result?.expected.hanzi ?? prompt.hanzi}
          </p>
          {!result && !submitting && (
            <button
              onClick={() => onAnswer(written.response, written.durationMs)}
              className="rounded bg-foreground px-4 py-1.5 text-sm text-background"
            >
              Send again
            </button>
          )}
        </>
      ) : (
        <HanziQuiz hanzi={prompt.hanzi} onComplete={complete} />
      )}
    </div>
  );
}
