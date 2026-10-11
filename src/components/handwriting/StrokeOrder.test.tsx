import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import StrokeOrder from "./StrokeOrder";

const { create, loop, pause } = vi.hoisted(() => {
  const loop = vi.fn();
  const pause = vi.fn();
  return { loop, pause, create: vi.fn(() => ({ loopCharacterAnimation: loop, pauseAnimation: pause })) };
});
vi.mock("hanzi-writer", () => ({ default: { create } }));

afterEach(() => vi.clearAllMocks());

describe("StrokeOrder", () => {
  it("animates each Chinese character in its own box", async () => {
    render(<StrokeOrder hanzi="学习" />);

    await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
    expect(create.mock.calls.map((call) => (call as unknown[])[1])).toEqual(["学", "习"]);
    expect(loop).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("img", { name: "Stroke order of 学" })).toBeInTheDocument();
  });

  it("shows Latin letters and separators as text without animation", async () => {
    render(<StrokeOrder hanzi="AA制" />);

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0]).toContain("制");
    expect(screen.getAllByText("A")).toHaveLength(2);
  });

  it("falls back to the plain character when stroke data cannot be loaded", async () => {
    create.mockImplementationOnce(((_element: HTMLElement, _char: string, options: { onLoadCharDataError(): void }) => {
      options.onLoadCharDataError();
      return { loopCharacterAnimation: loop, pauseAnimation: pause };
    }) as never);

    render(<StrokeOrder hanzi="龘" />);

    expect(await screen.findByText("no stroke data for 龘")).toBeInTheDocument();
  });

  it("stops the animation when unmounted", async () => {
    const { unmount } = render(<StrokeOrder hanzi="学" />);
    await waitFor(() => expect(create).toHaveBeenCalled());

    unmount();

    expect(pause).toHaveBeenCalled();
  });
});
