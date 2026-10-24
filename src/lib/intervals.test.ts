import { describe, expect, it } from "vitest";
import { durationSeconds, formatInterval } from "./intervals";

describe("intervals", () => {
  it("parses the durations the backend writes", () => {
    expect(durationSeconds("PT1M")).toBe(60);
    expect(durationSeconds("PT5M30S")).toBe(330);
    expect(durationSeconds("P3D")).toBe(259_200);
    expect(durationSeconds("PT2H")).toBe(7_200);
    expect(durationSeconds("soon")).toBeNaN();
    expect(durationSeconds("P")).toBeNaN();
  });

  it("labels learning steps in minutes and reviews in days, months and years", () => {
    expect(formatInterval("PT1M")).toBe("<1m");
    expect(formatInterval("PT5M30S")).toBe("<6m");
    expect(formatInterval("PT10M")).toBe("<10m");
    expect(formatInterval("PT2H")).toBe("<2h");
    expect(formatInterval("P1D")).toBe("1d");
    expect(formatInterval("P8D")).toBe("8d");
    expect(formatInterval("P66D")).toBe("2.2mo");
    expect(formatInterval("P397D")).toBe("1.1y");
  });

  it("shows anything else unchanged", () => {
    expect(formatInterval("later")).toBe("later");
  });
});
