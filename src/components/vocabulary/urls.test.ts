import { describe, expect, it } from "vitest";
import { vocabularyUrl } from "./urls";

describe("vocabularyUrl", () => {
  it("leaves out empty filters and page 1", () => {
    expect(vocabularyUrl({})).toBe("/vocabulary");
    expect(vocabularyUrl({ q: "  ", page: 1 })).toBe("/vocabulary");
  });

  it("keeps search, lesson and later pages", () => {
    expect(vocabularyUrl({ q: " xué xí ", lessonId: 7, page: 3 })).toBe("/vocabulary?q=xu%C3%A9+x%C3%AD&lessonId=7&page=3");
  });
});
