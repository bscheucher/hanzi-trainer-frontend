"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { vocabularyUrl } from "./urls";

export interface LessonOption {
  id: number;
  label: string;
}

/** Text search and lesson filter; both live in the URL so results can be bookmarked and shared. */
export default function VocabularyFilters({
  q,
  lessonId,
  lessons,
}: {
  q: string;
  lessonId?: number;
  lessons: LessonOption[];
}) {
  const router = useRouter();
  const [text, setText] = useState(q);

  const go = (next: { q: string; lessonId?: number }) => router.push(vocabularyUrl(next));

  function submit(e: FormEvent) {
    e.preventDefault();
    go({ q: text, lessonId });
  }

  return (
    <form role="search" onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm">
        Search
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="汉字, pinyin (xuexi, xuéxí, xue2xi2) or meaning"
          className="rounded border border-border bg-transparent px-2 py-1.5 text-base"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Lesson
        <select
          value={lessonId ?? ""}
          onChange={(e) => go({ q: text, lessonId: Number(e.target.value) || undefined })}
          className="rounded border border-border bg-background px-2 py-1.5 text-base"
        >
          <option value="">All lessons</option>
          {lessons.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="rounded bg-foreground px-3 py-1.5 text-sm text-background">
        Search
      </button>
    </form>
  );
}
