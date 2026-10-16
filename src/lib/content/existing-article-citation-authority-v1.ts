/**
 * Proposed saved-article citations must map to actual section-owned signed
 * VERIFIED_EXCERPT sources. A globally verified citation outside its own
 * planned H2 is NOT an authorized reference. This is only URL ownership;
 * semantic claim-to-sentence entailment still requires model/human review.
 */
import type {ArticleExecutionPlanV1} from "./article-execution-plan-v1";
import type {MasterRuntimeSnapshotV1} from "./master-runtime-adapter";
import {getOwnedVerifiedCitationsV1} from "./existing-article-source-citation-repair-v1";
import {splitPersistedArticleByCanonicalH2V1} from "./existing-article-section-rebind-v1";
const key=(value:string):string|null=>{
  try {
    const u=new URL(value);
    if(u.protocol!=="https:")return null;
    u.hash="";
    return u.toString().replace(/\/$/u,"");
  }catch{return null;}
};
export function verifyExistingArticleCitationScopeV1(input:{
  candidateBodyMarkdown:string;
  runtime:Readonly<MasterRuntimeSnapshotV1>;
  plan:Readonly<ArticleExecutionPlanV1>;
}){
  const sections=input.plan.sections.filter(s=>s.state==="WRITABLE");
  const bodies=splitPersistedArticleByCanonicalH2V1(
    input.candidateBodyMarkdown,sections.map(s=>s.heading));
  const results=bodies.map((body,index)=>{
    const allowed=getOwnedVerifiedCitationsV1(input.runtime,input.plan,index);
    const approved=new Set(allowed.map(a=>key(a.url)).filter(Boolean));
    const links=[...body.matchAll(/\[[^\]]+\]\((https?:\/\/[^)\s]+)\)/gu)]
      .map(m=>m[1]);
    const rejected=links.filter(url=>!approved.has(key(url)));
    return {
      sectionIndex:index,heading:sections[index]!.heading,
      links:links.length,approvedLinks:links.length-rejected.length,
      rejectedLinks:rejected,assignedEvidence:allowed.length,
    };
  });
  const uncitedEvidenceSections=results.filter(section=>
    section.assignedEvidence>0&&section.approvedLinks===0)
    .map(section=>({
      sectionIndex:section.sectionIndex,heading:section.heading,
      assignedEvidence:section.assignedEvidence,
    }));
  const completeSectionCitationCoverage=uncitedEvidenceSections.length===0;
  const rejected=results.flatMap(r=>r.rejectedLinks);
  const totalLinks=results.reduce((n,r)=>n+r.links,0);
  return {
    version:"EXISTING_ARTICLE_SIGNED_CITATION_SCOPE_V1",
    status:rejected.length?"BLOCK_WRONG_SECTION_CITATIONS":
      totalLinks===0?"BLOCK_NO_VISIBLE_CITATIONS":"REVIEW_SEMANTIC_PROOF_REQUIRED",
    totalLinks,unapprovedLinks:rejected.length,sections:results,
    uncitedEvidenceSections,completeSectionCitationCoverage,
    fullySemanticallyVerified:false,
    commitAllowed:false,
    warning:"URL scope alone does not prove a claim or authorize a write. Exact content still requires sentence entailment, nine critics and fingerprinted replay.",
  };
}
