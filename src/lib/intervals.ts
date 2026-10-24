const ISO_DURATION = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;

/** Seconds in an ISO-8601 duration as the backend writes them ("P3D", "PT10M", "PT5M30S"); NaN otherwise. */
export function durationSeconds(iso: string): number {
  const m = ISO_DURATION.exec(iso);
  if (!m || iso === "P" || iso === "PT") return Number.NaN;
  const [, d, h, min, s] = m.map((v) => (v === undefined ? 0 : Number(v)));
  return d * 86_400 + h * 3_600 + min * 60 + s;
}

/** A short label for a rating button (spec 09): "<10m", "<2h", "1d", "3d", "2.1mo", "1.3y". */
export function formatInterval(iso: string): string {
  const seconds = durationSeconds(iso);
  if (Number.isNaN(seconds)) return iso;
  if (seconds < 3_600) return `<${Math.max(1, Math.ceil(seconds / 60))}m`;
  if (seconds < 86_400) return `<${Math.ceil(seconds / 3_600)}h`;
  const days = Math.round(seconds / 86_400);
  if (days < 30) return `${days}d`;
  if (days < 365) return `${trim(days / 30)}mo`;
  return `${trim(days / 365)}y`;
}

const trim = (n: number) => String(Math.round(n * 10) / 10);
