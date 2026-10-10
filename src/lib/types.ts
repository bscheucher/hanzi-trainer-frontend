// Mirrors the DTOs in the backend repo's src/docs/specs/03-api.md.

/** RFC 7807 error body returned by the backend for every error. */
export interface ProblemDetail {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  instance?: string;
  /** Per-item validation errors, e.g. from word confirmation (index into the request's items). */
  errors?: { index: number; message: string }[];
}

export interface CedictEntryDto {
  id: number;
  simplified: string;
  traditional: string;
  /** Tone marks, CEDICT capitalisation kept (`Běijīng`). */
  pinyin: string;
  /** Lowercase, `ü` as `v` (`bei3 jing1`). */
  pinyinNumbered: string;
  definitions: string[];
}

export interface TextbookDto {
  id: number;
  title: string;
  edition: string | null;
  lessonCount: number;
}

export interface LessonSummaryDto {
  id: number;
  textbookId: number;
  lessonNo: number;
  title: string | null;
  pageCount: number;
  wordCount: number;
  /** Pages with a finished extraction whose vocabulary is not confirmed yet. */
  pendingReviewPages: number;
}

export interface LessonDetailDto extends LessonSummaryDto {
  pages: PageDto[];
  words: WordDto[];
}

export type ExtractionStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED";

export interface PageDto {
  id: number;
  lessonId: number;
  pageNo: number | null;
  status: ExtractionStatus;
  extraction: ExtractionResult | null;
  /** Review candidates (spec 06); only in GET /pages/{id} of a DONE page. */
  candidates: CandidateDto[] | null;
  confirmed: boolean;
  errorMessage: string | null;
  createdAt: string;
}

export interface ExtractionResult {
  pageType: "VOCABULARY_LIST" | "TEXT" | "DIALOGUE" | "GRAMMAR" | "EXERCISES" | "OTHER";
  words: ExtractedWord[];
  sentences: ExtractedSentence[];
  grammarPoints: string[];
  warnings: string[];
}

export interface ExtractedWord {
  hanzi: string;
  pinyin: string;
  pinyinFromPage: boolean;
  meaningEn: string | null;
  meaningDe: string | null;
  partOfSpeech: string | null;
  exampleSentence: string | null;
  confidence: number;
}

export interface ExtractedSentence {
  hanzi: string;
  pinyin: string | null;
  translationEn: string | null;
}

export interface WordDto {
  id: number;
  hanzi: string;
  pinyin: string;
  pinyinNumbered: string;
  meaningEn: string | null;
  meaningDe: string | null;
  partOfSpeech: string | null;
  verified: boolean;
}

export type CedictStatus = "MATCH" | "PINYIN_MISMATCH" | "NOT_FOUND";

export interface CedictReading {
  pinyin: string;
  pinyinNumbered: string;
  definitions: string[];
}

export interface CandidateDto {
  /** Position in extraction.words. */
  index: number;
  hanzi: string;
  /** Canonical display pinyin; on MATCH the CC-CEDICT reading. */
  pinyin: string;
  /** Null when the pinyin could not be parsed (see pinyinError). */
  pinyinNumbered: string | null;
  meaningEn: string | null;
  meaningDe: string | null;
  partOfSpeech: string | null;
  exampleSentence: string | null;
  confidence: number;
  pinyinFromPage: boolean;
  cedictStatus: CedictStatus;
  cedictReadings: CedictReading[];
  pinyinError: string | null;
  existingWordId: number | null;
  alreadyInLesson: boolean;
}

/** GET /dictionary/check — the same normalisation and comparison confirmation applies. */
export interface ReadingCheckDto {
  pinyin: string;
  pinyinNumbered: string | null;
  cedictStatus: CedictStatus;
  cedictReadings: CedictReading[];
  error: string | null;
}

export interface ConfirmItem {
  hanzi: string;
  pinyin: string;
  meaningEn: string;
  meaningDe?: string;
  partOfSpeech?: string;
  exampleSentence?: string;
  acceptMismatch: boolean;
}

export interface ConfirmRequest {
  sourcePageId?: number;
  items: ConfirmItem[];
}

export interface ConfirmResult {
  created: number;
  reused: number;
  linked: number;
  words: WordDto[];
}
