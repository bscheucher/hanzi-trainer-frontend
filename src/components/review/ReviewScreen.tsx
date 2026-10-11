"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ApiError, checkReading, confirmWords, deletePage, pageImageUrl, rerunExtraction } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { numberedInputToMarks } from "@/lib/pinyin";
import type { CedictReading, ConfirmResult, PageDto } from "@/lib/types";
import CandidateRow from "./CandidateRow";
import { emptyRow, rowFromCandidate, rowProblem, toConfirmItem, type Row } from "./rows";
import ZoomableImage from "./ZoomableImage";

/** Review screen for one page (spec 06): edit candidates, check them against CC-CEDICT, confirm. */
export default function ReviewScreen({ page }: { page: PageDto }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => (page.candidates ?? []).map(rowFromCandidate));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [confirmAction, setConfirmAction] = useState<"rerun" | "discard" | null>(null);
  const checks = useRef(new Map<string, number>()); // latest check request per row
  const lessonUrl = `/lessons/${page.lessonId}`;

  const update = (key: string, patch: Partial<Row>) =>
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  async function revalidate(row: Row) {
    const hanzi = row.hanzi.trim();
    const pinyin = numberedInputToMarks(row.pinyin);
    if (!hanzi) {
      update(row.key, { pinyin, cedictStatus: null });
      return;
    }
    const request = (checks.current.get(row.key) ?? 0) + 1;
    checks.current.set(row.key, request);
    update(row.key, { pinyin, checking: true, serverError: null });
    try {
      const check = await checkReading(hanzi, pinyin);
      if (checks.current.get(row.key) !== request) return; // a newer edit is being checked
      update(row.key, {
        pinyin: check.error ? pinyin : check.pinyin,
        pinyinNumbered: check.pinyinNumbered,
        cedictStatus: check.cedictStatus,
        cedictReadings: check.cedictReadings,
        pinyinError: check.error,
        acceptMismatch: check.cedictStatus === "PINYIN_MISMATCH" ? row.acceptMismatch : false,
        checking: false,
      });
    } catch (e) {
      update(row.key, { checking: false, cedictStatus: null, serverError: errorMessage(e) });
    }
  }

  const pickReading = (key: string, reading: CedictReading) =>
    update(key, {
      pinyin: reading.pinyin,
      pinyinNumbered: reading.pinyinNumbered,
      cedictStatus: "MATCH",
      pinyinError: null,
      acceptMismatch: false,
      serverError: null,
    });

  const included = rows.filter((r) => r.include);
  const needAttention = included.filter((r) => rowProblem(r) !== null).length;
  const canConfirm = !busy && included.length > 0 && needAttention === 0;

  async function confirm() {
    setBusy(true);
    setError(null);
    setRows((current) => current.map((r) => ({ ...r, serverError: null })));
    try {
      const confirmed = await confirmWords(page.lessonId, {
        sourcePageId: page.id,
        items: included.map(toConfirmItem),
      });
      setResult(confirmed);
      const keys = new Set(included.map((r) => r.key));
      setRows((current) =>
        current.map((r) => (keys.has(r.key) ? { ...r, include: false, alreadyInLesson: true } : r)),
      );
    } catch (e) {
      const itemErrors = e instanceof ApiError ? (e.problem.errors ?? []) : [];
      if (itemErrors.length > 0) {
        setRows((current) =>
          current.map((r) => {
            const index = included.findIndex((i) => i.key === r.key);
            const message = itemErrors.find((err) => err.index === index)?.message;
            return message ? { ...r, serverError: message } : r;
          }),
        );
      }
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function rerun() {
    try {
      await rerunExtraction(page.id);
      router.push(lessonUrl);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function discard() {
    try {
      await deletePage(page.id);
      router.push(lessonUrl);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const extraction = page.extraction;
  const pageLabel = page.pageNo != null ? `Page ${page.pageNo}` : `Page #${page.id}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="lg:sticky lg:top-4 lg:self-start">
        <ZoomableImage src={pageImageUrl(page.id)} alt={pageLabel} />
      </div>

      <div className="flex flex-col gap-4">
        {extraction && extraction.warnings.length > 0 && (
          <ul className="rounded border border-amber-500 p-3 text-sm text-amber-700 dark:text-amber-300">
            {extraction.warnings.map((w) => (
              <li key={w}>⚠ {w}</li>
            ))}
          </ul>
        )}

        {result && (
          <p role="status" className="rounded border border-emerald-600 p-3 text-sm">
            Confirmed: {result.created} new {result.created === 1 ? "word" : "words"}, {result.reused} already
            known, {result.linked} added to the lesson. <Link href={lessonUrl} className="underline">Back to lesson</Link>
          </p>
        )}

        {rows.length === 0 ? (
          <p className="text-muted">No words were extracted from this page. Add them by hand below.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((row) => (
              <CandidateRow
                key={row.key}
                row={row}
                onChange={(patch) => update(row.key, { ...patch, serverError: null })}
                onReadingBlur={() => revalidate(rows.find((r) => r.key === row.key) ?? row)}
                onPickReading={(reading) => pickReading(row.key, reading)}
                onDelete={() => setRows((current) => current.filter((r) => r.key !== row.key))}
              />
            ))}
          </ul>
        )}

        <button
          onClick={() => setRows((current) => [...current, emptyRow()])}
          className="self-start rounded border border-border px-3 py-1.5 text-sm"
        >
          Add word
        </button>

        {error && (
          <p role="alert" className="text-sm text-accent">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <button
            onClick={confirm}
            disabled={!canConfirm}
            className="rounded bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-50"
          >
            Confirm selected ({included.length})
          </button>
          {needAttention > 0 && (
            <span className="text-sm text-muted">
              {needAttention} {needAttention === 1 ? "word needs" : "words need"} attention
            </span>
          )}
          {confirmAction === null ? (
            <>
              <button onClick={() => (page.confirmed ? setConfirmAction("rerun") : rerun())} className="text-sm underline">
                Re-run extraction
              </button>
              <button onClick={() => setConfirmAction("discard")} className="text-sm text-muted hover:text-accent">
                Discard page
              </button>
            </>
          ) : (
            <span className="flex flex-wrap items-center gap-2 text-sm">
              {confirmAction === "rerun"
                ? "This page is already confirmed. Re-run extraction? Confirmed words stay."
                : "Delete this page and its extraction? Confirmed words stay."}
              <button
                onClick={confirmAction === "rerun" ? rerun : discard}
                className="rounded bg-accent px-2 py-1 text-background"
              >
                {confirmAction === "rerun" ? "Re-run" : "Delete"}
              </button>
              <button onClick={() => setConfirmAction(null)} className="rounded border border-border px-2 py-1">
                Cancel
              </button>
            </span>
          )}
        </div>

        {extraction && (extraction.sentences.length > 0 || extraction.grammarPoints.length > 0) && (
          <section className="flex flex-col gap-3 border-t border-border pt-4">
            {extraction.sentences.length > 0 && (
              <div>
                <h2 className="font-semibold">Sentences on this page</h2>
                <ul className="mt-1 flex flex-col gap-1">
                  {extraction.sentences.map((s) => (
                    <li key={s.hanzi}>
                      <span lang="zh-CN" className="text-lg">
                        {s.hanzi}
                      </span>
                      {s.pinyin && <span className="ml-2 text-muted">{s.pinyin}</span>}
                      {s.translationEn && <span className="ml-2 text-muted">— {s.translationEn}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {extraction.grammarPoints.length > 0 && (
              <div>
                <h2 className="font-semibold">Grammar</h2>
                <ul className="mt-1 list-disc pl-5">
                  {extraction.grammarPoints.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
