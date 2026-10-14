import {describe,expect,it} from "vitest";
import {buildResearchRecoveryGovernmentSeedsV1} from "./research-recovery-authoritative-sources-v1";
import type {EvidenceSource} from "./evidence-graph";

describe("explicit government source recovery seeds",()=>{
  const url="https://www.identitytheft.gov/Steps";
  it("accepts US government URLs only as candidates, never as verified claims",()=>{
    const items=buildResearchRecoveryGovernmentSeedsV1([
      url,"https://consumer.ftc.gov/articles/what-know-about-identity-theft",
    ],[]);
    expect(items).toHaveLength(2);
    expect(items[0].sourceType).toBe("PRIMARY_GOVERNMENT");
    expect(items[0].authorityTier).toBe("A");
    expect(items[0].id).toMatch(/^research-gov-/);
    expect("claimEvidence" in items[0]).toBe(false);
  });
  it("does not re-add an existing URL",()=>{
    const existing=buildResearchRecoveryGovernmentSeedsV1([url],[]);
    expect(buildResearchRecoveryGovernmentSeedsV1([url],existing)).toEqual([]);
  });
  it.each([
    "http://www.identitytheft.gov/Steps",
    "https://identitytheft.gov.evil.com/Steps",
    "https://127.0.0.1/internal",
    "https://consumer.ftc.gov:8443/article",
    "https://user:pass@consumer.ftc.gov/article",
    "https://www.experian.com/article",
    "https://www.identitytheft.gov/Steps?token=anything",
  ])("rejects unsafe or non-government host %s",url=>{
    expect(()=>buildResearchRecoveryGovernmentSeedsV1([url],[]))
      .toThrow("RESEARCH_RECOVERY_SOURCE_SEED_INVALID");
  });
  it("rejects duplicates and over-large batches",()=>{
    expect(()=>buildResearchRecoveryGovernmentSeedsV1([url,url],[]))
      .toThrow("DUPLICATE_URL");
    expect(()=>buildResearchRecoveryGovernmentSeedsV1(
      Array(7).fill(url),[]))
      .toThrow("TOO_MANY");
  });
});
