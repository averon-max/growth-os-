import {countWords} from "./article-analyzer";
import {resolveArticleLengthContractV1} from "./article-length-contract-v1";
import type {ArticleExecutionPlanV1}
  from "./article-execution-plan-v1";

/**
 * Growth OS's comprehensive-editorial PRODUCT contract, not a Google rule.
 * Prevents a long article from passing with 1-2 H2, orphaned H3s,
 * or 2,000 words placed in one section despite a multi-job plan.
 *
 * Never creates headings, keyword variants or claims. Structural gaps
 * must be repaired against source-backed information jobs upstream.
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
  const isComprehensive=minimumWords!==null;
  const writable=plan.sections.filter(s=>s.state==="WRITABLE");
  const plannedH2=writable.filter(s=>s.level===2).length;
  const sourceRich=writable.filter(s=>
    s.requiredClaimIds.length>=2&&s.evidenceIds.length>=2).length;

  const headings=[...bodyMarkdown.matchAll(/^(#{1,3})[ \t]+([^\n]+)/gm)]
    .map(match=>({
      level:match[1].length,text:match[2].trim(),
      index:match.index??0,end:(match.index??0)+match[0].length,
    }));
  const h2Sections=headings.filter(h=>h.level===2).map((h,i,all)=>({
    heading:h.text,
    markdown:bodyMarkdown.slice(
      h.end,i+1<all.length?all[i+1].index:bodyMarkdown.length,
    ),
  }));
  const h2=h2Sections.length;
  const h3=headings.filter(h=>h.level===3).length;
  const h3Owners=new Set<number>();
  let h2Owner=-1;
  let orphanH3=0;
  for(const heading of headings){
    if(heading.level===2)h2Owner+=1;
    if(heading.level===3){
      if(h2Owner<0)orphanH3+=1;
      else h3Owners.add(h2Owner);
    }
  }
  const normalizedHeading=(s:string)=>s.toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu," ").trim();
  const uniqueH2=new Set(h2Sections.map(s=>
    normalizedHeading(s.heading))).size;
  const shallowSections=h2Sections.filter(section=>{
    const sectionProse=section.markdown.replace(/^#{1,6}[ \t].+$/gm,"")
      .replace(/!\[[^\]]*\]\([^)]+\)/g,"")
      .replace(/\[[^\]]+\]\([^)]+\)/g,"");
    return countWords(sectionProse)<60;
  }).length;
  const paragraphs=bodyMarkdown.split(/\n\s*\n/u)
    .map(p=>p.replace(/\s+/gu," ").trim())
    .filter(p=>p.length>=100&&!/^#{1,6}\s/u.test(p));
  const uniqueParagraphs=new Set(paragraphs.map(p=>p.toLowerCase())).size;
  const duplicateParagraphs=paragraphs.length-uniqueParagraphs;

  const meaningfulH3Required=isComprehensive&&
    writable.length>=5&&sourceRich>=2;
  // Required substantive article shape: >=6 distinct reader jobs,
  // and every persisted WRITABLE H2 must still exist in the article.
  const minimumH2=isComprehensive?Math.max(6,plannedH2):null;
  const minimumH3=meaningfulH3Required?3:0;
  const blockers:string[]=[];
  if(isComprehensive&&words<minimumWords)
    blockers.push("COMPREHENSIVE_EDITORIAL_DEPTH_BELOW_TARGET");
  if(isComprehensive&&h2<minimumH2!)
    blockers.push("COMPREHENSIVE_EDITORIAL_H2_STRUCTURE_TOO_SHALLOW");
  if(isComprehensive&&h2!==uniqueH2)
    blockers.push("COMPREHENSIVE_EDITORIAL_DUPLICATE_H2");
  if(meaningfulH3Required&&h3<minimumH3)
    blockers.push("COMPREHENSIVE_EDITORIAL_SUBSECTION_STRUCTURE_MISSING");
  if(isComprehensive&&orphanH3)
    blockers.push("COMPREHENSIVE_EDITORIAL_ORPHAN_H3");
  if(meaningfulH3Required&&h3Owners.size<2)
    blockers.push("COMPREHENSIVE_EDITORIAL_H3_CONCENTRATED");
  if(isComprehensive&&shallowSections>0)
    blockers.push("COMPREHENSIVE_EDITORIAL_SHALLOW_H2_PARAGRAPHS");
  if(isComprehensive&&duplicateParagraphs>0)
    blockers.push("COMPREHENSIVE_EDITORIAL_DUPLICATED_PARAGRAPHS");
  return {
    version:"COMPREHENSIVE_EDITORIAL_RELEASE_V1" as const,
    pass:blockers.length===0,
    blockers,minimumWords,wordCount:words,
    minimumH2,h2Count:h2,plannedH2,
    minimumH3,h3Count:h3,h3OwnerSections:h3Owners.size,
    shallowSections,duplicateParagraphs,
    sourceRichSections:sourceRich,
    note:"Editorial product threshold, not a search ranking guarantee. A structural blocker requires evidence-backed repair, never filler headings.",
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
