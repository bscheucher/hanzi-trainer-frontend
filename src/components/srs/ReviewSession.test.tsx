import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "@/lib/api";
import type { AnswerResult, ReviewItemDto } from "@/lib/types";
import ReviewSession from "./ReviewSession";

vi.mock("@/lib/api", async (original) => ({
  ...(await original<typeof import("@/lib/api")>()),
  getDueReviews: vi.fn(),
  answerReview: vi.fn(),
  rateReview: vi.fn(),
}));

afterEach(() => vi.clearAllMocks());

const PREVIEWS = { "1": "PT1M", "2": "PT5M30S", "3": "PT10M", "4": "P8D" } as const;
const FRIEND: ReviewItemDto = {
  cardId: 21,
  cardType: "RECOGNITION",
  wordId: 1,
  exercise: {
    id: null,
    type: "HANZI_TO_MEANING",
    wordIds: [1],
    prompt: { hanzi: "朋友", options: ["teacher", "friend", "mother", "Beijing"] },
  },
  previewIntervals: PREVIEWS,
};
const FILL_BLANK: ReviewItemDto = {
  cardId: 22,
  cardType: "RECOGNITION",
  wordId: 2,
  exercise: {
    id: 40,
    type: "FILL_BLANK",
    wordIds: [2],
    prompt: { sentence: "我___中文。", translationEn: "I study Chinese.", options: ["学习", "朋友", "老师", "北京"] },
  },
  previewIntervals: PREVIEWS,
};

function result(overrides: Partial<AnswerResult> = {}): AnswerResult {
  return { correct: true, score: 1, expected: { correct: "friend" }, feedback: null, suggestedRating: 4, ...overrides };
}

async function renderSession() {
  await act(async () => {
    render(<ReviewSession />);
  });
}

describe("ReviewSession", () => {
  it("grades, rates with the suggestion and refetches until nothing is due", async () => {
    vi.mocked(api.getDueReviews).mockResolvedValueOnce([FRIEND]).mockResolvedValueOnce([]);
    vi.mocked(api.answerReview).mockResolvedValue(result());
    vi.mocked(api.rateReview).mockResolvedValue({} as never);
    await renderSession();

    await act(async () => fireEvent.click(screen.getByRole("button", { name: /friend/ })));
    expect(api.answerReview).toHaveBeenCalledWith(21, expect.objectContaining({ response: { selected: "friend" } }));
    expect(screen.getByRole("button", { name: "Easy (suggested), 8d" })).toBeInTheDocument();

    await act(async () => fireEvent.keyDown(window, { key: "Enter" }));

    expect(api.rateReview).toHaveBeenCalledWith(21, 4);
    expect(api.getDueReviews).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("status")).toHaveTextContent("1 card reviewed");
  });

  it("sends the stored exercise id and lets the user override the suggestion", async () => {
    vi.mocked(api.getDueReviews).mockResolvedValueOnce([FILL_BLANK]).mockResolvedValueOnce([]);
    vi.mocked(api.answerReview).mockResolvedValue(result({ correct: false, score: 0, suggestedRating: 1 }));
    vi.mocked(api.rateReview).mockResolvedValue({} as never);
    await renderSession();

    await act(async () => fireEvent.click(screen.getByRole("button", { name: /朋友/ })));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Hard/ })));

    expect(api.answerReview).toHaveBeenCalledWith(22, expect.objectContaining({ exerciseId: 40 }));
    expect(api.rateReview).toHaveBeenCalledWith(22, 2);
  });

  it("moves on when the card was already rated (409)", async () => {
    vi.mocked(api.getDueReviews).mockResolvedValueOnce([FRIEND, FILL_BLANK]);
    vi.mocked(api.answerReview).mockResolvedValue(result());
    vi.mocked(api.rateReview).mockRejectedValue(new api.ApiError({ status: 409, detail: "rated" }));
    await renderSession();

    await act(async () => fireEvent.click(screen.getByRole("button", { name: /friend/ })));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Good/ })));

    expect(screen.getByText("I study Chinese.")).toBeInTheDocument(); // the next card
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("says so when nothing is due", async () => {
    vi.mocked(api.getDueReviews).mockResolvedValue([]);
    await renderSession();

    expect(screen.getByRole("heading", { name: "Nothing due" })).toBeInTheDocument();
  });
});
