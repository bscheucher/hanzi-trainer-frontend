// HanziLookupJS is GPL-licensed and vendored unmodified in public/hanzilookup/ (see the README there). It is loaded
// with a script tag on first use, never imported or bundled.
const SCRIPT_URL = "/hanzilookup/hanzilookup.min.js";
const DATA_URL = "/hanzilookup/mmah.json";
/** Name the data set is registered under; the Make Me a Hanzi data also scores where each stroke is. */
const DATA_SET = "mmah";

export type Point = [x: number, y: number];
export type Stroke = Point[];

interface Matcher {
  match(character: unknown, limit: number, done: (matches: { character: string }[]) => void): void;
}

interface HanziLookupGlobal {
  init(name: string, url: string, done: (ok: boolean) => void): void;
  AnalyzedCharacter: new (strokes: Stroke[]) => unknown;
  Matcher: new (name: string) => Matcher;
}

declare global {
  interface Window {
    HanziLookup?: HanziLookupGlobal;
  }
}

let loading: Promise<Matcher> | null = null;

function loadScript(): Promise<HanziLookupGlobal> {
  return new Promise((resolve, reject) => {
    if (window.HanziLookup) return resolve(window.HanziLookup);
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.HanziLookup ? resolve(window.HanziLookup) : reject(new Error("HanziLookup missing")));
    script.onerror = () => reject(new Error(`Could not load ${SCRIPT_URL}`));
    document.head.appendChild(script);
  });
}

async function load(): Promise<Matcher> {
  const lookup = await loadScript();
  await new Promise<void>((resolve, reject) =>
    lookup.init(DATA_SET, DATA_URL, (ok) => (ok ? resolve() : reject(new Error(`Could not load ${DATA_URL}`)))),
  );
  return new lookup.Matcher(DATA_SET);
}

/** Loads the library and its data (about 800 KB) once; a failed load is retried on the next call. */
export function loadHanziLookup(): Promise<Matcher> {
  loading ??= load().catch((e: unknown) => {
    loading = null;
    throw e;
  });
  return loading;
}

/** The characters that best match the drawn strokes, best first. Points may use any scale. */
export async function recognise(strokes: Stroke[], limit = 8): Promise<string[]> {
  if (strokes.length === 0) return [];
  const matcher = await loadHanziLookup();
  const analyzed = new window.HanziLookup!.AnalyzedCharacter(strokes.map((s) => s.map(([x, y]) => [x, y] as Point)));
  return new Promise((resolve) => matcher.match(analyzed, limit, (matches) => resolve(matches.map((m) => m.character))));
}
