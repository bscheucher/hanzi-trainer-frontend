import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as lookup from "./hanziLookup";
import HanziPad, { RECOGNISE_DELAY_MS } from "./HanziPad";

vi.mock("./hanziLookup", () => ({ recognise: vi.fn() }));

function Controlled({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return <HanziPad value={value} onChange={setValue} label="Answer" />;
}

function stroke(points: [number, number][]) {
  const pad = screen.getByRole("img", { name: "Drawing pad" });
  const [first, ...rest] = points;
  fireEvent.pointerDown(pad, { pointerId: 1, clientX: first[0], clientY: first[1] });
  rest.forEach(([x, y]) => fireEvent.pointerMove(pad, { pointerId: 1, clientX: x, clientY: y }));
  fireEvent.pointerUp(pad, { pointerId: 1 });
}

async function waitForRecognition() {
  await act(() => vi.advanceTimersByTimeAsync(RECOGNISE_DELAY_MS));
}

describe("HanziPad", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("recognises the strokes after a pause and appends the picked candidate", async () => {
    vi.mocked(lookup.recognise).mockResolvedValue(["朋", "明", "用"]);
    render(<Controlled initial="我" />);

    stroke([
      [10, 10],
      [10, 80],
    ]);
    stroke([
      [10, 10],
      [40, 10],
      [40, 80],
    ]);
    expect(lookup.recognise).not.toHaveBeenCalled();
    await waitForRecognition();

    expect(lookup.recognise).toHaveBeenCalledTimes(1);
    expect(vi.mocked(lookup.recognise).mock.calls[0][0]).toHaveLength(2);
    fireEvent.click(within(screen.getByRole("list", { name: "Candidates" })).getByRole("button", { name: "朋" }));

    expect(screen.getByRole("textbox", { name: "Answer" })).toHaveValue("我朋");
    expect(screen.queryByRole("button", { name: "明" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear" })).toBeDisabled();
  });

  it("undo removes the last stroke and recognises again", async () => {
    vi.mocked(lookup.recognise).mockResolvedValue(["十"]);
    render(<Controlled />);
    stroke([
      [0, 50],
      [100, 50],
    ]);
    stroke([
      [50, 0],
      [50, 100],
    ]);
    await waitForRecognition();

    fireEvent.click(screen.getByRole("button", { name: "Undo stroke" }));
    await waitForRecognition();

    expect(vi.mocked(lookup.recognise).mock.calls.at(-1)![0]).toHaveLength(1);
  });

  it("backspace removes the last character and typing works as usual", () => {
    render(<Controlled initial="朋友" />);

    fireEvent.click(screen.getByRole("button", { name: "Backspace" }));
    expect(screen.getByRole("textbox", { name: "Answer" })).toHaveValue("朋");

    fireEvent.change(screen.getByRole("textbox", { name: "Answer" }), { target: { value: "朋友们" } });
    expect(screen.getByRole("textbox", { name: "Answer" })).toHaveValue("朋友们");
  });

  it("says so when recognition cannot be loaded", async () => {
    vi.mocked(lookup.recognise).mockRejectedValue(new Error("404"));
    render(<Controlled />);

    stroke([
      [0, 0],
      [10, 10],
    ]);
    await waitForRecognition();

    expect(screen.getByRole("alert")).toHaveTextContent("could not be loaded");
  });
});
