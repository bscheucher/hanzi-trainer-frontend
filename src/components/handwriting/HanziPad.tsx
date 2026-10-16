"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { recognise, type Point, type Stroke } from "./hanziLookup";
import TianZiGe from "./TianZiGe";

/** Recognition runs this long after the last stroke (spec 08). */
export const RECOGNISE_DELAY_MS = 300;
const CANDIDATES = 8;
const BOX = "min(90vw, 320px)";

interface Props {
  value: string;
  onChange(value: string): void;
  /** Accessible name of the text field. */
  label?: string;
}

/**
 * Free Chinese input (spec 08): a text field for keyboard and IME, and a pad underneath for drawing one character at
 * a time. After each stroke HanziLookup suggests candidates; picking one appends it and clears the pad.
 */
export default function HanziPad({ value, onChange, label = "Chinese text" }: Props) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [current, setCurrent] = useState<Stroke | null>(null);
  /** Candidates for exactly these strokes; outdated ones are not shown. */
  const [recognised, setRecognised] = useState<{ strokes: Stroke[]; candidates: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** The stroke being drawn; pointer events can come faster than renders. */
  const drawing = useRef<Stroke | null>(null);

  const candidates = recognised?.strokes === strokes ? recognised.candidates : [];

  useEffect(() => {
    if (strokes.length === 0) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      recognise(strokes, CANDIDATES)
        .then((found) => {
          if (!cancelled) {
            setRecognised({ strokes, candidates: found });
            setError(null);
          }
        })
        .catch(() => !cancelled && setError("Handwriting recognition could not be loaded. Type instead."));
    }, RECOGNISE_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [strokes]);

  /** Pointer position in the pad's 0–100 coordinates. */
  function point(e: PointerEvent<SVGSVGElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - rect.left) / (rect.width || 1)) * 100, ((e.clientY - rect.top) / (rect.height || 1)) * 100];
  }

  function down(e: PointerEvent<SVGSVGElement>) {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drawing.current = [point(e)];
    setCurrent(drawing.current);
  }

  function move(e: PointerEvent<SVGSVGElement>) {
    if (!drawing.current) return;
    drawing.current = [...drawing.current, point(e)];
    setCurrent(drawing.current);
  }

  function up() {
    const stroke = drawing.current;
    drawing.current = null;
    setCurrent(null);
    if (stroke) setStrokes((s) => [...s, stroke]);
  }

  function pick(character: string) {
    onChange(value + character);
    setStrokes([]);
  }

  const shown = current ? [...strokes, current] : strokes;
  return (
    <div className="flex flex-col items-center gap-3">
      <input
        lang="zh-CN"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full max-w-md rounded border border-border bg-background px-3 py-2 text-2xl"
      />
      <ul className="flex min-h-12 flex-wrap justify-center gap-1" aria-label="Candidates">
        {candidates.map((c) => (
          <li key={c}>
            <button
              type="button"
              onClick={() => pick(c)}
              lang="zh-CN"
              className="size-12 rounded border border-border text-3xl hover:bg-border/40"
            >
              {c}
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}
      <div className="relative" style={{ width: BOX, height: BOX }}>
        <TianZiGe />
        <svg
          viewBox="0 0 100 100"
          role="img"
          aria-label="Drawing pad"
          className="absolute inset-0 h-full w-full cursor-crosshair"
          style={{ touchAction: "none" }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        >
          {shown.map((stroke, i) => (
            <polyline
              key={i}
              points={stroke.map(([x, y]) => `${x},${y}`).join(" ")}
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
      </div>
      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setStrokes((s) => s.slice(0, -1))}
          disabled={strokes.length === 0}
          className="rounded border border-border px-3 py-1 disabled:opacity-50"
        >
          Undo stroke
        </button>
        <button
          type="button"
          onClick={() => setStrokes([])}
          disabled={strokes.length === 0}
          className="rounded border border-border px-3 py-1 disabled:opacity-50"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => onChange(Array.from(value).slice(0, -1).join(""))}
          disabled={value.length === 0}
          className="rounded border border-border px-3 py-1 disabled:opacity-50"
        >
          Backspace
        </button>
      </div>
    </div>
  );
}
