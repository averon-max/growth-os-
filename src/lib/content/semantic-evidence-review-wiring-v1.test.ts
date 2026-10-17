/**
 * Production policy wiring regression.
 * No network, credentials, model inference or database operations.
 */
import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
const content=(relative:string)=>
  readFileSync(new URL(relative,import.meta.url),"utf8");
const plan=content("./production-master-live-stage-planner.ts");
const verifier=content("./live-evidence-verification.ts");
const lexical=content("./evidence-lexical-matcher-v1.ts");
const publisher=content("./stored-publication-evidence-gate-v1.ts");
const semantic=content("./semantic-evidence-review-v1.ts");

describe("source support must be established before Writer",()=>{
  it("uses strict scope qualifiers inside the canonical verifier and stored publication gate",()=>{
    expect(lexical).toContain("inspectClaimMaterialQualifiersV1({");
    expect(verifier).toContain('from "./evidence-lexical-matcher-v1"');
    expect(publisher).toContain("findVerifiedExcerptCandidateV1({");
  });
  it("reviews evidence after live recovery but before assigning section evidence",()=>{
    const closure=plan.indexOf("[content evidence closure]");
    const semanticReview=plan.indexOf("reviewAndConstrainVerifiedEvidenceV1({");
    const assignments=plan.indexOf("assignVerifiedEvidenceToExplicitSectionsV2({");
    expect(closure).toBeGreaterThan(-1);
    expect(semanticReview).toBeGreaterThan(closure);
    expect(assignments).toBeGreaterThan(semanticReview);
  });
  it("demotes unsupported evidence rather than changing claim text or elevating citations",()=>{
    expect(semantic).toContain('kind:"REFERENCE_ONLY" as const');
    expect(semantic).toContain('relation:"PARTIALLY_SUPPORTS" as const');
    expect(semantic).not.toContain("prisma.");
    expect(semantic).not.toContain("enrichLiveEvidenceGraphV1");
  });
  it("enforces bounded logical model calls with no retries inside the semantic module",()=>{
    expect(semantic).toContain("const MAX_PAIRS=72");
    expect(semantic).toContain("const PAIRS_PER_CALL=18");
    expect(semantic).toContain("const MAX_REVIEW_CALLS=4");
    expect(semantic).toContain("reasoningEffort:\"low\"");
  });
});
