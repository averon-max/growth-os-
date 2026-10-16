/**
 * Strict observational bridge. A source-observed SAME_PAGE query may
 * ALREADY be answered under a meaning-equivalent H2 while an immutable
 * queryNodeId -> section assignment is missing. This function proposes
 * a REVIEW candidate, never mutates or certifies blueprint ownership.
 *
 * Pure and conservative: literal token-order equality after dropping
 * possessive "your" and punctuation only. Competing matches, stale H2,
 * or absent publication-grade evidence fail closed.
 */
function comparableHeading(value:string):string {
  return value.normalize("NFKC").toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu," ").trim()
    .split(/\s+/u).filter(word=>word!=="your").join(" ");
}
export interface ObservedQueryHeadingV1 {
  index:number;
  heading:string;
  persistedH2:string|null;
  verifiedEvidenceCount:number;
}
export interface ObservedQueryHeadingCandidateV1 {
  ownerSectionIndex:number;
  ownerHeading:string;
  confidence:"EXACT_AFTER_POSSESSIVE_NORMALIZATION";
  verifiedEvidenceCount:number;
  note:string;
}
export function suggestObservedQueryHeadingCandidateV1({
  query,sections,
}:{
  query:string;
  sections:readonly Readonly<ObservedQueryHeadingV1>[];
}):ObservedQueryHeadingCandidateV1|null {
  const key=comparableHeading(query);
  if(!key||key.split(" ").length<4)return null;
  const matches=sections.filter(section=>
    section.verifiedEvidenceCount>0 &&
    !!section.persistedH2 &&
    comparableHeading(section.persistedH2)===
      comparableHeading(section.heading) &&
    comparableHeading(section.heading)===key);
  if(matches.length!==1)return null;
  const owner=matches[0];
  return {
    ownerSectionIndex:owner.index,
    ownerHeading:owner.heading,
    confidence:"EXACT_AFTER_POSSESSIVE_NORMALIZATION",
    verifiedEvidenceCount:owner.verifiedEvidenceCount,
    note:"Existing H2 appears to answer this observed query, but the signed Query Graph has no node-to-section assignment. Human review and versioned re-binding required; NOT automatically certified as covered.",
  };
}
