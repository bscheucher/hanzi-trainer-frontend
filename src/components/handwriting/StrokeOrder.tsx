"use client";

import { useEffect, useRef, useState } from "react";
import { HAN, loadHanziWriter } from "./hanziWriter";
import TianZiGe from "./TianZiGe";

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
