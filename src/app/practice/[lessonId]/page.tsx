import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import PracticePlayer from "@/components/exercises/PracticePlayer";
import { ApiError, getLesson } from "@/lib/api";

export default async function PracticePage({ params }: { params: Promise<{ lessonId: string }> }) {
  await connection();
  const { lessonId } = await params;
  const lesson = await getLesson(Number(lessonId)).catch((e: unknown) => {
    if (e instanceof ApiError && e.problem.status === 404) notFound();
    throw e;
  });
  const lessonUrl = `/lessons/${lesson.id}`;

  return (
    <section className="flex flex-col gap-6">
      <div>
        <Link href={lessonUrl} className="text-sm text-muted hover:text-foreground">
          ← Lesson {lesson.lessonNo}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">
          Practice: Lesson {lesson.lessonNo}
          {lesson.title && (
            <span lang="zh-CN" className="ml-2">
              {lesson.title}
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-muted">Free practice: answers are graded but do not change your reviews.</p>
      </div>
      {lesson.words.length === 0 ? (
        <p className="text-muted">
          This lesson has no confirmed words yet. <Link href={lessonUrl} className="underline">Review a page</Link> first.
        </p>
      ) : (
        <PracticePlayer lessonId={lesson.id} lessonUrl={lessonUrl} />
      )}
    </section>
  );
}
