import {countWords} from "./article-analyzer";
import {resolveArticleLengthContractV1} from "./article-length-contract-v1";
import type {ArticleExecutionPlanV1}
  from "./article-execution-plan-v1";

/**
 * Product publishing policy, separate from Google's ranking systems.
 * A 100/100 technical score is not proof of useful editorial depth.
 * Fail closed on verified comprehensive guides, without inventing
 * search volume, keyword-density quotas, or required H3s for short pages.
 */
export function evaluateComprehensiveEditorialReleaseV1({
  plan,bodyMarkdown,
}:{
  plan:Readonly<ArticleExecutionPlanV1>;
  bodyMarkdown:string;
}){
  const profile=resolveArticleLengthContractV1(plan);
  const minimumWords=profile.targetWords?.min??null;
  const words=countWords(bodyMarkdown);
  const h3=(bodyMarkdown.match(/^###\s+\S/gm)??[]).length;
  const writable=plan.sections.filter(s=>s.state==="WRITABLE");
  const sourceRich=writable.filter(s=>
    s.requiredClaimIds.length>=2&&s.evidenceIds.length>=2).length;
  const meaningfulH3Required=minimumWords!==null&&
    writable.length>=4&&sourceRich>=2;
  const blockers:string[]=[];
  if(minimumWords!==null&&words<minimumWords)
    blockers.push("COMPREHENSIVE_EDITORIAL_DEPTH_BELOW_TARGET");
  if(meaningfulH3Required&&h3<2)
    blockers.push("COMPREHENSIVE_EDITORIAL_SUBSECTION_STRUCTURE_MISSING");
  return {
    version:"COMPREHENSIVE_EDITORIAL_RELEASE_V1" as const,
    pass:blockers.length===0,
    blockers,minimumWords,wordCount:words,h3Count:h3,
    sourceRichSections:sourceRich,
    note:"Editorial product threshold, not a search ranking guarantee.",
  };
}
export class ComprehensiveEditorialReleaseErrorV1 extends Error{
  readonly code="ARTICLE_NEEDS_EDITORIAL_IMPROVEMENT" as const;
  constructor(readonly blockers:readonly string[]){
    super("ARTICLE_NEEDS_EDITORIAL_IMPROVEMENT:"+blockers.join(","));
    this.name="ComprehensiveEditorialReleaseErrorV1";
  }
}
export function assertComprehensiveEditorialReleaseV1(
  result:ReturnType<typeof evaluateComprehensiveEditorialReleaseV1>
){
  if(!result.pass)throw new ComprehensiveEditorialReleaseErrorV1(result.blockers);
}
