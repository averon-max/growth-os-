import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("production SERP Replay readiness mapping", () => {
  it("maps insufficient context to insufficient data without changing real FAIL", () => {
    const source = readFileSync(
      "src/lib/content/production-final-article-readiness-adapter-v1.ts",
      "utf8"
    );

    const mapping = source.split("function mapSerpReplayStatus(", 2)[1]
      ?.split("function allMustRequirementsResolved(", 1)[0];

    expect(mapping).toBeDefined();
    expect(mapping).toMatch(
      /rawStatus\s*===\s*"INSUFFICIENT_CONTEXT"[\s\S]*?return "INSUFFICIENT_DATA"/
    );
    expect(mapping).toMatch(/rawStatus\s*===\s*"FAIL"/);
    expect(mapping).toMatch(/return replay\s*\?\s*"FAIL"\s*:\s*"INSUFFICIENT_DATA"/);
  });
});
