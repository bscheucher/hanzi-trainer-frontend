"use client";

import type { CedictReading } from "@/lib/types";
import { LOW_CONFIDENCE, rowProblem, type Row } from "./rows";

interface Props {
  row: Row;
  onChange: (patch: Partial<Row>) => void;
  /** Hanzi or pinyin field lost focus: normalise and re-check the reading. */
  onReadingBlur: () => void;
  onPickReading: (reading: CedictReading) => void;
  onDelete: () => void;
}

const field = "mt-0.5 w-full rounded border border-border bg-background px-2 py-1";

export default function CandidateRow({ row, onChange, onReadingBlur, onPickReading, onDelete }: Props) {
  const problem = rowProblem(row);
  const label = row.hanzi || "new word";

  return (
    <li
      aria-label={label}
      className={`rounded border p-3 ${row.include ? "border-border" : "border-dashed border-border opacity-60"}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={row.include}
            onChange={(e) => onChange({ include: e.target.checked })}
          />
          include
        </label>
        <Badges row={row} />
        <button onClick={onDelete} className="ml-auto text-sm text-muted hover:text-accent" aria-label={`Delete ${label}`}>
          Delete
        </button>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)]">
        <label className="text-xs text-muted">
          Hanzi
          <input
            lang="zh-CN"
            value={row.hanzi}
            onChange={(e) => onChange({ hanzi: e.target.value, cedictStatus: null })}
            onBlur={onReadingBlur}
            className={`${field} text-lg text-foreground`}
          />
        </label>
        <label className="text-xs text-muted">
          Pinyin
          <input
            value={row.pinyin}
            onChange={(e) => onChange({ pinyin: e.target.value, cedictStatus: null })}
            onBlur={onReadingBlur}
            placeholder="xuéxí or xue2xi2"
            className={`${field} text-foreground`}
          />
        </label>
        <label className="text-xs text-muted">
          Part of speech
          <input
            value={row.partOfSpeech}
            onChange={(e) => onChange({ partOfSpeech: e.target.value })}
            className={`${field} text-foreground`}
          />
        </label>
        <label className="text-xs text-muted sm:col-span-1">
          Meaning (EN)
          <input
            value={row.meaningEn}
            onChange={(e) => onChange({ meaningEn: e.target.value })}
            className={`${field} text-foreground`}
          />
        </label>
        <label className="text-xs text-muted sm:col-span-2">
          Meaning (DE)
          <input
            value={row.meaningDe}
            onChange={(e) => onChange({ meaningDe: e.target.value })}
            className={`${field} text-foreground`}
          />
        </label>
        <label className="text-xs text-muted sm:col-span-3">
          Example sentence
          <input
            lang="zh-CN"
            value={row.exampleSentence}
            onChange={(e) => onChange({ exampleSentence: e.target.value })}
            className={`${field} text-foreground`}
          />
        </label>
      </div>

      {row.cedictStatus === "PINYIN_MISMATCH" && row.cedictReadings.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">CC-CEDICT:</span>
          {row.cedictReadings.map((r) => (
            <button
              key={r.pinyinNumbered + r.definitions[0]}
              onClick={() => onPickReading(r)}
              title={r.definitions.slice(0, 3).join("; ")}
              className="rounded border border-amber-500 px-2 py-0.5 hover:bg-amber-500/10"
            >
              {r.pinyin}
            </button>
          ))}
          <label className="ml-2 flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={row.acceptMismatch}
              onChange={(e) => onChange({ acceptMismatch: e.target.checked })}
            />
            keep my pinyin
          </label>
        </div>
      )}

      {(row.serverError ?? (row.include && problem && row.cedictStatus !== null ? problem : null)) && (
        <p role="alert" className="mt-2 text-sm text-accent">
          {row.serverError ?? problem}
        </p>
      )}
    </li>
  );
}

function Badges({ row }: { row: Row }) {
  const badges: { text: string; className: string }[] = [];
  if (row.checking) badges.push({ text: "checking…", className: "border-border text-muted" });
  else if (row.cedictStatus === "MATCH")
    badges.push({ text: "✓ CEDICT", className: "border-emerald-600 text-emerald-700 dark:text-emerald-400" });
  else if (row.cedictStatus === "PINYIN_MISMATCH")
    badges.push({ text: "pinyin differs", className: "border-amber-500 text-amber-600 dark:text-amber-400" });
  else if (row.cedictStatus === "NOT_FOUND")
    badges.push({ text: "not in dictionary", className: "border-border text-muted" });
  if (row.confidence !== null && row.confidence < LOW_CONFIDENCE)
    badges.push({ text: "low confidence", className: "border-accent text-accent" });
  if (row.existingWordId !== null) badges.push({ text: "already known", className: "border-border text-muted" });
  if (row.alreadyInLesson) badges.push({ text: "already in lesson", className: "border-border text-muted" });
  return (
    <>
      {badges.map((b) => (
        <span key={b.text} className={`rounded-full border px-2 py-0.5 text-xs ${b.className}`}>
          {b.text}
        </span>
      ))}
    </>
  );
}
