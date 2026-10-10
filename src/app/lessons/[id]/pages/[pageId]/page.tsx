import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import ReviewScreen from "@/components/review/ReviewScreen";
import { ApiError, getPage } from "@/lib/api";

export default async function ReviewPage({ params }: { params: Promise<{ id: string; pageId: string }> }) {
  await connection();
  const { id, pageId } = await params;
  const page = await getPage(Number(pageId)).catch((e: unknown) => {
    if (e instanceof ApiError && e.problem.status === 404) notFound();
    throw e;
  });
  if (page.lessonId !== Number(id)) notFound();

  const lessonUrl = `/lessons/${page.lessonId}`;
  return (
    <section className="flex flex-col gap-6">
      <div>
        <Link href={lessonUrl} className="text-sm text-muted hover:text-foreground">
          ← Lesson
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">
          Review {page.pageNo != null ? `page ${page.pageNo}` : `page #${page.id}`}
          {page.confirmed && <span className="ml-2 text-sm font-normal text-muted">confirmed</span>}
        </h1>
      </div>
      {page.status === "DONE" ? (
        <ReviewScreen page={page} />
      ) : (
        <p className="text-muted">
          Extraction is {page.status.toLowerCase()}; there is nothing to review yet.{" "}
          <Link href={lessonUrl} className="underline">
            Back to the lesson
          </Link>
        </p>
      )}
    </section>
  );
}
