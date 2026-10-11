"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { unlinkWord } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

/** Removes the word from one lesson; the word and its review cards stay. */
export default function UnlinkButton({ lessonId, lessonNo, wordId }: { lessonId: number; lessonNo: number; wordId: number }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function unlink() {
    try {
      await unlinkWord(lessonId, wordId);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <span className="flex items-center gap-2 text-sm">
      <button onClick={unlink} className="text-muted hover:text-accent" aria-label={`Remove from lesson ${lessonNo}`}>
        Remove from lesson
      </button>
      {error && <span role="alert" className="text-accent">{error}</span>}
    </span>
  );
}
