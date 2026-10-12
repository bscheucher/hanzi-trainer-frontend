"use client";

import { useEffect, useRef, useState } from "react";
import { loadHanziWriter, type HanziWriterInstance } from "./hanziWriter";
import TianZiGe from "./TianZiGe";

export interface HanziQuizResult {
  /** Mistakes per character; self-assessed characters (no stroke data) count 0 or {@link SELF_ASSESSED_WRONG}. */
  strokeMistakes: number[];
  hintsUsed: number;
  skipped: boolean;
  durationMs: number;
}

/** Reported for a self-assessed wrong character: one more than the 3 mistakes a character may have (spec 07). */
export const SELF_ASSESSED_WRONG = 4;
/** Hanzi Writer shows the outline after this many misses on one stroke. */
const HINT_AFTER_MISSES = 3;
const BOX = "min(90vw, 320px)";

type Phase = { name: "writing"; index: number } | { name: "finishing" } | { name: "done" };

/**
 * Write a known word character by character in Hanzi Writer quizzes (spec 08). The current character is large, the
 * finished ones small; the target is not shown until written. After the last character the whole word is animated
 * once, then {@link onComplete} is called. Skip ends the quiz at once.
 */
export default function HanziQuiz({ hanzi, onComplete }: { hanzi: string; onComplete(result: HanziQuizResult): void }) {
  const chars = Array.from(hanzi);
  const [phase, setPhase] = useState<Phase>({ name: "writing", index: 0 });
  const [mistakes, setMistakes] = useState<number[]>([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const startedAt = useRef(0);
  const durationMs = useRef(0);

  useEffect(() => {
    startedAt.current = performance.now();
  }, []);

  const elapsed = () => Math.round(performance.now() - startedAt.current);

  function characterDone(count: number) {
    const next = [...mistakes, count];
    setMistakes(next);
    if (next.length < chars.length) {
      setPhase({ name: "writing", index: next.length });
    } else {
      durationMs.current = elapsed();
      setPhase({ name: "finishing" });
    }
  }

  function finish() {
    setPhase({ name: "done" });
    onComplete({ strokeMistakes: mistakes, hintsUsed, skipped: false, durationMs: durationMs.current });
  }

  function skip() {
    setPhase({ name: "done" });
    onComplete({ strokeMistakes: mistakes, hintsUsed, skipped: true, durationMs: elapsed() });
  }

  if (phase.name === "finishing") {
    return <WordAnimation chars={chars} onDone={finish} />;
  }

  const written = phase.name === "writing" ? chars.slice(0, phase.index) : chars.slice(0, mistakes.length);
  return (
    <div className="flex flex-col items-center gap-3">
      <ol className="flex min-h-12 gap-1" aria-label="Written characters">
        {chars.map((_, i) => (
          <li key={i} className="relative flex size-12 items-center justify-center">
            <TianZiGe />
            {i < written.length && (
              <span lang="zh-CN" className="relative text-3xl">
                {written[i]}
              </span>
            )}
          </li>
        ))}
      </ol>
      {phase.name === "writing" && (
        <CharacterQuiz
          key={phase.index}
          char={chars[phase.index]}
          position={phase.index + 1}
          total={chars.length}
          onDone={characterDone}
          onHint={() => setHintsUsed((n) => n + 1)}
          onSkip={skip}
        />
      )}
    </div>
  );
}

function CharacterQuiz({
  char,
  position,
  total,
  onDone,
  onHint,
  onSkip,
}: {
  char: string;
  position: number;
  total: number;
  onDone(mistakes: number): void;
  onHint(): void;
  onSkip(): void;
}) {
  const target = useRef<HTMLDivElement>(null);
  const writer = useRef<HanziWriterInstance | null>(null);
  const mistakes = useRef(0);
  const strokesDone = useRef(0);
  const onDoneRef = useRef(onDone);
  const restartQuiz = useRef<(w: HanziWriterInstance, fromStroke: number) => void>(() => {});
  const [missing, setMissing] = useState(false);
  const [hinted, setHinted] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    const element = target.current;
    if (!element) return;
    let cancelled = false;
    const size = element.clientWidth || 320;

    loadHanziWriter()
      .then(({ default: HanziWriter }) => {
        if (cancelled) return;
        const color = getComputedStyle(element).color;
        const created = HanziWriter.create(element, char, {
          width: size,
          height: size,
          padding: 12,
          showCharacter: false,
          showOutline: false,
          strokeColor: color,
          drawingColor: color,
          outlineColor: "rgba(127, 127, 127, 0.3)",
          highlightColor: "rgba(16, 185, 129, 0.6)",
          drawingWidth: 6,
          strokeAnimationSpeed: 1.5,
          delayBetweenStrokes: 150,
          onLoadCharDataError: () => {
            if (!cancelled) setMissing(true);
          },
        });
        writer.current = created;
        startQuiz(created, 0);
      })
      .catch(() => {
        if (!cancelled) setMissing(true);
      });

    function startQuiz(w: HanziWriterInstance, fromStroke: number) {
      void w.quiz({
        quizStartStrokeNum: fromStroke,
        showHintAfterMisses: HINT_AFTER_MISSES,
        onMistake: () => {
          mistakes.current += 1;
        },
        onCorrectStroke: (stroke) => {
          strokesDone.current = stroke.strokeNum + 1;
        },
        onComplete: (summary) => {
          if (!cancelled) onDoneRef.current(Math.max(mistakes.current, summary.totalMistakes));
        },
      });
    }
    restartQuiz.current = startQuiz;

    // The box is min(90vw, 320px): follow it when the viewport changes, without restarting the quiz.
    const resize =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            const width = element.clientWidth;
            if (width > 0) writer.current?.updateDimensions({ width, height: width });
          });
    resize?.observe(element);

    return () => {
      cancelled = true;
      resize?.disconnect();
      writer.current?.cancelQuiz();
      writer.current = null;
      element.replaceChildren();
    };
  }, [char]);

  function hint() {
    writer.current?.showOutline();
    setHinted(true);
    onHint();
  }

  /** Animates the character, then lets the user continue from the strokes already written. */
  function showStrokeOrder() {
    const w = writer.current;
    if (!w) return;
    onHint();
    setAnimating(true);
    w.cancelQuiz();
    void w.animateCharacter({
      onComplete: () => {
        if (writer.current !== w) return;
        w.hideCharacter();
        setAnimating(false);
        restartQuiz.current(w, strokesDone.current);
      },
    });
  }

  const button = "rounded border border-border px-3 py-1.5 text-sm disabled:opacity-50";
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-muted">
        Character {position} of {total}
      </p>
      <div className="relative" style={{ width: BOX, height: BOX }}>
        <TianZiGe />
        <div
          ref={target}
          role="img"
          aria-label={`Writing area for character ${position}`}
          className="relative size-full touch-none select-none text-foreground"
        />
        {missing && (
          <span lang="zh-CN" className="absolute inset-0 flex items-center justify-center text-8xl">
            {char}
          </span>
        )}
      </div>
      {missing ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-muted">
            no stroke data for <span lang="zh-CN">{char}</span>: write it on paper, then judge yourself
          </p>
          <div className="flex gap-2">
            <button onClick={() => onDone(0)} className={button}>
              I wrote it correctly
            </button>
            <button onClick={() => onDone(SELF_ASSESSED_WRONG)} className={button}>
              I got it wrong
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-2">
          <button onClick={hint} disabled={hinted || animating} className={button}>
            Hint
          </button>
          <button onClick={showStrokeOrder} disabled={animating} className={button}>
            Show stroke order
          </button>
        </div>
      )}
      <button onClick={onSkip} className="text-sm text-muted hover:text-foreground">
        Skip word
      </button>
    </div>
  );
}

