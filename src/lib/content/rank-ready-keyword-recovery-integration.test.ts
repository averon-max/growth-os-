import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tryRecoverMissingKeywordV1 } from "./rank-ready-keyword-recovery-v1";

const production = readFileSync(
  join(__dirname, "master-article-critic-repair-execution.ts"),
  "utf8"
);

const finding = (keyword: string) => [{
  code: "RANK_READY_PLANNED_KEYWORD_MISSING",
  message:
    `Production-planned keyword "${keyword}" is missing from reader-facing article prose.`,
}];

describe("production keyword recovery integration", () => {
  it("uses the deterministic helper in the existing production executor", () => {
    expect(production).toContain("tryRecoverMissingKeywordV1({");
    expect(production).toContain("verifyGeneratedSectionOnlyV1({");
    expect(production).toContain("executeMasterArticleCriticsV1({");
  });

  it("preserves full critic replay after targeted section verification", () => {
    expect(
      production.indexOf("verifyGeneratedSectionOnlyV1({")
    ).toBeLessThan(
      production.indexOf("executeMasterArticleCriticsV1({")
    );
  });

  it("recovers equivalent spelling without creating content", () => {
    const article =
      "Compare 3-bureau credit monitoring services carefully.";

    const result = tryRecoverMissingKeywordV1({
      markdown: article,
      findings: finding("3 bureau credit monitoring"),
    });

    expect(result).toBe(
      "Compare 3 bureau credit monitoring services carefully."
    );
  });

  it("does not fabricate missing keywords", () => {
    const article =
      "Credit monitoring helps readers understand changes.";

    expect(tryRecoverMissingKeywordV1({
      markdown: article,
      findings: finding("3 bureau credit monitoring"),
    })).toBeNull();
  });

  it("does not bypass independent blocking findings", () => {
    expect(tryRecoverMissingKeywordV1({
      markdown: "Compare 3-bureau credit monitoring.",
      findings: [
        ...finding("3 bureau credit monitoring"),
        {
          code: "UNSUPPORTED_MATERIAL_CLAIM",
          message: "Claim has no verified evidence",
        },
      ],
    })).toBeNull();
  });

  it("keeps existing heading structure", () => {
    const article =
      "## Choosing a Service\n\nCompare 3-bureau credit monitoring.";

    const result = tryRecoverMissingKeywordV1({
      markdown: article,
      findings: finding("3 bureau credit monitoring"),
    });

    expect(result?.match(/^## /gm)?.length).toBe(1);
  });
});
