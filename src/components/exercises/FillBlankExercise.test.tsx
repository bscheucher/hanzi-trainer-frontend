import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FillBlankExercise from "./FillBlankExercise";

const PROMPT = {
  sentence: "我和我的___去学校。",
  translationEn: "I go to school with my friend.",
  options: ["老师", "朋友", "学生", "妈妈"],
};

describe("FillBlankExercise", () => {
  it("answers with a click or keys 1–4", () => {
    const onAnswer = vi.fn();
    render(<FillBlankExercise prompt={PROMPT} result={null} selected={null} onAnswer={onAnswer} />);

    fireEvent.keyDown(window, { key: "2" });
    fireEvent.click(screen.getByRole("button", { name: /学生/ }));

    expect(onAnswer).toHaveBeenNthCalledWith(1, "朋友");
    expect(onAnswer).toHaveBeenNthCalledWith(2, "学生");
    expect(screen.getByText("I go to school with my friend.")).toBeInTheDocument();
  });

  it("fills the blank with the correct word once graded and locks the options", () => {
    render(
      <FillBlankExercise
        prompt={PROMPT}
        selected="老师"
        result={{
          correct: false,
          score: 0,
          expected: { correct: "朋友", fullSentence: "我和我的朋友去学校。" },
          feedback: null,
          suggestedRating: 1,
        }}
        onAnswer={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Sentence")).toHaveTextContent("我和我的朋友去学校。");
    expect(screen.getByRole("button", { name: /老师/ })).toBeDisabled();
  });
});
