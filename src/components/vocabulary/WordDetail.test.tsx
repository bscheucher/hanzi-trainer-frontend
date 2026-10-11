import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "@/lib/api";
import type { WordDto } from "@/lib/types";
import DeleteWordButton from "./DeleteWordButton";
import UnlinkButton from "./UnlinkButton";
import WordEditor from "./WordEditor";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock("@/lib/api", async (original) => ({
  ...(await original<typeof import("@/lib/api")>()),
  updateWord: vi.fn(),
  deleteWord: vi.fn(),
  unlinkWord: vi.fn(),
}));

afterEach(() => vi.clearAllMocks());

const XUEXI: WordDto = {
  id: 5,
  hanzi: "学习",
  pinyin: "xuéxí",
  pinyinNumbered: "xue2 xi2",
  meaningEn: "to study",
  meaningDe: "lernen",
  partOfSpeech: "v.",
  verified: true,
};

describe("WordEditor", () => {
  it("saves edited meanings and refreshes the page", async () => {
    vi.mocked(api.updateWord).mockResolvedValue({ ...XUEXI, meaningEn: "to learn", meaningDe: null });
    render(<WordEditor word={XUEXI} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByRole("textbox", { name: "English" }), { target: { value: "to learn" } });
    fireEvent.change(screen.getByRole("textbox", { name: "German" }), { target: { value: "" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));

    expect(api.updateWord).toHaveBeenCalledWith(5, { meaningEn: "to learn", meaningDe: "", partOfSpeech: "v." });
    expect(refresh).toHaveBeenCalled();
    expect(screen.queryByRole("form", { name: "Edit meaning" })).not.toBeInTheDocument();
  });

  it("does not allow an empty English meaning", () => {
    render(<WordEditor word={XUEXI} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByRole("textbox", { name: "English" }), { target: { value: "  " } });

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("cancel restores the saved values", () => {
    render(<WordEditor word={XUEXI} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByRole("textbox", { name: "English" }), { target: { value: "oops" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(screen.getByRole("textbox", { name: "English" })).toHaveValue("to study");
  });

  it("shows server errors", async () => {
    vi.mocked(api.updateWord).mockRejectedValue(new api.ApiError({ status: 400, title: "Bad Request", detail: "meaningEn: must not be blank" }));
    render(<WordEditor word={XUEXI} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));

    expect(screen.getByRole("alert")).toHaveTextContent("meaningEn: must not be blank");
  });
});

describe("DeleteWordButton", () => {
  it("asks first, then deletes and goes back to the vocabulary", async () => {
    vi.mocked(api.deleteWord).mockResolvedValue(undefined);
    render(<DeleteWordButton wordId={5} hanzi="学习" />);

    fireEvent.click(screen.getByRole("button", { name: "Delete word" }));
    expect(api.deleteWord).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Delete" })));

    expect(api.deleteWord).toHaveBeenCalledWith(5);
    expect(push).toHaveBeenCalledWith("/vocabulary");
  });
});

describe("UnlinkButton", () => {
  it("removes the word from the lesson and refreshes", async () => {
    vi.mocked(api.unlinkWord).mockResolvedValue(undefined);
    render(<UnlinkButton lessonId={7} lessonNo={1} wordId={5} />);

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Remove from lesson 1" })));

    expect(api.unlinkWord).toHaveBeenCalledWith(7, 5);
    expect(refresh).toHaveBeenCalled();
  });
});
