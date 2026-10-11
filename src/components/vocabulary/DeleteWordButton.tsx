"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteWord } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

/** Two-step delete: the first click asks for confirmation inline. */
export default function DeleteWordButton({ wordId, hanzi }: { wordId: number; hanzi: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    try {
      await deleteWord(wordId);
      router.push("/vocabulary");
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {confirming ? (
        <>
          <span>
            Delete <span lang="zh-CN">{hanzi}</span> from all lessons, with its review history?
          </span>
          <button onClick={remove} className="rounded bg-accent px-2 py-1 text-background">
            Delete
          </button>
          <button onClick={() => setConfirming(false)} className="rounded border border-border px-2 py-1">
            Cancel
          </button>
        </>
      ) : (
        <button onClick={() => setConfirming(true)} className="text-muted hover:text-accent">
          Delete word
        </button>
      )}
      {error && <span role="alert" className="text-accent">{error}</span>}
    </div>
  );
}
