import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MeaningToHanziPrompt } from "@/lib/types";
import MeaningToHanziExercise from "./MeaningToHanziExercise";

vi.mock("@/components/handwriting/HanziQuiz", () => ({
  default: ({ onComplete }: { onComplete(result: object): void }) => (
    <button onClick={() => onComplete({ strokeMistakes: [0, 5], hintsUsed: 1, skipped: false, durationMs: 4200 })}>
      write
    </button>
  ),
}));

const PROMPT: MeaningToHanziPrompt = {
  hanzi: "朋友",
  meaningEn: "friend",
  meaningDe: "Freund",
  pinyin: "péngyou",
  characterCount: 2,
};

describe("MeaningToHanziExercise", () => {
  it("shows meanings and pinyin but not the word until it is written", () => {
    render(<MeaningToHanziExercise prompt={PROMPT} result={null} submitting={false} onAnswer={vi.fn()} />);

    expect(screen.getByText("friend")).toBeInTheDocument();
    expect(screen.getByText("Freund")).toBeInTheDocument();
    expect(screen.getByText("péngyou")).toBeInTheDocument();
    expect(screen.getByText("Write the word (2 characters)")).toBeInTheDocument();
    expect(screen.queryByText("朋友")).not.toBeInTheDocument();
  });

  it("sends the quiz result with the word and the quiz's own duration, and can send it again", () => {
    const onAnswer = vi.fn();
    render(<MeaningToHanziExercise prompt={PROMPT} result={null} submitting={false} onAnswer={onAnswer} />);

    fireEvent.click(screen.getByRole("button", { name: "write" }));

    const response = { hanzi: "朋友", strokeMistakes: [0, 5], hintsUsed: 1, skipped: false };
    expect(onAnswer).toHaveBeenCalledWith(response, 4200);
    expect(screen.getByLabelText("Answer")).toHaveTextContent("朋友");

    fireEvent.click(screen.getByRole("button", { name: "Send again" }));
    expect(onAnswer).toHaveBeenCalledTimes(2);
  });
});
