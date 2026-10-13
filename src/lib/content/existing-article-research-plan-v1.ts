/**
 * EXISTING_ARTICLE_RESEARCH_EXPANSION_PLAN_V1
 *
 * Pure validation of one bounded content-addressed research expansion.
 * Claims are untrusted research hypotheses until existing live crawler,
 * strict excerpt matcher and semantic support verification approve them.
 *
 * No new H2 authority, no keyword reselection, no new Article/Brief.
 */
import type {ArticleExecutionPlanV1} from "./article-execution-plan-v1";
import type {ClaimInput} from "./claim-ledger";

export interface ResearchExpansionProposalV1{
  readonly sectionId:string;
  readonly proposedClaims:readonly Readonly<{
    text:string;
    category:ClaimInput["category"];
    risk:ClaimInput["risk"];
  }>[];
}
export interface ResearchExpansionClaimV1 extends ClaimInput{
  readonly sectionId:string;
}
const categories=new Set([
  "FACT","STATISTIC","FINANCIAL","LEGAL","PRODUCT","PRICE","COMPARISON",
]);
const risks=new Set(["LOW","MEDIUM","HIGH"]);
function verify(condition:unknown,code:string):asserts condition {
  if(!condition)throw new Error("RESEARCH_RECOVERY_PLAN_INVALID:"+code);
}
function tokens(s:string){
  return new Set((s.toLowerCase().normalize("NFKC").match(/[\p{L}\p{N}]+/gu)??[])
    .filter(x=>x.length>2));
}
function similarity(a:string,b:string){
  const x=tokens(a),y=tokens(b),intersection=[...x].filter(t=>y.has(t)).length;
  return intersection/Math.max(1,new Set([...x,...y]).size);
}
export function validateResearchExpansionProposalsV1({
  plan,existingClaimTexts,proposals,
}:{
  plan:Readonly<ArticleExecutionPlanV1>;
  existingClaimTexts:readonly string[];
  proposals:readonly ResearchExpansionProposalV1[];
}):readonly ResearchExpansionClaimV1[]{
  verify(Array.isArray(proposals),"NOT_ARRAY");
  verify(proposals.length<=plan.sections.length,"EXTRA_SECTIONS");
  const validSections=new Set(plan.sections
    .filter(s=>s.state==="WRITABLE").map(s=>s.id));
  const seen=new Set<string>();
  const output:ResearchExpansionClaimV1[]=[];
  for(const proposed of proposals){
    verify(typeof proposed.sectionId==="string" &&
      validSections.has(proposed.sectionId)&&!seen.has(proposed.sectionId),
      "SECTION_ID_INVALID_OR_DUPLICATED");
    seen.add(proposed.sectionId);
    verify(Array.isArray(proposed.proposedClaims)&&
      proposed.proposedClaims.length>=1&&
      proposed.proposedClaims.length<=4,"SECTION_CLAIM_COUNT");
    for(const claim of proposed.proposedClaims){
      verify(typeof claim.text==="string"&&
        claim.text.length>=24&&claim.text.length<=320 &&
        /[.!?]$/.test(claim.text.trim()),"CLAIM_TEXT_INVALID");
      verify(categories.has(claim.category)&&risks.has(claim.risk),
        "CLAIM_TYPE_INVALID");
      const all=[...existingClaimTexts,...output.map(c=>c.text)];
      verify(all.every(old=>similarity(old,claim.text)<0.78),
        "CLAIM_DUPLICATES_EXISTING_FACT");
      output.push({
        id:"research-"+proposed.sectionId+"-"+proposed.proposedClaims.indexOf(claim),
        sectionId:proposed.sectionId,text:claim.text.trim(),
        category:claim.category,risk:claim.risk,
      });
    }
  }
  const writable=plan.sections.filter(s=>s.state==="WRITABLE");
  verify(writable.length>=1&&
    writable.every(s=>seen.has(s.id)),"MISSING_SECTION_RESEARCH");
  verify(output.length<=18,"TOTAL_PROPOSALS_LIMIT");
  return output;
}
export const RESEARCH_RECOVERY_MAX_MODEL_CALLS_V1=1;
export const RESEARCH_RECOVERY_MAX_NEW_CLAIMS_V1=18;
