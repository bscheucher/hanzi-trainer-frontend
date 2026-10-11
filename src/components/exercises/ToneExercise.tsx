"use client";

import { useState } from "react";
import { toToneMarks } from "@/lib/pinyin";
import type { AnswerResult, TonePrompt } from "@/lib/types";

interface Props {
  prompt: TonePrompt;
  result: AnswerResult | null;
  submitting: boolean;
  onAnswer(tones: number[]): void;
}

const TONES = [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "neutral" },
];

/** Pick the citation tone of every syllable (spec 07); neutral = 5. No audio in v1. */
export default function ToneExercise({ prompt, result, submitting, onAnswer }: Props) {
  const [tones, setTones] = useState<(number | null)[]>(() => prompt.syllables.map(() => null));
  const locked = result !== null || submitting;
  const complete = tones.every((t) => t !== null);
  const expected = result?.expected.tones;

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-muted">Which tones?</p>
      <p lang="zh-CN" className="text-6xl">
        {prompt.hanzi}
      </p>
      <ol className="flex flex-col gap-3">
        {prompt.syllables.map((syllable, i) => {
          const chosen = tones[i];
          const right = expected ? expected[i] === chosen : null;
          return (
            <li key={i} className="flex flex-wrap items-center gap-2" aria-label={`Syllable ${syllable}`}>
              <span className="w-20 text-right text-xl">
                {chosen ? toToneMarks(`${syllable}${chosen}`) : syllable}
              </span>
              <span role="group" aria-label={`Tone of ${syllable}`} className="flex gap-1">
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTones((cur) => cur.map((v, j) => (j === i ? t.value : v)))}
                    disabled={locked}
                    aria-pressed={chosen === t.value}
                    className={`min-w-10 rounded border px-2 py-1 text-sm disabled:cursor-default ${
                      chosen === t.value ? "border-foreground bg-foreground text-background" : "border-border"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </span>
              {expected && (
                <span className={right ? "text-emerald-600" : "text-accent"}>
                  {right ? "✓" : `✗ ${toToneMarks(`${syllable}${expected[i]}`)}${expected[i] === 5 ? " (neutral)" : ""}`}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {!result && (
        <button
          onClick={() => onAnswer(tones as number[])}
          disabled={!complete || locked}
          className="rounded bg-foreground px-4 py-1.5 text-sm text-background disabled:opacity-50"
        >
          Check
        </button>
      )}
    </div>
  );
}
