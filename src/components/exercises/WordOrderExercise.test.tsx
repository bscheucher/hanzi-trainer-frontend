import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WordOrderExercise from "./WordOrderExercise";

const PROMPT = { tokens: ["学校", "我", "去", "我"], translationEn: "I, I go to school." };
const words = () => within(screen.getByRole("list", { name: "Words" }));
const sentence = () => within(screen.getByRole("list", { name: "Your sentence" }));

describe("WordOrderExercise", () => {
  it("builds the order by tapping words and checks it when all are placed", () => {
    const onAnswer = vi.fn();
    render(<WordOrderExercise prompt={PROMPT} result={null} submitting={false} onAnswer={onAnswer} />);

    fireEvent.click(words().getAllByRole("button", { name: "我" })[0]);
    fireEvent.click(words().getByRole("button", { name: "去" }));
    expect(screen.getByRole("button", { name: "Check" })).toBeDisabled();
    fireEvent.click(words().getByRole("button", { name: "学校" }));
    fireEvent.click(words().getByRole("button", { name: "我" }));
    fireEvent.click(screen.getByRole("button", { name: "Check" }));

    expect(onAnswer).toHaveBeenCalledWith(["我", "去", "学校", "我"]);
  });

  it("tapping a placed word puts it back", () => {
    render(<WordOrderExercise prompt={PROMPT} result={null} submitting={false} onAnswer={vi.fn()} />);

    fireEvent.click(words().getByRole("button", { name: "学校" }));
    fireEvent.click(sentence().getByRole("button", { name: "学校" }));

    expect(sentence().queryAllByRole("button")).toHaveLength(0);
    expect(words().getAllByRole("button")).toHaveLength(4);
  });

  it("locks the words once graded", () => {
    render(
      <WordOrderExercise
        prompt={PROMPT}
        result={{ correct: true, score: 1, expected: { accepted: [] }, feedback: null, suggestedRating: 3 }}
        submitting={false}
        onAnswer={vi.fn()}
      />,
    );

    expect(words().getByRole("button", { name: "学校" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Check" })).not.toBeInTheDocument();
  });
});
