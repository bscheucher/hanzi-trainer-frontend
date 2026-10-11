import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "@/lib/api";
import type { CandidateDto, PageDto } from "@/lib/types";
import { EXTRACTION, page } from "@/test/fixtures";
import ReviewScreen from "./ReviewScreen";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("@/lib/api", async (original) => ({
  ...(await original<typeof import("@/lib/api")>()),
  checkReading: vi.fn(),
  confirmWords: vi.fn(),
  rerunExtraction: vi.fn(),
  deletePage: vi.fn(),
}));

afterEach(() => vi.clearAllMocks());

function candidate(overrides: Partial<CandidateDto>): CandidateDto {
  return {
    index: 0,
    hanzi: "朋友",
    pinyin: "péngyou",
    pinyinNumbered: "peng2 you5",
    meaningEn: "friend",
    meaningDe: "Freund",
    partOfSpeech: "n.",
    exampleSentence: null,
    confidence: 0.98,
    pinyinFromPage: true,
    cedictStatus: "MATCH",
    cedictReadings: [{ pinyin: "péngyou", pinyinNumbered: "peng2 you5", definitions: ["friend"] }],
    pinyinError: null,
    existingWordId: null,
    alreadyInLesson: false,
    ...overrides,
  };
}

const LIAO = [
  { pinyin: "le", pinyinNumbered: "le5", definitions: ["(completed action marker)"] },
  { pinyin: "liǎo", pinyinNumbered: "liao3", definitions: ["to finish"] },
];

function reviewPage(candidates: CandidateDto[], overrides: Partial<PageDto> = {}): PageDto {
  return page({ id: 5, lessonId: 7, status: "DONE", extraction: EXTRACTION, candidates, ...overrides });
}

const row = (hanzi: string) => screen.getByRole("listitem", { name: hanzi });
const confirmButton = () => screen.getByRole("button", { name: /Confirm selected/ });

