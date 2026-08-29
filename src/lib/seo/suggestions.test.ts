import { describe, it, expect } from "vitest";
import { generateSuggestion } from "./suggestions";

describe("generateSuggestion", () => {
  it("suggests a title for MISSING_TITLE", () => {
    const result = generateSuggestion({
      type: "MISSING_TITLE",
      severity: "HIGH",
      pageUrl: "/blog/post",
      description: "Page has no title tag",
      recommendation: "Add a descriptive title under 60 characters",
    });
    expect(result?.field).toBe("title");
    expect(result?.suggestedValue.length).toBeLessThanOrEqual(60);
  });

  it("suggests a meta description for MISSING_META_DESCRIPTION", () => {
    const result = generateSuggestion({
      type: "MISSING_META_DESCRIPTION",
      severity: "MEDIUM",
      pageUrl: "/blog/post",
      description: "Page has no meta description",
      recommendation: "Add a meta description under 155 characters",
    });
    expect(result?.field).toBe("metaDescription");
  });

  it("returns null for issue types without a text suggestion", () => {
    const result = generateSuggestion({
      type: "BROKEN_LINK",
      severity: "HIGH",
      pageUrl: "/blog/post",
      description: "Link returns 404",
      recommendation: "Fix or remove the broken link",
    });
    expect(result).toBeNull();
  });
});
