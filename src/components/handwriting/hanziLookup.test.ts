import { afterEach, describe, expect, it, vi } from "vitest";

/** Fresh module per test: the loader keeps its promise in module state. */
async function freshModule() {
  vi.resetModules();
  return import("./hanziLookup");
}

function scriptTag() {
  return document.head.querySelector<HTMLScriptElement>('script[src="/hanzilookup/hanzilookup.min.js"]');
}

describe("hanziLookup", () => {
  afterEach(() => {
    delete window.HanziLookup;
    document.head.innerHTML = "";
  });

  it("loads the vendored script and data once and returns the matched characters", async () => {
    const { recognise } = await freshModule();
    const init = vi.fn((_name: string, _url: string, done: (ok: boolean) => void) => done(true));
    const match = vi.fn((_c: unknown, limit: number, done: (m: { character: string }[]) => void) =>
      done([{ character: "十" }, { character: "干" }].slice(0, limit)),
    );
    const AnalyzedCharacter = vi.fn();

    const first = recognise([[[0, 50], [100, 50]], [[50, 0], [50, 100]]], 8);
    window.HanziLookup = {
      init,
      AnalyzedCharacter: AnalyzedCharacter as never,
      Matcher: vi.fn(function () {
        return { match };
      }) as never,
    };
    scriptTag()!.onload!(new Event("load"));

    expect(await first).toEqual(["十", "干"]);
    expect(await recognise([[[0, 0], [1, 1]]], 1)).toEqual(["十"]);
    expect(init).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledWith("mmah", "/hanzilookup/mmah.json", expect.any(Function));
    expect(document.head.querySelectorAll("script")).toHaveLength(1);
  });

  it("returns nothing for an empty pad without loading anything", async () => {
    const { recognise } = await freshModule();

    expect(await recognise([])).toEqual([]);
    expect(scriptTag()).toBeNull();
  });

  it("a failed load is tried again on the next call", async () => {
    const { recognise } = await freshModule();

    const failed = recognise([[[0, 0]]]);
    scriptTag()!.onerror!(new Event("error"));
    await expect(failed).rejects.toThrow("Could not load /hanzilookup/hanzilookup.min.js");

    void recognise([[[0, 0]]]).catch(() => {});
    expect(document.head.querySelectorAll("script")).toHaveLength(2);
  });
});
