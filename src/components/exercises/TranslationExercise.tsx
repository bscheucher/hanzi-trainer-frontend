"use client";

import { useState, type FormEvent } from "react";
import HanziPad from "@/components/handwriting/HanziPad";
import type { AnswerResult, TranslationPrompt } from "@/lib/types";

interface Props {
  prompt: TranslationPrompt;
  result: AnswerResult | null;
  submitting: boolean;
  onAnswer(text: string): void;
}

const LANGUAGE = { de: "German", en: "English" } as const;

/** Translate a German or English sentence into Chinese, typed or drawn (spec 07, spec 08); graded by the LLM. */
export default function TranslationExercise({ prompt, result, submitting, onAnswer }: Props) {
  const [text, setText] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (text.trim()) onAnswer(text.trim());
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <p className="text-sm text-muted">Translate from {LANGUAGE[prompt.sourceLang]} into Chinese</p>
      <p lang={prompt.sourceLang} className="text-center text-2xl font-semibold">
        {prompt.source}
      </p>
      {prompt.hintWords.length > 0 && (
        <p className="text-sm text-muted">
          Use:{" "}
          <span lang="zh-CN" className="text-lg text-foreground">
            {prompt.hintWords.join("、")}
          </span>
        </p>
      )}
      {result ? (
        <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1">
          <dt className="text-sm text-muted">You wrote</dt>
          <dd lang="zh-CN" className="text-2xl">
            {text.trim()}
          </dd>
          {result.expected.corrected && result.expected.corrected !== text.trim() && (
            <>
              <dt className="text-sm text-muted">Corrected</dt>
              <dd lang="zh-CN" className="text-2xl">
                {result.expected.corrected}
              </dd>
            </>
          )}
          <dt className="text-sm text-muted">Reference</dt>
          <dd lang="zh-CN" className="text-2xl">
            {result.expected.reference}
          </dd>
        </dl>
      ) : (
        <form onSubmit={submit} className="flex w-full flex-col items-center gap-3">
          <HanziPad value={text} onChange={setText} label="Your translation" />
          <button
            type="submit"
            disabled={!text.trim() || submitting}
            className="rounded bg-foreground px-4 py-1.5 text-sm text-background disabled:opacity-50"
          >
            {submitting ? "Checking…" : "Check"}
          </button>
        </form>
      )}
    </div>
  );
}
