import { describe, expect, it } from "vitest";
import { describeRejectedArticleV1 } from "./article-failure-diagnostic-v1";

describe("stored article failure diagnostic", () => {
  it("preserves actual depth error and owner without making up a verdict", () => {
    const report = describeRejectedArticleV1(
      "REJECTED_RECOVERY_V1|class=DEPTH_FAILURE|owner=DEPTH|action=REPAIR_OWNING_STAGE|autoRetry=0|message=SECTION_TARGETED_REPAIR_EXHAUSTED:DEPTH"
    );
    expect(report.failureClass).toBe("DEPTH_FAILURE");
    expect(report.owner).toBe("DEPTH");
    expect(report.nextAction).toBe("REPAIR_OWNING_STAGE");
    expect(report.diagnostic).toBe("SECTION_TARGETED_REPAIR_EXHAUSTED:DEPTH");
  });
  it("keeps final readiness diagnostics visible", () => {
    const report = describeRejectedArticleV1("FINAL_READINESS_MAJOR_SEMANTIC_FINDINGS:3");
    expect(report.failureClass).toBe("FINAL_READINESS_FAILURE");
    expect(report.diagnostic).toContain("FINAL_READINESS");
  });
  it("redacts credential-shaped strings", () => {
    const report = describeRejectedArticleV1("API request failed bearer abcdefghijklmnopqrstuvwxyz token sk-abcdefghijklmnopqrstuv");
    expect(report.diagnostic).not.toContain("abcdefghijklmnopqrstuvwxyz");
    expect(report.diagnostic).not.toContain("sk-abcdefghijklmnopqrstuv");
  });
});