describe("ReviewScreen", () => {
  it("shows a badge per CC-CEDICT status and the other flags", () => {
    render(
      <ReviewScreen
        page={reviewPage([
          candidate({}),
          candidate({ index: 1, hanzi: "了", pinyin: "lè", pinyinNumbered: "le4", cedictStatus: "PINYIN_MISMATCH", cedictReadings: LIAO }),
          candidate({ index: 2, hanzi: "龘", pinyin: "dá", cedictStatus: "NOT_FOUND", cedictReadings: [], confidence: 0.4 }),
          candidate({ index: 3, hanzi: "你好", pinyin: "nǐhǎo", existingWordId: 9, alreadyInLesson: true }),
        ])}
      />,
    );

    expect(within(row("朋友")).getByText("✓ CEDICT")).toBeInTheDocument();
    expect(within(row("了")).getByText("pinyin differs")).toBeInTheDocument();
    expect(within(row("了")).getByRole("button", { name: "liǎo" })).toBeInTheDocument();
    expect(within(row("龘")).getByText("not in dictionary")).toBeInTheDocument();
    expect(within(row("龘")).getByText("low confidence")).toBeInTheDocument();
    expect(within(row("你好")).getByText("already known")).toBeInTheDocument();
    expect(within(row("你好")).getByText("already in lesson")).toBeInTheDocument();
    expect(within(row("你好")).getByRole("checkbox", { name: "include" })).not.toBeChecked();
    expect(screen.getByText("⚠ bottom of page cut off")).toBeInTheDocument();
  });

  it("blocks confirmation until a pinyin mismatch is resolved", () => {
    render(
      <ReviewScreen
        page={reviewPage([
          candidate({ hanzi: "了", pinyin: "lè", pinyinNumbered: "le4", cedictStatus: "PINYIN_MISMATCH", cedictReadings: LIAO }),
        ])}
      />,
    );
    expect(confirmButton()).toBeDisabled();
    expect(screen.getByText("1 word needs attention")).toBeInTheDocument();

    fireEvent.click(within(row("了")).getByRole("checkbox", { name: "keep my pinyin" }));
    expect(confirmButton()).toBeEnabled();

    fireEvent.click(within(row("了")).getByRole("checkbox", { name: "keep my pinyin" }));
    fireEvent.click(within(row("了")).getByRole("button", { name: "liǎo" }));
    expect(within(row("了")).getByText("✓ CEDICT")).toBeInTheDocument();
    expect(within(row("了")).getByLabelText("Pinyin")).toHaveValue("liǎo");
    expect(confirmButton()).toBeEnabled();
  });

  it("converts numbered input on blur and re-checks the reading", async () => {
    vi.mocked(api.checkReading).mockResolvedValue({
      pinyin: "xuéxí",
      pinyinNumbered: "xue2 xi2",
      cedictStatus: "MATCH",
      cedictReadings: [{ pinyin: "xuéxí", pinyinNumbered: "xue2 xi2", definitions: ["to learn"] }],
      error: null,
    });
    render(<ReviewScreen page={reviewPage([candidate({ hanzi: "学习", pinyin: "xue", pinyinNumbered: null, cedictStatus: "PINYIN_MISMATCH", pinyinError: "Pinyin 'xue' does not fit 2 syllable(s)" })])} />);
    expect(within(row("学习")).getByRole("alert")).toHaveTextContent("does not fit 2 syllable");

    const pinyin = within(row("学习")).getByLabelText("Pinyin");
    fireEvent.change(pinyin, { target: { value: "xue2xi2" } });
    await act(async () => fireEvent.blur(pinyin));

    expect(api.checkReading).toHaveBeenCalledWith("学习", "xuéxí");
    expect(pinyin).toHaveValue("xuéxí");
    expect(within(row("学习")).getByText("✓ CEDICT")).toBeInTheDocument();
    expect(confirmButton()).toBeEnabled();
  });

  it("confirms included rows only and reports the result", async () => {
    vi.mocked(api.confirmWords).mockResolvedValue({ created: 1, reused: 0, linked: 1, words: [] });
    render(
      <ReviewScreen
        page={reviewPage([
          candidate({ exampleSentence: "他是我的朋友。" }),
          candidate({ index: 1, hanzi: "你好", pinyin: "nǐhǎo", alreadyInLesson: true }),
        ])}
      />,
    );

    await act(async () => fireEvent.click(confirmButton()));

    expect(api.confirmWords).toHaveBeenCalledWith(7, {
      sourcePageId: 5,
      items: [
        {
          hanzi: "朋友",
          pinyin: "péngyou",
          meaningEn: "friend",
          meaningDe: "Freund",
          partOfSpeech: "n.",
          exampleSentence: "他是我的朋友。",
          acceptMismatch: false,
        },
      ],
    });
    expect(screen.getByRole("status")).toHaveTextContent("Confirmed: 1 new word, 0 already known, 1 added to the lesson");
    expect(within(row("朋友")).getByText("already in lesson")).toBeInTheDocument();
  });

  it("shows per-item errors from the server on the right rows", async () => {
    vi.mocked(api.confirmWords).mockRejectedValue(
      new api.ApiError({
        status: 400,
        title: "Invalid items",
        detail: "1 item(s) need attention",
        errors: [{ index: 1, message: "好: pinyin 'hào' differs from CC-CEDICT" }],
      }),
    );
    render(
      <ReviewScreen
        page={reviewPage([
          candidate({}),
          candidate({ index: 1, hanzi: "好", pinyin: "hǎo", alreadyInLesson: true }),
          candidate({ index: 2, hanzi: "老师", pinyin: "lǎoshī" }),
        ])}
      />,
    );

    await act(async () => fireEvent.click(confirmButton()));

    // item index 1 of the request is the third row ("好" is not included)
    expect(within(row("老师")).getByRole("alert")).toHaveTextContent("differs from CC-CEDICT");
    expect(within(row("朋友")).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("adds and deletes rows", async () => {
    vi.mocked(api.checkReading).mockResolvedValue({
      pinyin: "lǎoshī",
      pinyinNumbered: "lao3 shi1",
      cedictStatus: "MATCH",
      cedictReadings: [],
      error: null,
    });
    render(<ReviewScreen page={reviewPage([candidate({})])} />);

    fireEvent.click(screen.getByRole("button", { name: "Add word" }));
    const added = row("new word");
    fireEvent.change(within(added).getByLabelText("Hanzi"), { target: { value: "老师" } });
    fireEvent.change(within(row("老师")).getByLabelText("Pinyin"), { target: { value: "lao3shi1" } });
    await act(async () => fireEvent.blur(within(row("老师")).getByLabelText("Pinyin")));
    fireEvent.change(within(row("老师")).getByLabelText("Meaning (EN)"), { target: { value: "teacher" } });
    expect(confirmButton()).toHaveTextContent("Confirm selected (2)");
    expect(confirmButton()).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Delete 朋友" }));
    expect(screen.queryByRole("listitem", { name: "朋友" })).not.toBeInTheDocument();
    expect(confirmButton()).toHaveTextContent("Confirm selected (1)");
  });

  it("asks before re-running extraction of a confirmed page", async () => {
    vi.mocked(api.rerunExtraction).mockResolvedValue(page({ id: 5, lessonId: 7 }));
    render(<ReviewScreen page={reviewPage([candidate({})], { confirmed: true })} />);

    fireEvent.click(screen.getByRole("button", { name: "Re-run extraction" }));
    expect(api.rerunExtraction).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Re-run" })));

    expect(api.rerunExtraction).toHaveBeenCalledWith(5);
    expect(push).toHaveBeenCalledWith("/lessons/7");
  });
});
