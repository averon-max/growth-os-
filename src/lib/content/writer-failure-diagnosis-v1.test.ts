import { describe, expect, it } from "vitest";
import { diagnoseWriterFailureV1 } from "./writer-failure-diagnosis-v1";

describe("single Writer failure taxonomy", () => {
  it("sends insufficient verified evidence back to research, never auto-retries", () => {
    const diagnostic=diagnoseWriterFailureV1(new Error(
      "SECTION_EDITORIAL_EVIDENCE_CAPACITY_INSUFFICIENT:section-5:PRIVATE_QUESTION"
    ));
    expect(diagnostic).toMatchObject({
      reasonCode:"SECTION_EDITORIAL_EVIDENCE_CAPACITY_INSUFFICIENT",
      failureClass:"RESEARCH_PLANNING",
      recommendedAction:"REPAIR_VERIFIED_RESEARCH_OR_PLAN",
      automaticRetry:false,
    });
    expect(JSON.stringify(diagnostic)).not.toContain("PRIVATE_QUESTION");
  });
  it("does not misdiagnose CMS publication defects as Writer generation", () => {
    expect(diagnoseWriterFailureV1({code:"PUBLISH_FAILED",message:"private path"}))
      .toMatchObject({failureClass:"CMS_PUBLICATION",
        recommendedAction:"REPAIR_CMS_NOT_WRITER"});
  });
  it("leaks no untrusted exception prose or provider secrets", () => {
    const diagnostic=diagnoseWriterFailureV1(new Error(
      "Request failed: api_key=SECRET and keyword private"
    ));
    expect(diagnostic.reasonCode).toBe("WRITER_UNKNOWN_FAILURE");
    expect(diagnostic.failureClass).toBe("UNKNOWN");
    expect(JSON.stringify(diagnostic)).not.toMatch(/SECRET|private/i);
  });
  it("classifies provider and editorial stages without inferring a retry",()=>{
    expect(diagnoseWriterFailureV1({code:"MODEL_RATE_LIMIT"}).failureClass).toBe("PROVIDER");
    expect(diagnoseWriterFailureV1({code:"ARTICLE_QUALITY_REJECTED"}).failureClass)
      .toBe("WRITER_EDITORIAL");
    expect(diagnoseWriterFailureV1({code:"ARTICLE_QUALITY_REJECTED"}).automaticRetry).toBe(false);
  });
});