"use client";

import { useEffect } from "react";
import type { AnswerResult, FillBlankPrompt } from "@/lib/types";

interface Props {
  prompt: FillBlankPrompt;
  result: AnswerResult | null;
  selected: string | null;
  onAnswer(selected: string): void;
}

const BLANK = "___";

/** Pick the word that fills the blank (spec 07). Keys 1–4 choose an option. */
export default function FillBlankExercise({ prompt, result, selected, onAnswer }: Props) {
  const locked = result !== null || selected !== null;
  const [before, after] = prompt.sentence.split(BLANK);
  const filled = result?.expected.correct ?? selected;

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
      <p className="text-sm text-muted">Fill in the blank</p>
      <div className="text-center">
        <p lang="zh-CN" className="text-4xl leading-relaxed" aria-label="Sentence">
          {before}
          <span className="mx-1 inline-block min-w-16 border-b-2 border-foreground px-1">{filled ?? " "}</span>
          {after}
        </p>
        <p className="mt-2 text-muted">{prompt.translationEn}</p>
      </div>
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
                <span lang="zh-CN" className="text-xl">
                  {option}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
