import { connection } from "next/server";
import Pagination from "@/components/vocabulary/Pagination";
import VocabularyFilters, { type LessonOption } from "@/components/vocabulary/VocabularyFilters";
import WordTable from "@/components/vocabulary/WordTable";
import { listLessons, listTextbooks, searchWords } from "@/lib/api";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** All confirmed words, newest first, filtered by lesson and text (M4). The URL holds the filters. */
export default async function VocabularyPage({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const params = await searchParams;
  const q = first(params.q)?.trim() ?? "";
  const lessonId = Number(first(params.lessonId)) || undefined;
  const page = Math.max(1, Number(first(params.page)) || 1); // 1-based in the URL, 0-based in the API

  const [words, lessons] = await Promise.all([
    searchWords({ q, lessonId, page: page - 1 }),
    lessonOptions(),
  ]);
  const filtered = q !== "" || lessonId != null;

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Vocabulary</h1>
        <p className="mt-1 text-sm text-muted">
          {words.page.totalElements} {words.page.totalElements === 1 ? "word" : "words"}
          {filtered ? " found" : ""}
        </p>
      </div>
      <VocabularyFilters q={q} lessonId={lessonId} lessons={lessons} />
      {words.content.length === 0 ? (
        <p className="text-muted">
          {filtered ? "No words match." : "No confirmed words yet. Words appear here after you review a page."}
        </p>
      ) : (
        <WordTable words={words.content} />
      )}
      <Pagination page={page} totalPages={words.page.totalPages} q={q} lessonId={lessonId} />
    </section>
  );
}

async function lessonOptions(): Promise<LessonOption[]> {
  const textbooks = await listTextbooks();
  const perTextbook = await Promise.all(
    textbooks.map(async (t) =>
      (await listLessons(t.id)).map((l) => ({
        id: l.id,
        label: `${textbooks.length > 1 ? `${t.title} · ` : ""}Lesson ${l.lessonNo}${l.title ? ` ${l.title}` : ""}`,
      })),
    ),
  );
  return perTextbook.flat();
}
