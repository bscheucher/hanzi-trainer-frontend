import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "@/lib/api";
import type { AnswerResult, ExerciseDto } from "@/lib/types";
import PracticePlayer from "./PracticePlayer";

vi.mock("@/lib/api", async (original) => ({
  ...(await original<typeof import("@/lib/api")>()),
  createPracticeSession: vi.fn(),
  answerExercise: vi.fn(),
}));

afterEach(() => vi.clearAllMocks());

const MEANING: ExerciseDto = {
  id: 11,
  type: "HANZI_TO_MEANING",
  wordIds: [1],
  prompt: { hanzi: "朋友", options: ["teacher", "friend", "mother", "Beijing"] },
};
const TONE: ExerciseDto = {
  id: 12,
  type: "TONE",
  wordIds: [2],
  prompt: { hanzi: "学习", syllables: ["xue", "xi"] },
};

function result(overrides: Partial<AnswerResult>): AnswerResult {
  return { correct: true, score: 1, expected: {}, feedback: null, suggestedRating: 3, ...overrides };
}

async function start() {
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Start" })));
}

describe("PracticePlayer", () => {
  it("starts a session with the chosen types and size", async () => {
    vi.mocked(api.createPracticeSession).mockResolvedValue({ exercises: [MEANING] });
    render(<PracticePlayer lessonId={7} lessonUrl="/lessons/7" />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Tones" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Session size" }), { target: { value: "5" } });
    await start();

    expect(api.createPracticeSession).toHaveBeenCalledWith({ lessonId: 7, types: ["HANZI_TO_MEANING"], size: 5 });
    expect(screen.getByText("朋友")).toBeInTheDocument();
  });

  it("needs at least one exercise type", () => {
    render(<PracticePlayer lessonId={7} lessonUrl="/lessons/7" />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Meaning" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Tones" }));

    expect(screen.getByRole("button", { name: "Start" })).toBeDisabled();
  });

  it("explains an empty session instead of starting it", async () => {
    vi.mocked(api.createPracticeSession).mockResolvedValue({ exercises: [] });
    render(<PracticePlayer lessonId={7} lessonUrl="/lessons/7" />);

    await start();

    expect(screen.getByRole("alert")).toHaveTextContent("No exercises for these settings");
  });

  it("runs a session: answer, see the correct answer and feedback, next, summary", async () => {
    vi.mocked(api.createPracticeSession).mockResolvedValue({ exercises: [MEANING, TONE] });
    vi.mocked(api.answerExercise)
      .mockResolvedValueOnce(result({ correct: false, score: 0, expected: { correct: "friend" }, feedback: "朋友 means “friend”.", suggestedRating: 1 }))
      .mockResolvedValueOnce(result({ expected: { tones: [2, 2] } }));
    render(<PracticePlayer lessonId={7} lessonUrl="/lessons/7" />);
    await start();

    await act(async () => fireEvent.click(screen.getByRole("button", { name: /teacher/ })));

    expect(api.answerExercise).toHaveBeenCalledWith(11, { response: { selected: "teacher" }, durationMs: expect.any(Number) });
    expect(screen.getByRole("status")).toHaveTextContent("Not quite");
    expect(screen.getByRole("status")).toHaveTextContent("朋友 means “friend”.");
    expect(screen.getByRole("button", { name: /friend/ })).toHaveClass("border-emerald-600");
    expect(screen.getByRole("button", { name: /teacher/ })).toHaveClass("border-accent");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(within(screen.getByRole("group", { name: "Tone of xue" })).getByRole("button", { name: "2" }));
    fireEvent.click(within(screen.getByRole("group", { name: "Tone of xi" })).getByRole("button", { name: "2" }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Check" })));

    expect(api.answerExercise).toHaveBeenLastCalledWith(12, { response: { tones: [2, 2] }, durationMs: expect.any(Number) });
    expect(screen.getByRole("status")).toHaveTextContent("Correct");

    fireEvent.click(screen.getByRole("button", { name: "Finish" }));

    expect(screen.getByRole("heading", { name: "Session finished" })).toBeInTheDocument();
    expect(screen.getByText("1 of 2 correct (50 %)")).toBeInTheDocument();
    expect(within(screen.getByRole("list")).getByText("friend")).toBeInTheDocument();
  });

  it("chooses a meaning with the number keys", async () => {
    vi.mocked(api.createPracticeSession).mockResolvedValue({ exercises: [MEANING] });
    vi.mocked(api.answerExercise).mockResolvedValue(result({ expected: { correct: "friend" } }));
    render(<PracticePlayer lessonId={7} lessonUrl="/lessons/7" />);
    await start();

    await act(async () => fireEvent.keyDown(window, { key: "2" }));

    expect(api.answerExercise).toHaveBeenCalledWith(11, { response: { selected: "friend" }, durationMs: expect.any(Number) });
  });

  it("can end a session early", async () => {
    vi.mocked(api.createPracticeSession).mockResolvedValue({ exercises: [MEANING, TONE] });
    render(<PracticePlayer lessonId={7} lessonUrl="/lessons/7" />);
    await start();

    fireEvent.click(screen.getByRole("button", { name: "End session" }));

    expect(screen.getByText("0 of 0 correct")).toBeInTheDocument();
  });

  it("lists missed tone exercises with the tone-marked syllables", async () => {
    vi.mocked(api.createPracticeSession).mockResolvedValue({ exercises: [TONE] });
    vi.mocked(api.answerExercise).mockResolvedValue(
      result({ correct: false, score: 0.5, expected: { tones: [2, 2] }, feedback: "xi: tone 2, not tone 4." }),
    );
    render(<PracticePlayer lessonId={7} lessonUrl="/lessons/7" />);
    await start();
    fireEvent.click(within(screen.getByRole("group", { name: "Tone of xue" })).getByRole("button", { name: "2" }));
    fireEvent.click(within(screen.getByRole("group", { name: "Tone of xi" })).getByRole("button", { name: "4" }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Check" })));
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));

    expect(within(screen.getByRole("list")).getByText("xué xí")).toBeInTheDocument();
  });
});
