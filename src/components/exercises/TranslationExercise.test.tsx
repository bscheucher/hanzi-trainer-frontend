import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TranslationExercise from "./TranslationExercise";

vi.mock("@/components/handwriting/hanziLookup", () => ({ recognise: vi.fn().mockResolvedValue([]) }));

const PROMPT = { source: "Ich lerne mit meinem Freund Chinesisch.", sourceLang: "de" as const, hintWords: ["朋友", "学习"] };

describe("TranslationExercise", () => {
  it("shows the source and hint words and sends the trimmed text", () => {
    const onAnswer = vi.fn();
    render(<TranslationExercise prompt={PROMPT} result={null} submitting={false} onAnswer={onAnswer} />);

    expect(screen.getByText("Translate from German into Chinese")).toBeInTheDocument();
    expect(screen.getByText("朋友、学习")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check" })).toBeDisabled();

    fireEvent.change(screen.getByRole("textbox", { name: "Your translation" }), { target: { value: " 我跟朋友学中文 " } });
    fireEvent.click(screen.getByRole("button", { name: "Check" }));

    expect(onAnswer).toHaveBeenCalledWith("我跟朋友学中文");
  });

  it("shows the correction and the reference after grading", () => {
    const { rerender } = render(
      <TranslationExercise prompt={PROMPT} result={null} submitting={false} onAnswer={vi.fn()} />,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Your translation" }), { target: { value: "我朋友学中文" } });

    rerender(
      <TranslationExercise
        prompt={PROMPT}
        result={{
          correct: false,
          score: 0.6,
          expected: { reference: "我和我的朋友学习中文。", corrected: "我跟朋友学中文。" },
          feedback: "跟 is missing.",
          suggestedRating: 2,
        }}
        submitting={false}
        onAnswer={vi.fn()}
      />,
    );

    expect(screen.getByText("我朋友学中文")).toBeInTheDocument();
    expect(screen.getByText("我跟朋友学中文。")).toBeInTheDocument();
    expect(screen.getByText("我和我的朋友学习中文。")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
