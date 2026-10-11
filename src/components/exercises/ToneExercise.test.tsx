import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ToneExercise from "./ToneExercise";

const PROMPT = { hanzi: "朋友", syllables: ["peng", "you"] };
const tone = (syllable: string, label: string) =>
  within(screen.getByRole("group", { name: `Tone of ${syllable}` })).getByRole("button", { name: label });

describe("ToneExercise", () => {
  it("checks only when every syllable has a tone and previews the tone mark", () => {
    const onAnswer = vi.fn();
    render(<ToneExercise prompt={PROMPT} result={null} submitting={false} onAnswer={onAnswer} />);

    fireEvent.click(tone("peng", "2"));
    expect(screen.getByRole("button", { name: "Check" })).toBeDisabled();
    expect(screen.getByText("péng")).toBeInTheDocument();

    fireEvent.click(tone("you", "neutral"));
    fireEvent.click(screen.getByRole("button", { name: "Check" }));

    expect(onAnswer).toHaveBeenCalledWith([2, 5]);
  });

  it("marks each syllable right or wrong with the expected tone", () => {
    const { rerender } = render(<ToneExercise prompt={PROMPT} result={null} submitting={false} onAnswer={vi.fn()} />);
    fireEvent.click(tone("peng", "2"));
    fireEvent.click(tone("you", "3"));

    rerender(
      <ToneExercise
        prompt={PROMPT}
        result={{ correct: false, score: 0.5, expected: { tones: [2, 5] }, feedback: null, suggestedRating: 2 }}
        submitting={false}
        onAnswer={vi.fn()}
      />,
    );

    expect(within(screen.getByRole("listitem", { name: "Syllable peng" })).getByText("✓")).toBeInTheDocument();
    expect(within(screen.getByRole("listitem", { name: "Syllable you" })).getByText("✗ you (neutral)")).toBeInTheDocument();
    expect(tone("you", "1")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Check" })).not.toBeInTheDocument();
  });

  it("shows ü syllables with tone marks", () => {
    render(<ToneExercise prompt={{ hanzi: "绿", syllables: ["lü"] }} result={null} submitting={false} onAnswer={vi.fn()} />);

    fireEvent.click(tone("lü", "4"));

    expect(screen.getByText("lǜ")).toBeInTheDocument();
  });
});
