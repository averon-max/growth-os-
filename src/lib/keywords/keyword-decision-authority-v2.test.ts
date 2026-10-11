import { describe, expect, it } from "vitest";
import { resolveApprovedKeywordPrimaryV2 } from "./keyword-decision-authority-v2";

const valid = {
  version: "KEYWORD_INTELLIGENCE_RESEARCH_V2",
  websiteId: "site-1",
  decision: { status: "SELECTED", selectedClusterId: "cluster-123" },
  clusters: [{ id: "cluster-123", primary: { keyword: "credit monitoring vs credit freeze" } }],
};

describe("approved keyword authority", () => {
  it("resolves the stored selected cluster to the immutable keyword", () => {
    expect(resolveApprovedKeywordPrimaryV2(valid, "site-1")).toBe("credit monitoring vs credit freeze");
  });
  it("does not allow a different website to reuse the stored decision", () => {
    expect(() => resolveApprovedKeywordPrimaryV2(valid, "site-2")).toThrow("KEYWORD_V2_SNAPSHOT_MISMATCH");
  });
  it("does not accept an invented cluster or unapproved state", () => {
    expect(() => resolveApprovedKeywordPrimaryV2({
      ...valid, decision: { status: "SELECTED", selectedClusterId: "fake" },
    }, "site-1")).toThrow("KEYWORD_V2_SNAPSHOT_WINNER_INVALID");
    expect(() => resolveApprovedKeywordPrimaryV2({
      ...valid, decision: { status: "REVIEW", selectedClusterId: null },
    }, "site-1")).toThrow("KEYWORD_V2_SNAPSHOT_NOT_SELECTED");
  });
});