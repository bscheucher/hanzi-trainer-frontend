import type { CandidateDto, CedictReading, CedictStatus, ConfirmItem } from "@/lib/types";

/** Editable state of one candidate on the review screen. */
export interface Row {
  key: string;
  include: boolean;
  hanzi: string;
  pinyin: string;
  pinyinNumbered: string | null;
  meaningEn: string;
  meaningDe: string;
  partOfSpeech: string;
  exampleSentence: string;
  /** Null for rows added by hand. */
  confidence: number | null;
  /** Null until the reading has been checked (rows added by hand, or while editing). */
  cedictStatus: CedictStatus | null;
  cedictReadings: CedictReading[];
  pinyinError: string | null;
  acceptMismatch: boolean;
  existingWordId: number | null;
  alreadyInLesson: boolean;
  checking: boolean;
  /** Message from the last confirm attempt. */
  serverError: string | null;
}

export const LOW_CONFIDENCE = 0.7;

let nextKey = 0;
const newKey = () => `row-${nextKey++}`;

export function rowFromCandidate(c: CandidateDto): Row {
  return {
    key: newKey(),
    include: !c.alreadyInLesson,
    hanzi: c.hanzi,
    pinyin: c.pinyin,
    pinyinNumbered: c.pinyinNumbered,
    meaningEn: c.meaningEn ?? "",
    meaningDe: c.meaningDe ?? "",
    partOfSpeech: c.partOfSpeech ?? "",
    exampleSentence: c.exampleSentence ?? "",
    confidence: c.confidence,
    cedictStatus: c.cedictStatus,
    cedictReadings: c.cedictReadings,
    pinyinError: c.pinyinError,
    acceptMismatch: false,
    existingWordId: c.existingWordId,
    alreadyInLesson: c.alreadyInLesson,
    checking: false,
    serverError: null,
  };
}

export function emptyRow(): Row {
  return {
    key: newKey(),
    include: true,
    hanzi: "",
    pinyin: "",
    pinyinNumbered: null,
    meaningEn: "",
    meaningDe: "",
    partOfSpeech: "",
    exampleSentence: "",
    confidence: null,
    cedictStatus: null,
    cedictReadings: [],
    pinyinError: null,
    acceptMismatch: false,
    existingWordId: null,
    alreadyInLesson: false,
    checking: false,
    serverError: null,
  };
}

/** Why an included row cannot be confirmed yet, or null. Mirrors the server's validation (spec 06). */
export function rowProblem(row: Row): string | null {
  if (!row.include) return null;
  if (!row.hanzi.trim()) return "Hanzi is missing.";
  if (!row.meaningEn.trim()) return "English meaning is missing.";
  if (row.checking || row.cedictStatus === null) return "Checking the reading…";
  if (row.pinyinError) return row.pinyinError;
  if (row.cedictStatus === "PINYIN_MISMATCH" && !row.acceptMismatch) {
    return "Pinyin differs from CC-CEDICT: pick a dictionary reading or tick “keep my pinyin”.";
  }
  return null;
}

export function toConfirmItem(row: Row): ConfirmItem {
  const optional = (value: string) => value.trim() || undefined;
  return {
    hanzi: row.hanzi.trim(),
    pinyin: row.pinyin.trim(),
    meaningEn: row.meaningEn.trim(),
    meaningDe: optional(row.meaningDe),
    partOfSpeech: optional(row.partOfSpeech),
    exampleSentence: optional(row.exampleSentence),
    acceptMismatch: row.acceptMismatch,
  };
}
