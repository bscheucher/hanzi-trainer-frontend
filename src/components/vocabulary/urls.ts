/** `/vocabulary` URL for a filter state; empty filters and page 1 are left out. */
export function vocabularyUrl({ q, lessonId, page }: { q?: string; lessonId?: number; page?: number }): string {
  const params = new URLSearchParams();
  if (q?.trim()) params.set("q", q.trim());
  if (lessonId != null) params.set("lessonId", String(lessonId));
  if (page != null && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/vocabulary?${query}` : "/vocabulary";
}
