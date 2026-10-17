import { describe, it, expect } from "vitest";
import type { ContentStrategy } from "./types";
import { strategyPrompt } from "./content-strategy-prompt-v1";

function sample(secondary: string[]): ContentStrategy {
  return {
    searchIntent: "INFORMATIONAL",
    primary: { keyword: "credit monitoring" },
    secondary: secondary.map(keyword => ({ keyword })),
    action: { type: "CREATE" },
  } as unknown as ContentStrategy;
}

describe("content strategy prompt extraction", () => {
  it("preserves primary and approved secondaries without inventing heading quotas", () => {
    const result = strategyPrompt(sample(["credit monitoring alerts", "credit report checks"]));
    expect(result).toContain("Primary keyword: credit monitoring");
    expect(result).toContain("Secondary keywords: credit monitoring alerts, credit report checks");
    expect(result).toContain("There is NO target number of H2 or H3 headings.");
    expect(result).toContain("Do not invent facts, statistics");
    expect(result).not.toContain("undefined");
  });
  it("omits empty secondary line and remains deterministic", () => {
    const input = sample([]);
    const first = strategyPrompt(input);
    const second = strategyPrompt(input);
    expect(first).toBe(second);
    expect(first).not.toContain("Secondary keywords:");
    expect(first).toContain("Page decision: CREATE");
  });
});
