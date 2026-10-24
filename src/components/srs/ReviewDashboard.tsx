import Link from "next/link";
import { CARD_STATE_LABELS, CARD_TYPE_LABELS } from "@/lib/cards";
import type { CardState, CardType, ForecastDayDto, ReviewStatsDto } from "@/lib/types";
import ForecastChart from "./ForecastChart";

const STATES = Object.keys(CARD_STATE_LABELS) as CardState[];
const TYPES = Object.keys(CARD_TYPE_LABELS) as CardType[];

/** The review dashboard (spec 09): headline counts, cards per state and type, the forecast, Start review. */
export default function ReviewDashboard({ stats, forecast }: { stats: ReviewStatsDto; forecast: ForecastDayDto[] }) {
  const tiles = [
    { label: "Due now", value: stats.dueNow },
    { label: "Due today", value: stats.dueToday },
    { label: "Reviewed today", value: stats.reviewedToday },
    { label: "New cards left today", value: stats.newCardsLeftToday },
  ];
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-4">
        {stats.dueNow > 0 ? (
          <Link href="/review/session" className="rounded bg-foreground px-4 py-2 text-background">
            Start review
          </Link>
        ) : (
          <span className="rounded border border-border px-4 py-2 text-muted" aria-disabled>
            Start review
          </span>
        )}
        <span className="text-sm text-muted">
          {stats.dueNow > 0 ? `${stats.dueNow} card${stats.dueNow === 1 ? "" : "s"} due now.` : "Nothing due right now."}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded border border-border p-4">
            <dt className="text-sm text-muted">{tile.label}</dt>
            <dd className="mt-1 text-3xl font-semibold tabular-nums">{tile.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 sm:grid-cols-2">
        <Counts title="Cards per state" rows={STATES.map((s) => ({ label: CARD_STATE_LABELS[s], value: stats.byState[s] }))} />
        <Counts title="Cards per type" rows={TYPES.map((t) => ({ label: CARD_TYPE_LABELS[t], value: stats.byType[t] }))} />
      </div>

      <ForecastChart days={forecast} />
    </div>
  );
}

function Counts({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  return (
    <section>
      <h2 className="font-semibold">{title}</h2>
      <dl className="mt-2 flex flex-col gap-1">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between border-b border-border py-1 text-sm">
            <dt>{row.label}</dt>
            <dd className="tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
