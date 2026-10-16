import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import type { GenerationJobDto } from "@/lib/types";
import GenerateExercises, { POLL_INTERVAL_MS } from "./GenerateExercises";

vi.mock("@/lib/api", async (original) => ({
  ...(await original<typeof import("@/lib/api")>()),
  generateExercises: vi.fn(),
  getGenerationJob: vi.fn(),
}));

const job = (overrides: Partial<GenerationJobDto> = {}): GenerationJobDto => ({
  id: 4,
  status: "RUNNING",
  created: 0,
  rejected: 0,
  error: null,
  ...overrides,
});

describe("GenerateExercises", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("starts a job with the chosen types and count and polls it until done", async () => {
    vi.mocked(api.generateExercises).mockResolvedValue(job());
    vi.mocked(api.getGenerationJob)
      .mockResolvedValueOnce(job({ created: 2, rejected: 1 }))
      .mockResolvedValueOnce(job({ status: "DONE", created: 5, rejected: 1 }));
    render(<GenerateExercises lessonId={7} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Word order" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Each" }), { target: { value: "3" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Generate" })));

    expect(api.generateExercises).toHaveBeenCalledWith(7, { types: ["FILL_BLANK", "TRANSLATION"], count: 3 });
    expect(screen.getByRole("button", { name: "Generating…" })).toBeDisabled();

    await act(() => vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS));
    expect(screen.getByRole("status")).toHaveTextContent("Generating… 2 created, 1 rejected so far.");
    await act(() => vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS));
    expect(screen.getByRole("status")).toHaveTextContent("Done: 5 created, 1 rejected");

    await act(() => vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3));
    expect(api.getGenerationJob).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled();
  });

  it("shows a failed job's error", async () => {
    vi.mocked(api.generateExercises).mockResolvedValue(job());
    vi.mocked(api.getGenerationJob).mockResolvedValue(job({ status: "FAILED", created: 1, error: "model overloaded" }));
    render(<GenerateExercises lessonId={7} />);

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Generate" })));
    await act(() => vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS));

    expect(screen.getByRole("status")).toHaveTextContent("Failed after 1 created, 0 rejected: model overloaded");
  });

  it("shows why a job could not start", async () => {
    vi.mocked(api.generateExercises).mockRejectedValue(
      new ApiError({ status: 503, title: "Service Unavailable", detail: "needs ANTHROPIC_API_KEY" }),
    );
    render(<GenerateExercises lessonId={7} />);

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Generate" })));

    expect(screen.getByRole("alert")).toHaveTextContent("needs ANTHROPIC_API_KEY");
  });
});
