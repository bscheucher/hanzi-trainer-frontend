import Link from "next/link";
import { vocabularyUrl } from "./urls";

export default function Pagination({
  page,
  totalPages,
  q,
  lessonId,
}: {
  page: number;
  totalPages: number;
  q: string;
  lessonId?: number;
}) {
  if (totalPages <= 1) return null;
  const link = "rounded border border-border px-3 py-1.5";
  return (
    <nav aria-label="Pages" className="flex items-center gap-3 text-sm">
      {page > 1 ? (
        <Link href={vocabularyUrl({ q, lessonId, page: page - 1 })} className={link}>
          ← Previous
        </Link>
      ) : (
        <span className={`${link} opacity-50`}>← Previous</span>
      )}
      <span className="text-muted">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={vocabularyUrl({ q, lessonId, page: page + 1 })} className={link}>
          Next →
        </Link>
      ) : (
        <span className={`${link} opacity-50`}>Next →</span>
      )}
    </nav>
  );
}
