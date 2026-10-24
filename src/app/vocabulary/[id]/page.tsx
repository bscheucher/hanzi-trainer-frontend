import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import StrokeOrder from "@/components/handwriting/StrokeOrder";
import DeleteWordButton from "@/components/vocabulary/DeleteWordButton";
import UnlinkButton from "@/components/vocabulary/UnlinkButton";
import WordEditor from "@/components/vocabulary/WordEditor";
import { ApiError, getWord } from "@/lib/api";
import { CARD_TYPE_LABELS } from "@/lib/cards";


export default async function WordPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const word = await getWord(Number(id)).catch((e: unknown) => {
    if (e instanceof ApiError && e.problem.status === 404) notFound();
    throw e;
  });

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/vocabulary" className="text-sm text-muted hover:text-foreground">
            ← Vocabulary
          </Link>
          <h1 className="mt-1 flex flex-wrap items-baseline gap-x-4">
            <span lang="zh-CN" className="text-5xl">
              {word.hanzi}
            </span>
            <span className="text-2xl">{word.pinyin}</span>
            <span className="text-sm text-muted">{word.pinyinNumbered}</span>
          </h1>
          {!word.verified && <p className="mt-1 text-sm text-muted">Not in CC-CEDICT; kept as you entered it.</p>}
        </div>
        <DeleteWordButton wordId={word.id} hanzi={word.hanzi} />
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Stroke order</h2>
        <StrokeOrder hanzi={word.hanzi} />
      </section>

      <WordEditor word={word} />

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Lessons</h2>
        {word.lessons.length === 0 ? (
          <p className="text-muted">Not in any lesson. The word stays in your reviews until you delete it.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {word.lessons.map((l) => (
              <li key={l.lessonId} className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex flex-col">
                  <Link href={`/lessons/${l.lessonId}`} className="underline">
                    {l.textbookTitle} · Lesson {l.lessonNo}
                  </Link>
                  {l.exampleSentence && (
                    <span lang="zh-CN" className="text-lg">
                      {l.exampleSentence}
                    </span>
                  )}
                </div>
                <UnlinkButton lessonId={l.lessonId} lessonNo={l.lessonNo} wordId={word.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {word.cards.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Review cards</h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {word.cards.map((c) => (
              <li key={c.cardType} className="rounded border border-border px-2 py-1">
                {CARD_TYPE_LABELS[c.cardType]} · {c.state.toLowerCase()} · due {c.due.slice(0, 10)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