/** Animates the written word once, character by character, then calls {@link onDone}. */
function WordAnimation({ chars, onDone }: { chars: string[]; onDone(): void }) {
  const [step, setStep] = useState(0);
  const onDoneRef = useRef(onDone);
  const done = useRef(false);

  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    if (step >= chars.length && !done.current) {
      done.current = true;
      onDoneRef.current();
    }
  }, [step, chars.length]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-wrap justify-center gap-2" aria-label="Your word">
        {chars.map((char, i) => (
          <AnimatedCharacter key={i} char={char} active={i === step} onDone={() => setStep(i + 1)} />
        ))}
      </div>
      <button onClick={() => setStep(chars.length)} className="text-sm text-muted hover:text-foreground">
        Skip animation
      </button>
    </div>
  );
}

function AnimatedCharacter({ char, active, onDone }: { char: string; active: boolean; onDone(): void }) {
  const target = useRef<HTMLDivElement>(null);
  const writer = useRef<Promise<HanziWriterInstance | null> | null>(null);
  const [missing, setMissing] = useState(false);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    const element = target.current;
    if (!element) return;
    let cancelled = false;
    const created = loadHanziWriter()
      .then(({ default: HanziWriter }) =>
        cancelled
          ? null
          : HanziWriter.create(element, char, {
              width: 120,
              height: 120,
              padding: 6,
              showCharacter: false,
              strokeColor: getComputedStyle(element).color,
              outlineColor: "rgba(127, 127, 127, 0.25)",
              strokeAnimationSpeed: 2,
              delayBetweenStrokes: 100,
              onLoadCharDataError: () => {
                if (!cancelled) setMissing(true);
              },
            }),
      )
      .catch(() => {
        if (!cancelled) setMissing(true);
        return null;
      });
    writer.current = created;
    return () => {
      cancelled = true;
      writer.current = null;
      void created.then((w) => w?.pauseAnimation());
      element.replaceChildren();
    };
  }, [char]);

  useEffect(() => {
    if (!active) return;
    if (missing || !writer.current) {
      onDoneRef.current();
      return;
    }
    let cancelled = false;
    void writer.current.then((w) => {
      if (cancelled) return;
      if (!w) onDoneRef.current();
      else void w.animateCharacter({ onComplete: () => !cancelled && onDoneRef.current() });
    });
    return () => {
      cancelled = true;
    };
  }, [active, missing]);

  return (
    <div className="relative size-[120px]">
      <TianZiGe />
      <div ref={target} role="img" aria-label={`Stroke order of ${char}`} className="relative text-foreground" />
      {missing && (
        <span lang="zh-CN" className="absolute inset-0 flex items-center justify-center text-6xl">
          {char}
        </span>
      )}
    </div>
  );
}
