"use client";

import { useState } from "react";
import type { AnswerResult, WordOrderPrompt } from "@/lib/types";

interface Props {
  prompt: WordOrderPrompt;
  result: AnswerResult | null;
  submitting: boolean;
  onAnswer(order: string[]): void;
}

const token = "rounded border px-3 py-1.5 text-2xl disabled:cursor-default";

/**
 * Put the words in order (spec 07): tap a word to place it, tap a placed word to take it back. Positions are
 * tracked by index, so a token that occurs twice is still two separate buttons.
 */
export default function WordOrderExercise({ prompt, result, submitting, onAnswer }: Props) {
  const [order, setOrder] = useState<number[]>([]);
  const locked = result !== null || submitting;
  const complete = order.length === prompt.tokens.length;
  const outline = result ? (result.correct ? "border-emerald-600" : "border-accent") : "border-border";

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-muted">Put the words in order</p>
      <p className="text-xl">{prompt.translationEn}</p>
      <ol
        aria-label="Your sentence"
        className={`flex min-h-16 w-full max-w-xl flex-wrap items-center justify-center gap-2 rounded border-2 border-dashed p-2 ${outline}`}
      >
        {order.map((index, position) => (
          <li key={index}>
            <button
              onClick={() => setOrder((o) => o.filter((_, p) => p !== position))}
              disabled={locked}
              lang="zh-CN"
              className={`${token} border-foreground`}
            >
              {prompt.tokens[index]}
            </button>
          </li>
        ))}
      </ol>
      <ul aria-label="Words" className="flex min-h-12 flex-wrap justify-center gap-2">
        {prompt.tokens.map((t, index) =>
          order.includes(index) ? null : (
            <li key={index}>
              <button
                onClick={() => setOrder((o) => [...o, index])}
                disabled={locked}
                lang="zh-CN"
                className={`${token} border-border hover:bg-border/40`}
              >
                {t}
              </button>
            </li>
          ),
        )}
      </ul>
      {!result && (
        <button
          onClick={() => onAnswer(order.map((i) => prompt.tokens[i]))}
          disabled={!complete || submitting}
          className="rounded bg-foreground px-4 py-1.5 text-sm text-background disabled:opacity-50"
        >
          Check
        </button>
      )}
    </div>
  );
}
