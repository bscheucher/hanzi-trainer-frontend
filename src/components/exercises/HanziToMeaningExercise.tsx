"use client";

import { useEffect } from "react";
import type { AnswerResult, HanziToMeaningPrompt } from "@/lib/types";

interface Props {
  prompt: HanziToMeaningPrompt;
  /** Set once graded: options are locked and coloured. */
  result: AnswerResult | null;
  selected: string | null;
  onAnswer(selected: string): void;
}

/** Pick the meaning of a word (spec 07). Keys 1–4 choose an option. */
export default function HanziToMeaningExercise({ prompt, result, selected, onAnswer }: Props) {
  const locked = result !== null || selected !== null;

  useEffect(() => {
    if (locked) return;
    function onKey(e: KeyboardEvent) {
      const index = Number(e.key) - 1;
      if (Number.isInteger(index) && index >= 0 && index < prompt.options.length) onAnswer(prompt.options[index]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locked, prompt.options, onAnswer]);

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-muted">What does this mean?</p>
      <p lang="zh-CN" className="text-6xl">
        {prompt.hanzi}
      </p>
      <ul className="grid w-full max-w-xl gap-2 sm:grid-cols-2">
        {prompt.options.map((option, i) => {
          const isCorrect = result?.expected.correct === option;
          const isWrongPick = result !== null && option === selected && !isCorrect;
          const tone = isCorrect
            ? "border-emerald-600 bg-emerald-600/10"
            : isWrongPick
              ? "border-accent bg-accent/10"
              : "border-border hover:bg-border/40";
          return (
            <li key={option}>
              <button
                onClick={() => onAnswer(option)}
                disabled={locked}
                aria-pressed={option === selected}
                className={`flex w-full items-baseline gap-3 rounded border px-3 py-2 text-left disabled:cursor-default ${tone}`}
              >
                <span className="text-xs text-muted">{i + 1}</span>
                <span>{option}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
