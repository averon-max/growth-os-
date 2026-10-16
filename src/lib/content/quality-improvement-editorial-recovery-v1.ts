import type {EditorialRepetitionFindingV1}
  from "./editorial-repetition-guard-v1";

/**
 * Change only a section that is already eligible for the signed
 * same-article quality revision. Never silently rewrite a section whose
 * claim/section authority has not been allocated by the current plan.
 */
export function selectQualityEditorialRepairSectionsV1({
  finding,plannedIndices,alreadyAttempted,
}:{
  finding:Readonly<EditorialRepetitionFindingV1>;
  plannedIndices:readonly number[];
  alreadyAttempted:readonly number[];
}):readonly number[]{
  const allowed=new Set(plannedIndices);
  const attempted=new Set(alreadyAttempted);
  return [...new Set([
    finding.sectionIndex,...finding.affectedSections,
  ])].filter(index=>Number.isInteger(index)&&index>=0&&
    allowed.has(index)&&!attempted.has(index));
}

/** The original high-precision detection result must DISAPPEAR, not merely
 * change phrase order. Never mark a still-repeating article as fixed. */
export function isQualityEditorialFindingResolvedV1({
  before,after,
}:{
  before:readonly EditorialRepetitionFindingV1[];
  after:readonly EditorialRepetitionFindingV1[];
}):boolean{
  return before.length>0 && after.length<before.length;
}
