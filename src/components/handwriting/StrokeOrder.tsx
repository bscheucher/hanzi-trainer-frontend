"use client";

import { useEffect, useRef, useState } from "react";

const HAN = /\p{Script=Han}/u;

// Loaded lazily and once for all characters: the library is browser-only and fetches each character's
// stroke data from jsDelivr.
let hanziWriter: Promise<typeof import("hanzi-writer")> | null = null;
const loadHanziWriter = () => (hanziWriter ??= import("hanzi-writer"));

/** Looping stroke-order animation, one box per Chinese character (spec 08); other characters are shown as text. */
export default function StrokeOrder({ hanzi, size = 160 }: { hanzi: string; size?: number }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {Array.from(hanzi).map((char, i) =>
        HAN.test(char) ? (
          <CharacterAnimation key={`${i}-${char}`} char={char} size={size} />
        ) : (
          <span key={`${i}-${char}`} lang="zh-CN" className="text-4xl text-muted">
            {char}
          </span>
        ),
      )}
    </div>
  );
}

function CharacterAnimation({ char, size }: { char: string; size: number }) {
  const target = useRef<HTMLDivElement>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const element = target.current;
    if (!element) return;
    let cancelled = false;
    let writer: { pauseAnimation(): unknown } | null = null;

    loadHanziWriter().then(({ default: HanziWriter }) => {
      if (cancelled) return;
      const color = getComputedStyle(element).color;
      const created = HanziWriter.create(element, char, {
        width: size,
        height: size,
        padding: 8,
        strokeColor: color,
        radicalColor: null,
        outlineColor: "rgba(127, 127, 127, 0.25)",
        strokeAnimationSpeed: 1,
        delayBetweenStrokes: 250,
        delayBetweenLoops: 1500,
        onLoadCharDataError: () => {
          if (!cancelled) setMissing(true);
        },
      });
      writer = created;
      created.loopCharacterAnimation();
    }).catch(() => {
      if (!cancelled) setMissing(true);
    });

    return () => {
      cancelled = true;
      writer?.pauseAnimation();
      element.replaceChildren();
    };
  }, [char, size]);

  return (
    <figure className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <TianZiGe />
        <div ref={target} role="img" aria-label={`Stroke order of ${char}`} className="relative text-foreground" />
        {missing && (
          <span lang="zh-CN" className="absolute inset-0 flex items-center justify-center text-6xl">
            {char}
          </span>
        )}
      </div>
      {missing && <figcaption className="text-xs text-muted">no stroke data for {char}</figcaption>}
    </figure>
  );
}

/** 田字格: square with a cross and diagonals as writing guides. */
function TianZiGe() {
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full text-border" aria-hidden="true">
      <rect x="0.5" y="0.5" width="99" height="99" fill="none" stroke="currentColor" />
      <g stroke="currentColor" strokeDasharray="3 3" strokeWidth="0.6">
        <line x1="50" y1="0" x2="50" y2="100" />
        <line x1="0" y1="50" x2="100" y2="50" />
        <line x1="0" y1="0" x2="100" y2="100" />
        <line x1="100" y1="0" x2="0" y2="100" />
      </g>
    </svg>
  );
}
