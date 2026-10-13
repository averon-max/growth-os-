/**
 * SECTION_EDITORIAL_EVIDENCE_SUFFICIENCY_V1
 *
 * A section may be structurally WRITABLE and still have no factual
 * authority for its assigned explanatory task. The old system told
 * the Writer to pad such a section with generic prose; it generated
 * impressive word counts and empty information gain.
 *
 * This runs BEFORE all paid Writer/model calls. It never broadens
 * factual authority, invents claims or changes the locked plan.
 * Block when a substantive H2 has an assigned question and zero
 * material claims/evidence. Require upstream Research to repair
 * or defer that section instead of paying for verbose fluff.
 */
export interface SectionEvidenceCapacityV1 {
  state:string;
  id:string;
  heading:string;
  requiredQuestionIds:readonly string[];
  requiredTopicIds:readonly string[];
  requiredClaimIds:readonly string[];
  evidenceIds:readonly string[];
  targetWords:Readonly<{preferred:number}>;
}
export interface SectionEvidenceGapV1 {
  sectionId:string;
  heading:string;
  reason:"SUBSTANTIVE_QUESTION_WITHOUT_EVIDENCE" |
    "LENGTH_BUDGET_WITHOUT_EVIDENCE";
}
export class SectionEvidenceCapacityErrorV1 extends Error {
  readonly code="SECTION_EDITORIAL_EVIDENCE_CAPACITY_INSUFFICIENT" as const;
  constructor(readonly gaps:readonly SectionEvidenceGapV1[]){
    super("SECTION_EDITORIAL_EVIDENCE_CAPACITY_INSUFFICIENT:"+
      gaps.map(g=>g.sectionId+":"+g.reason).join(","));
    this.name="SectionEvidenceCapacityErrorV1";
  }
}
export function inspectSectionEvidenceCapacityV1(
  sections:readonly SectionEvidenceCapacityV1[]
):readonly SectionEvidenceGapV1[]{
  return sections.flatMap<SectionEvidenceGapV1>(section=>{
    if(section.state!=="WRITABLE")return [];
    const claimAuthority=section.requiredClaimIds.length;
    const sourceAuthority=section.evidenceIds.length;
    if(claimAuthority>0 && sourceAuthority>0)return [];
    // A short evergreen overview is allowed. A substantive question
    // must have some real source authority before it gets 200+ words.
    if(section.requiredQuestionIds.length>0)
      return [{
        sectionId:section.id,heading:section.heading,
        reason:"SUBSTANTIVE_QUESTION_WITHOUT_EVIDENCE" as const,
      }];
    if(section.targetWords.preferred>=190 &&
      (section.requiredTopicIds.length>0||claimAuthority>0))
      return [{
        sectionId:section.id,heading:section.heading,
        reason:"LENGTH_BUDGET_WITHOUT_EVIDENCE" as const,
      }];
    return [];
  });
}
export function assertSectionEvidenceCapacityV1(
  sections:readonly SectionEvidenceCapacityV1[]
):void{
  const gaps=inspectSectionEvidenceCapacityV1(sections);
  if(gaps.length)throw new SectionEvidenceCapacityErrorV1(gaps);
}
