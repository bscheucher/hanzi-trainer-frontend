// Loaded lazily and once for all characters: the library is browser-only and fetches each character's
// stroke data from jsDelivr.
let hanziWriter: Promise<typeof import("hanzi-writer")> | null = null;

export const loadHanziWriter = () => (hanziWriter ??= import("hanzi-writer"));

export type HanziWriterInstance = ReturnType<(typeof import("hanzi-writer"))["default"]["create"]>;

/** Characters Hanzi Writer can have stroke data for; anything else is shown as plain text. */
export const HAN = /\p{Script=Han}/u;
