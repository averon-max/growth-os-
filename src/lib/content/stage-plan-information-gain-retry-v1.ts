import {inspectStagePlanInformationGainV1,
  type ClaimBreadthStageSectionV1}
  from "./stage-plan-information-gain-v1";

/**
 * Bounded semantic-architecture repair advice, not a claims-per-H2
 * quota. The model must propose factual hypotheses; the existing
 * source verifier separately decides whether they may be published.
 */
export function buildStagePlanInformationGainRetryV1({
  sections,claims,
}:{
  sections:readonly ClaimBreadthStageSectionV1[];
  claims:readonly {id:string;text:string}[];
}):string|null{
  const diagnosis=inspectStagePlanInformationGainV1(sections);
  if(!diagnosis.insufficient)return null;
  const claimById=new Map(claims.map(claim=>[claim.id,claim.text]));
  const jobs=sections.map((section,index)=>({
    index,heading:section.heading,mission:section.mission??"",
    requiredQuestions:section.questions??[],
    currentClaims:(section.requiredClaimIds??[]).map(id=>({
      id,proposition:claimById.get(id)??"UNKNOWN_CLAIM_ID",
    })),
  }));
  return [
    "URGENT: STAGE_PLAN_INFORMATION_GAIN_CLAIM_BREADTH_RECOVERY_V1",
    "Your prior plan failed the cross-section information gain test.",
    "Explanatory sections: "+diagnosis.explanatorySections+
      ", exactly-one-claim sections: "+diagnosis.oneClaimSections+
      ", missing-claim sections: "+diagnosis.missingClaimSections,
    "The model created many substantive reader information jobs but supplied only one generic claim per H2.",
    "Do NOT return the same claims/sections arrangement: it will fail again.",
    "Diagnose each section by its reader question, mission, expected outcome, mechanisms, limits, distinctions and next steps.",
    "For complex information jobs, propose distinct atomic factual hypotheses for independently verifiable facets, assigned to ONE owning section.",
    "New factual propositions are HYPOTHESES, not verified facts. The downstream claim verifier must independently validate each precise claim.",
    "Merge genuinely redundant H2 jobs when they have the same answer WITHOUT losing required topic/question coverage.",
    "If evidence cannot support a required answer, never fabricate support or substitute an unrelated fact.",
    "Do NOT create filler H2/H3, fake keywords, padding or duplicate claims to pass a count.",
    "One short atomic claim is fine for a genuinely simple section. The failure is the systemic shallow architecture.",
    "Every query must be an exact observed same-intent query; semantic topics are NOT made-up volume-bearing keywords.",
    "Keep one canonical primary keyword; verified supporting keywords follow observed demand and distinct reader jobs, not a minimum quota.",
    "Do not confuse a topic label with verifiable factual mechanism or meaningful limitation.",
    "EXISTING SECTIONS AND CLAIMS TO RE-ARCHITECT:",
    JSON.stringify(jobs,null,2),
    "Return the complete Stage Plan JSON with fully consistent topics, questions, claims, roles and requiredClaimIds.",
  ].join("\n\n");
}
