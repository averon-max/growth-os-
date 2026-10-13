import {describe,expect,it} from "vitest";
import {inspectClaimMaterialQualifiersV1} from "./claim-material-qualifier-v1";
import {findVerifiedExcerptCandidateV1} from "./live-evidence-verification";

describe("source excerpt must preserve material claim conditions",()=>{
  it("rejects the historical alert-action claim when the source only talks about swift alerts",()=>{
    const claimText=
      "A person should review an unexpected credit monitoring alert before deciding what action to take.";
    const excerpt=
      "Personal credit monitoring services provide direct, immediate alerts necessary for consumers to take swift action, preventing potential damage before it escalates.";
    expect(inspectClaimMaterialQualifiersV1({
      claimText,excerpt,
    })).toMatchObject({
      passed:false,
      findings:["UNEXPECTED_CONDITION_NOT_SUPPORTED"],
    });
    // The excerpt's "before" pertains to damage escalation, not
    // to the consumer reviewing a notice before deciding. A token-
    // based predicate is NOT sufficient for semantic entailment.
  });

  it("rejects a temporally mismatched claim even with high keyword overlap",()=>{
    const claimText=
      "A person should review an unexpected credit monitoring alert before deciding what action to take.";
    const excerpt=
      "A person can review a credit monitoring alert and decide what action to take.";
    expect(inspectClaimMaterialQualifiersV1({
      claimText,excerpt,
    }).findings).toEqual([
      "BEFORE_ORDER_NOT_SUPPORTED",
      "UNEXPECTED_CONDITION_NOT_SUPPORTED",
    ]);
    expect(findVerifiedExcerptCandidateV1({
      claimText,bodyText:excerpt,
    })).toBeNull();
  });

  it("accepts exact instructions with material conditions intact",()=>{
    const claimText=
      "Review an unexpected credit alert before deciding what to do.";
    const excerpt=
      "Review an unexpected credit alert before deciding what to do.";
    expect(inspectClaimMaterialQualifiersV1({
      claimText,excerpt,
    }).passed).toBe(true);
    expect(findVerifiedExcerptCandidateV1({
      claimText,bodyText:excerpt,
    })).not.toBeNull();
  });

  it("rejects unsupported exclusive and temporal qualifiers",()=>{
    expect(inspectClaimMaterialQualifiersV1({
      claimText:"This service only reports changes after the review is finished.",
      excerpt:"This service reports changes and sends alerts.",
    }).findings).toEqual([
      "AFTER_ORDER_NOT_SUPPORTED",
      "EXCLUSIVE_SCOPE_NOT_SUPPORTED",
    ]);
  });

  it("does not impose a new qualifier obligation on ordinary factual explanations",()=>{
    expect(inspectClaimMaterialQualifiersV1({
      claimText:"Credit monitoring tracks changes in your credit report.",
      excerpt:"Credit monitoring tracks changes in a consumer credit report.",
    }).passed).toBe(true);
  });

  it("does not treat source overlap as semantic entailment",()=>{
    const result=inspectClaimMaterialQualifiersV1({
      claimText:"Credit monitoring does not hurt credit scores.",
      excerpt:"Credit monitoring does not hurt credit scores.",
    });
    expect(result.passed).toBe(true);
    // A PASS here only means these restricted conditions do not fail.
    // Full proposition-level entailment requires a separate check.
  });
});
