import { describe, expect, it } from "vitest";
import { tryRecoverMissingKeywordV1 } from "./rank-ready-keyword-recovery-v1";

const finding = (keyword: string) => [{
  code: "RANK_READY_PLANNED_KEYWORD_MISSING",
  message: `Production-planned keyword "${keyword}" is missing from reader-facing article prose.`,
}];

const repair = (
  markdown: string,
  keyword: string,
  maxWords?: number
) => tryRecoverMissingKeywordV1({
  markdown,
  findings: finding(keyword),
  maxWords,
});

describe("safe production keyword recovery", () => {
  it("normalizes an existing hyphenated keyword", () => {
    const text =
      "Compare 3-bureau credit monitoring options carefully.";

    expect(
      repair(text, "3 bureau credit monitoring")
    ).toBe(
      "Compare 3 bureau credit monitoring options carefully."
    );
  });

  it("does not invent a missing concept", () => {
    const text =
      "Credit monitoring helps readers review changes.";

    expect(
      repair(text, "3 bureau credit monitoring")
    ).toBeNull();
  });

  it("does not mutate a heading-only occurrence", () => {
    const text =
      "## 3-bureau credit monitoring\n\nReview the terms.";

    expect(
      repair(text, "3 bureau credit monitoring")
    ).toBeNull();
  });

  it("does not ignore additional blocking findings", () => {
    expect(tryRecoverMissingKeywordV1({
      markdown: "Compare 3-bureau credit monitoring.",
      findings: [
        ...finding("3 bureau credit monitoring"),
        { code: "EVIDENCE_FAILURE", message: "Unsupported" },
      ],
    })).toBeNull();
  });

  it("respects a word limit", () => {
    expect(
      repair(
        "Compare 3-bureau credit monitoring options.",
        "3 bureau credit monitoring",
        2
      )
    ).toBeNull();
  });

  it("does not duplicate the keyword on replay", () => {
    const initial =
      "Compare 3-bureau credit monitoring options.";

    const first = repair(
      initial,
      "3 bureau credit monitoring"
    );

    expect(first).not.toBeNull();
    expect(
      repair(first!, "3 bureau credit monitoring")
    ).toBeNull();
  });
});
