import Link from "next/link";
import type { WordDto } from "@/lib/types";

export default function WordTable({ words }: { words: WordDto[] }) {
  return (
    <ul className="flex flex-col divide-y divide-border border-y border-border">
      {words.map((w) => (
        <li key={w.id}>
          <Link
            href={`/vocabulary/${w.id}`}
            className="grid grid-cols-[minmax(5rem,auto)_1fr] items-baseline gap-x-4 gap-y-0.5 px-1 py-2 hover:bg-border/40 sm:grid-cols-[8rem_10rem_1fr]"
          >
            <span lang="zh-CN" className="text-2xl">
              {w.hanzi}
            </span>
            <span>
              {w.pinyin}
              {!w.verified && (
                <span className="ml-2 rounded border border-border px-1 text-xs text-muted" title="Not in CC-CEDICT">
                  unverified
                </span>
              )}
            </span>
            <span className="col-span-2 text-muted sm:col-span-1">
              {w.partOfSpeech && <span className="mr-2 text-xs">{w.partOfSpeech}</span>}
              {w.meaningEn}
              {w.meaningDe && <span> · {w.meaningDe}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
