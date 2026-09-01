import { describe, it, expect } from "vitest";
import { calculateScore } from "./scoring";
import type { SEOIssueResult } from "./rules";

function issue(type: string, severity: SEOIssueResult["severity"]): SEOIssueResult {
  return {
    type,
    severity,
    pageUrl: "https://example.com/",
    description: "",
    evidence: null,
    recommendation: "",
  };
}

describe("calculateScore", () => {
  it("returns a perfect score with no issues", () => {
    const score = calculateScore([]);
    expect(score).toEqual({
      overallScore: 100,
      technicalScore: 100,
      contentScore: 100,
      structureScore: 100,
      indexabilityScore: 100,
    });
  });

  it("gives the same severity the same point cost across different issue types", () => {
    // MISSING_META_DESCRIPTION (content) and MISSING_CANONICAL (indexability)
    // are both HIGH/MEDIUM in rules.ts — pick two same-severity issues in
    // different categories and confirm their penalty is identical.
    const a = calculateScore([issue("MISSING_META_DESCRIPTION", "HIGH")]);
    const b = calculateScore([issue("BROKEN_INTERNAL_LINK", "HIGH")]);
    // Both HIGH, so both categories should drop by the same 12 points.
    expect(100 - a.contentScore).toBe(100 - b.technicalScore);
  });

  it("caps repeated penalties of the same type at maxPenalty", () => {
    const manyThinContent = Array.from({ length: 20 }, () => issue("THIN_CONTENT", "MEDIUM"));
    const score = calculateScore(manyThinContent);
    // THIN_CONTENT maxPenalty is 30 — 20 x 5 = 100 would zero content out
    // without the cap; with the cap content score must not go below 70.
    expect(score.contentScore).toBe(70);
  });

  it("does not let unknown issue types affect any score", () => {
    const score = calculateScore([issue("SOME_FUTURE_TYPE", "CRITICAL")]);
    expect(score.overallScore).toBe(100);
  });

  it("weights categories according to WEIGHTS when only one category is affected", () => {
    // Single MEDIUM structure issue (MISSING_H1 is HIGH in rules.ts, use
    // MULTIPLE_H1 which is MEDIUM) costs 5 points in structure only.
    const score = calculateScore([issue("MULTIPLE_H1", "MEDIUM")]);
    expect(score.structureScore).toBe(95);
    expect(score.technicalScore).toBe(100);
    expect(score.contentScore).toBe(100);
    expect(score.indexabilityScore).toBe(100);
    // overall = 100*0.35 + 100*0.30 + 95*0.20 + 100*0.15 = 99
    expect(score.overallScore).toBe(99);
  });

  it("matches the real-world case reported by the user: 1 HIGH + 3 others on a single page", () => {
    const score = calculateScore([
      issue("MISSING_META_DESCRIPTION", "HIGH"),   // content: -12
      issue("THIN_CONTENT", "MEDIUM"),              // content: -5 (total content -17)
      issue("MISSING_CANONICAL", "MEDIUM"),         // indexability: -5
      issue("MISSING_SCHEMA", "LOW"),               // technical: -2
    ]);
    expect(score.technicalScore).toBe(98);
    expect(score.contentScore).toBe(83);
    expect(score.structureScore).toBe(100);
    expect(score.indexabilityScore).toBe(95);
    // overall = 98*0.35 + 83*0.30 + 100*0.20 + 95*0.15 = 93.15 -> 93
    expect(score.overallScore).toBe(93);
  });
});
