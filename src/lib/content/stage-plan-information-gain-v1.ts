/**
 * STAGE_PLAN_INFORMATION_GAIN_AUTHORITY_V1
 *
 * Structural diagnosis BEFORE paid claim discovery, evidence closure,
 * and the Writer. A 6-section explainer with six generic one-fact
 * anchors is not a publishable research plan just because each anchor
 * may obtain a few excerpts.
 *
 * Only flags a systemically shallow EXPLANATORY plan, never assumes a
 * universal claims-per-paragraph or word quota. All additional atomic
 * claims remain HYPOTHESES until the strict factual verifier approves
 * source-specific evidence. Caller may use the EXISTING single bounded
 * plan-repair attempt, and MUST fail closed if still underspecified.
 */
export interface ClaimBreadthStageSectionV1 {
  heading:string;
  mission?:string;
  questions?:readonly string[];
  requiredClaimIds?:readonly string[];
}
export interface StagePlanBreadthDiagnosisV1 {
  version:"STAGE_PLAN_INFORMATION_GAIN_AUTHORITY_V1";
  insufficient:boolean;
  explanatorySections:number;
  oneClaimSections:number;
  missingClaimSections:number;
  issueCode:"sections[].informationGainClaimBreadth"|null;
}
const explanatoryJob=(section:ClaimBreadthStageSectionV1)=>{
  const heading=section.heading.toLowerCase().trim();
  return /^(?:what|how|why|when|which|where|does|do|can|should)\b/.test(heading) ||
    /\b(?:benefits?|limitations?|risks?|drawbacks?|steps?|process|compar(?:e|ison)|alternatives?|features?|differences?|guides?)\b/.test(heading) ||
    (section.questions?.length??0)>0;
};
export function inspectStagePlanInformationGainV1(
  sections:readonly ClaimBreadthStageSectionV1[]
):StagePlanBreadthDiagnosisV1{
  const explanatory=sections.filter(explanatoryJob);
  const oneClaim=explanatory.filter(s=>
    new Set(s.requiredClaimIds??[]).size===1).length;
  const missing=explanatory.filter(s=>
    (s.requiredClaimIds??[]).length===0).length;
  const insufficient=
    sections.length>=5 &&
    explanatory.length>=4 &&
    oneClaim+missing===explanatory.length &&
    oneClaim>=Math.ceil(explanatory.length*.75);
  return {
    version:"STAGE_PLAN_INFORMATION_GAIN_AUTHORITY_V1",
    insufficient,
    explanatorySections:explanatory.length,
    oneClaimSections:oneClaim,
    missingClaimSections:missing,
    issueCode:insufficient?"sections[].informationGainClaimBreadth":null,
  };
}
export const INFORMATION_GAIN_ATOMIC_CLAIM_PLANNING_RULES_V1=[
  "INFORMATION_GAIN_ATOMIC_CLAIM_PLANNING_V1:",
  "- Plan the direct answer to each distinct section mission AND the factual mechanisms, limits, comparisons or next-step details genuinely needed to complete it.",
  "- For each substantive information job, identify independent, source-verifiable factual propositions, rather than using one broad generic claim to justify hundreds of words.",
  "- A definition does not by itself substantiate a mechanism, a limitation, a product-scope difference, or what a reader should do after a warning.",
  "- For process/how-to sections, plan distinct verified stages/actions only when factual sources can support them; keep human recommendations separate from unsupported legal or product claims.",
  "- If a section requires multiple factual facets, assign one atomic claim to EACH facet, with one unique owning section. Do not bundle several facts in a single sentence to game this rule.",
  "- Do not add a second claim solely to meet a number. Short simple answers may genuinely need one factual claim; avoid extra filler sections.",
  "- Every proposed factual claim is only a research HYPOTHESIS until fetched source excerpts independently verify it. Verification failure MUST contract scope or replan; never fabricate facts or citations.",
  "- If six explanatory H2 sections each have the same single generic claim anchor, regenerate a deeper evidence-led plan before spending money on the Writer.",
].join("\n");
