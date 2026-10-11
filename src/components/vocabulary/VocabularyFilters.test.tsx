import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import VocabularyFilters from "./VocabularyFilters";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

afterEach(() => vi.clearAllMocks());

const LESSONS = [
  { id: 7, label: "Lesson 1" },
  { id: 8, label: "Lesson 2 你好" },
];

describe("VocabularyFilters", () => {
  it("searches with the typed text and keeps the lesson filter", () => {
    render(<VocabularyFilters q="" lessonId={8} lessons={LESSONS} />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "xuexi" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(push).toHaveBeenCalledWith("/vocabulary?q=xuexi&lessonId=8");
  });

  it("applies a lesson as soon as it is picked and resets to page 1", () => {
    render(<VocabularyFilters q="friend" lessons={LESSONS} />);

    fireEvent.change(screen.getByRole("combobox", { name: "Lesson" }), { target: { value: "7" } });

    expect(push).toHaveBeenCalledWith("/vocabulary?q=friend&lessonId=7");
  });

  it("clears the lesson filter with All lessons", () => {
    render(<VocabularyFilters q="" lessonId={7} lessons={LESSONS} />);

    fireEvent.change(screen.getByRole("combobox", { name: "Lesson" }), { target: { value: "" } });

    expect(push).toHaveBeenCalledWith("/vocabulary");
  });
});
