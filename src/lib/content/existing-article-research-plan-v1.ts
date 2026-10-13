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
  verify(proposals.reduce((sum,p)=>
    sum+(Array.isArray(p.proposedClaims)?p.proposedClaims.length:0),0)<=18,
    "TOTAL_PROPOSALS_LIMIT");
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


/**
 * Contract too-large but structurally valid model replies instead of
 * discarding a paid planning result. Round-robin across REAL existing
 * sections: first hypothesis from every section, then second, etc.
 * This changes only selection, never invents/supports a factual claim.
 * The canonical validator still checks every retained claim.
 */
export function budgetResearchExpansionProposalsV1({
  plan,proposals,maxClaims=RESEARCH_RECOVERY_MAX_NEW_CLAIMS_V1,
}:{
  plan:Readonly<ArticleExecutionPlanV1>;
  proposals:readonly ResearchExpansionProposalV1[];
  maxClaims?:number;
}):Readonly<{
  proposals:readonly ResearchExpansionProposalV1[];
  offeredClaims:number;
  retainedClaims:number;
  droppedClaims:number;
}>{
  verify(Array.isArray(proposals),"NOT_ARRAY");
  verify(Number.isInteger(maxClaims)&&maxClaims>=1&&maxClaims<=18,
    "INVALID_BUDGET");
  const writable=plan.sections.filter(section=>section.state==="WRITABLE");
  verify(writable.length>0&&writable.length<=maxClaims,
    "NOT_ENOUGH_BUDGET_FOR_SECTIONS");
  verify(proposals.length===writable.length,
    "MISSING_OR_EXTRA_SECTION_RESEARCH");
  const byId=new Map<string,ResearchExpansionProposalV1>();
  const validIds=new Set(writable.map(s=>s.id));
  for(const proposal of proposals){
    verify(proposal&&typeof proposal.sectionId==="string"&&
      validIds.has(proposal.sectionId)&&!byId.has(proposal.sectionId),
      "SECTION_ID_INVALID_OR_DUPLICATED");
    verify(Array.isArray(proposal.proposedClaims)&&
      proposal.proposedClaims.length>=1&&proposal.proposedClaims.length<=4,
      "SECTION_CLAIM_COUNT");
    byId.set(proposal.sectionId,proposal);
  }
  const ordered=writable.map(section=>byId.get(section.id)!);
  const offeredClaims=ordered.reduce(
    (total,p)=>total+p.proposedClaims.length,0);
  const selected=new Map<string,
    Array<ResearchExpansionProposalV1["proposedClaims"][number]>>(
      ordered.map(p=>[
        p.sectionId,
        [] as Array<ResearchExpansionProposalV1["proposedClaims"][number]>,
      ] as const)
    );
  let remaining=maxClaims;
  for(let index=0;index<4&&remaining>0;index++){
    for(const proposal of ordered){
      const claim=proposal.proposedClaims[index];
      if(!claim||remaining===0)continue;
      selected.get(proposal.sectionId)!.push(claim);
      remaining--;
    }
  }
  const compact=ordered.map(p=>({
    sectionId:p.sectionId,
    proposedClaims:selected.get(p.sectionId)!,
  }));
  const retainedClaims=compact.reduce(
    (total,p)=>total+p.proposedClaims.length,0);
  return {
    proposals:compact,
    offeredClaims,retainedClaims,
    droppedClaims:offeredClaims-retainedClaims,
  };
}
