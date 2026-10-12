import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import HanziQuiz from "./HanziQuiz";

interface QuizOptions {
  quizStartStrokeNum: number;
  showHintAfterMisses: number;
  onMistake(stroke: unknown): void;
  onCorrectStroke(stroke: { strokeNum: number }): void;
  onComplete(summary: { character: string; totalMistakes: number }): void;
}
interface FakeWriter {
  char: string;
  options: { onLoadCharDataError(): void };
  quizzes: QuizOptions[];
  quiz: ReturnType<typeof vi.fn>;
  showOutline: ReturnType<typeof vi.fn>;
  hideCharacter: ReturnType<typeof vi.fn>;
  animateCharacter: ReturnType<typeof vi.fn>;
  cancelQuiz: ReturnType<typeof vi.fn>;
  pauseAnimation: ReturnType<typeof vi.fn>;
  updateDimensions: ReturnType<typeof vi.fn>;
}

const { writers, create } = vi.hoisted(() => {
  const writers: FakeWriter[] = [];
  const create = vi.fn((_element: HTMLElement, char: string, options: FakeWriter["options"]) => {
    const writer: FakeWriter = {
      char,
      options,
      quizzes: [],
      quiz: vi.fn((quiz: QuizOptions) => {
        writer.quizzes.push(quiz);
        return Promise.resolve();
      }),
      showOutline: vi.fn(),
      hideCharacter: vi.fn(),
      animateCharacter: vi.fn((opts?: { onComplete?(): void }) => {
        opts?.onComplete?.();
        return Promise.resolve();
      }),
      cancelQuiz: vi.fn(),
      pauseAnimation: vi.fn(() => Promise.resolve()),
      updateDimensions: vi.fn(),
    };
    writers.push(writer);
    return writer;
  });
  return { writers, create };
});
vi.mock("hanzi-writer", () => ({ default: { create } }));

afterEach(() => {
  vi.clearAllMocks();
  writers.length = 0;
});

/** The quiz writer currently asking for {@code char} (not the small ones of the final animation). */
async function quizFor(char: string): Promise<FakeWriter> {
  let found: FakeWriter | undefined;
  await waitFor(() => {
    found = writers.find((w) => w.char === char && w.quizzes.length > 0);
    expect(found).toBeDefined();
  });
  return found!;
}

async function write(char: string, mistakes: number) {
  const writer = await quizFor(char);
  const quiz = writer.quizzes.at(-1)!;
  await act(async () => {
    for (let i = 0; i < mistakes; i++) quiz.onMistake({});
    quiz.onComplete({ character: char, totalMistakes: mistakes });
  });
}

describe("HanziQuiz", () => {
  it("quizzes each character in turn and reports mistakes per character after the final animation", async () => {
    const onComplete = vi.fn();
    render(<HanziQuiz hanzi="朋友" onComplete={onComplete} />);

    const first = await quizFor("朋");
    expect(first.quizzes[0]).toMatchObject({ quizStartStrokeNum: 0, showHintAfterMisses: 3 });
    expect(screen.queryByText("朋")).not.toBeInTheDocument();
    await write("朋", 2);
    expect(screen.getByText("朋")).toBeInTheDocument();
    expect(screen.queryByText("友")).not.toBeInTheDocument();
    await write("友", 0);

    await waitFor(() =>
      expect(onComplete).toHaveBeenCalledWith({
        strokeMistakes: [2, 0],
        hintsUsed: 0,
        skipped: false,
        durationMs: expect.any(Number),
      }),
    );
    expect(writers.filter((w) => w.animateCharacter.mock.calls.length > 0).map((w) => w.char)).toEqual(["朋", "友"]);
  });

  it("counts Hint and Show stroke order as hints and resumes after the animation", async () => {
    const onComplete = vi.fn();
    render(<HanziQuiz hanzi="学" onComplete={onComplete} />);
    const writer = await quizFor("学");

    fireEvent.click(screen.getByRole("button", { name: "Hint" }));
    expect(writer.showOutline).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Hint" })).toBeDisabled();

    act(() => writer.quizzes[0].onCorrectStroke({ strokeNum: 2 }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Show stroke order" })));
    expect(writer.cancelQuiz).toHaveBeenCalled();
    expect(writer.hideCharacter).toHaveBeenCalled();
    expect(writer.quizzes[1].quizStartStrokeNum).toBe(3);

    await write("学", 1);

    await waitFor(() => expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ strokeMistakes: [1], hintsUsed: 2 })));
  });

  it("keeps mistakes from before a stroke-order animation", async () => {
    const onComplete = vi.fn();
    render(<HanziQuiz hanzi="学" onComplete={onComplete} />);
    const writer = await quizFor("学");

    act(() => {
      writer.quizzes[0].onMistake({});
      writer.quizzes[0].onMistake({});
    });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Show stroke order" })));
    await act(async () => writer.quizzes[1].onComplete({ character: "学", totalMistakes: 0 }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ strokeMistakes: [2] })));
  });

  it("skips the whole word", async () => {
    const onComplete = vi.fn();
    render(<HanziQuiz hanzi="朋友" onComplete={onComplete} />);
    await write("朋", 0);
    await quizFor("友");

    fireEvent.click(screen.getByRole("button", { name: "Skip word" }));

    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ strokeMistakes: [0], skipped: true }));
  });

  it("lets the user judge a character without stroke data", async () => {
    create.mockImplementationOnce(((element: HTMLElement, char: string, options: FakeWriter["options"]) => {
      options.onLoadCharDataError();
      const writer = { char, options, quizzes: [], quiz: vi.fn(() => Promise.resolve()), cancelQuiz: vi.fn() };
      return writer;
    }) as never);
    const onComplete = vi.fn();
    render(<HanziQuiz hanzi="龘" onComplete={onComplete} />);

    expect(await screen.findByText(/no stroke data for/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "I got it wrong" }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ strokeMistakes: [4] })));
  });

  it("renders the writing area for touch and pen input", async () => {
    render(<HanziQuiz hanzi="学" onComplete={vi.fn()} />);
    await quizFor("学");

    expect(screen.getByRole("img", { name: "Writing area for character 1" })).toHaveClass("touch-none");
  });
});
