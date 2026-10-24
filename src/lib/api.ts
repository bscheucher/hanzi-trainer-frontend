import type {
  AnswerRequest,
  AnswerResult,
  CardDto,
  ForecastDayDto,
  Rating,
  ReviewItemDto,
  ReviewStatsDto,
  ConfirmRequest,
  ConfirmResult,
  LessonDetailDto,
  LessonSummaryDto,
  PageDto,
  Paged,
  PracticeSessionDto,
  ProblemDetail,
  ReadingCheckDto,
  TextbookDto,
  ExerciseType,
  GenerateExercisesRequest,
  GenerationJobDto,
  UpdateWordRequest,
  WordDetailDto,
  WordDto,
} from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  constructor(public readonly problem: ProblemDetail) {
    super(problem.detail ?? problem.title ?? `HTTP ${problem.status}`);
    this.name = "ApiError";
  }
}

/** Calls the backend under `/api` and returns the parsed JSON body (undefined for 204). */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
  });

  if (!response.ok) {
    let problem: ProblemDetail = { status: response.status, title: response.statusText };
    if (response.headers.get("content-type")?.includes("json")) {
      problem = { ...problem, ...(await response.json()) };
    }
    throw new ApiError(problem);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

// ------------------------------------------------------------------ textbooks & lessons

export const listTextbooks = () => apiFetch<TextbookDto[]>("/textbooks");

export const createTextbook = (body: { title: string; edition?: string }) =>
  apiFetch<TextbookDto>("/textbooks", jsonBody("POST", body));

export const listLessons = (textbookId: number) =>
  apiFetch<LessonSummaryDto[]>(`/textbooks/${textbookId}/lessons`);

export const createLesson = (textbookId: number, body: { lessonNo: number; title?: string }) =>
  apiFetch<LessonSummaryDto>(`/textbooks/${textbookId}/lessons`, jsonBody("POST", body));

export const getLesson = (id: number) => apiFetch<LessonDetailDto>(`/lessons/${id}`);

export const deleteLesson = (id: number) => apiFetch<void>(`/lessons/${id}`, { method: "DELETE" });

// ------------------------------------------------------------------ pages & extraction

export function uploadPage(lessonId: number, image: Blob, pageNo?: number): Promise<PageDto> {
  const form = new FormData();
  form.append("file", image, "page.jpg");
  if (pageNo !== undefined) form.append("pageNo", String(pageNo));
  return apiFetch<PageDto>(`/lessons/${lessonId}/pages`, { method: "POST", body: form });
}

export const getPage = (id: number) => apiFetch<PageDto>(`/pages/${id}`);

export const rerunExtraction = (id: number) => apiFetch<PageDto>(`/pages/${id}/extract`, { method: "POST" });

export const deletePage = (id: number) => apiFetch<void>(`/pages/${id}`, { method: "DELETE" });

export const pageImageUrl = (id: number) => `${API_BASE_URL}/api/pages/${id}/image`;

// ------------------------------------------------------------------ vocabulary review

export const checkReading = (hanzi: string, pinyin: string) =>
  apiFetch<ReadingCheckDto>(`/dictionary/check?${new URLSearchParams({ hanzi, pinyin })}`);

export const confirmWords = (lessonId: number, body: ConfirmRequest) =>
  apiFetch<ConfirmResult>(`/lessons/${lessonId}/words/confirm`, jsonBody("POST", body));

// ------------------------------------------------------------------ vocabulary

export interface WordQuery {
  lessonId?: number;
  q?: string;
  page?: number;
  size?: number;
}

export function searchWords({ lessonId, q, page, size }: WordQuery = {}) {
  const params = new URLSearchParams();
  if (lessonId != null) params.set("lessonId", String(lessonId));
  if (q?.trim()) params.set("q", q.trim());
  if (page) params.set("page", String(page));
  if (size) params.set("size", String(size));
  const query = params.toString();
  return apiFetch<Paged<WordDto>>(`/words${query ? `?${query}` : ""}`);
}

export const getWord = (id: number) => apiFetch<WordDetailDto>(`/words/${id}`);

export const updateWord = (id: number, body: UpdateWordRequest) =>
  apiFetch<WordDto>(`/words/${id}`, jsonBody("PATCH", body));

export const deleteWord = (id: number) => apiFetch<void>(`/words/${id}`, { method: "DELETE" });

/** Removes the word from one lesson; the word and its review cards stay. */
export const unlinkWord = (lessonId: number, wordId: number) =>
  apiFetch<void>(`/lessons/${lessonId}/words/${wordId}`, { method: "DELETE" });

// ------------------------------------------------------------------ practice

export const createPracticeSession = (body: { lessonId: number; types?: ExerciseType[]; size?: number }) =>
  apiFetch<PracticeSessionDto>("/practice/sessions", jsonBody("POST", body));

export const answerExercise = (id: number, body: AnswerRequest) =>
  apiFetch<AnswerResult>(`/exercises/${id}/answer`, jsonBody("POST", body));

/** Starts writing sentence exercises with the LLM; poll the job with {@link getGenerationJob}. */
export const generateExercises = (lessonId: number, body: GenerateExercisesRequest) =>
  apiFetch<GenerationJobDto>(`/lessons/${lessonId}/exercises/generate`, jsonBody("POST", body));

export const getGenerationJob = (id: number) => apiFetch<GenerationJobDto>(`/generation-jobs/${id}`);

// ------------------------------------------------------------------ reviews (spec 09)

export const getReviewStats = () => apiFetch<ReviewStatsDto>("/reviews/stats");

export const getDueReviews = (limit = 30) => apiFetch<ReviewItemDto[]>(`/reviews/due?limit=${limit}`);

/** Grades without saving; {@link rateReview} applies the rating. */
export const answerReview = (cardId: number, body: AnswerRequest) =>
  apiFetch<AnswerResult>(`/reviews/${cardId}/answer`, jsonBody("POST", body));

export const rateReview = (cardId: number, rating: Rating) =>
  apiFetch<CardDto>(`/reviews/${cardId}/rate`, jsonBody("POST", { rating }));

export const getReviewForecast = (days = 30) => apiFetch<ForecastDayDto[]>(`/reviews/forecast?days=${days}`);

function jsonBody(method: string, body: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}
