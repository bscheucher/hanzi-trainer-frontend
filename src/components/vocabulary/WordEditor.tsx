"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { updateWord } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import type { WordDto } from "@/lib/types";

/** Meanings and part of speech, editable in place (`PATCH /words/{id}`). */
export default function WordEditor({ word }: { word: WordDto }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [meaningEn, setMeaningEn] = useState(word.meaningEn ?? "");
  const [meaningDe, setMeaningDe] = useState(word.meaningDe ?? "");
  const [partOfSpeech, setPartOfSpeech] = useState(word.partOfSpeech ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function cancel() {
    setMeaningEn(word.meaningEn ?? "");
    setMeaningDe(word.meaningDe ?? "");
    setPartOfSpeech(word.partOfSpeech ?? "");
    setError(null);
    setEditing(false);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await updateWord(word.id, { meaningEn, meaningDe, partOfSpeech });
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <section className="flex flex-col gap-2">
        <div className="flex items-baseline gap-3">
          <h2 className="text-lg font-semibold">Meaning</h2>
          <button onClick={() => setEditing(true)} className="text-sm underline">
            Edit
          </button>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-muted">English</dt>
          <dd>{word.meaningEn}</dd>
          <dt className="text-muted">German</dt>
          <dd>{word.meaningDe ?? <span className="text-muted">–</span>}</dd>
          <dt className="text-muted">Part of speech</dt>
          <dd>{word.partOfSpeech ?? <span className="text-muted">–</span>}</dd>
        </dl>
      </section>
    );
  }

  const field = "rounded border border-border bg-transparent px-2 py-1.5";
  return (
    <form onSubmit={save} className="flex flex-col gap-3" aria-label="Edit meaning">
      <h2 className="text-lg font-semibold">Meaning</h2>
      <label className="flex flex-col gap-1 text-sm">
        English
        <input value={meaningEn} onChange={(e) => setMeaningEn(e.target.value)} required className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        German
        <input value={meaningDe} onChange={(e) => setMeaningDe(e.target.value)} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Part of speech
        <input
          value={partOfSpeech}
          onChange={(e) => setPartOfSpeech(e.target.value)}
          maxLength={50}
          className={`${field} max-w-40`}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !meaningEn.trim()}
          className="rounded bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-50"
        >
          Save
        </button>
        <button type="button" onClick={cancel} className="rounded border border-border px-3 py-1.5 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}
