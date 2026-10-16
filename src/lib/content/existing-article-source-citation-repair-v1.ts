/**
 * Read-only citation draft for one signed, existing article.
 * Only section-owned VERIFIED_EXCERPT supporting VERIFIED required claims.
 * No claims/research creation; draft never licenses DB persistence.
 */
import type {ArticleExecutionPlanV1} from "./article-execution-plan-v1";
import type {MasterRuntimeSnapshotV1} from "./master-runtime-adapter";
import {splitPersistedArticleByCanonicalH2V1} from "./existing-article-section-rebind-v1";

const normalize=(s:string)=>s.normalize("NFKC").toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu," ").trim().replace(/\s+/gu," ");
const urlKey=(value:string):string|null=>{
  try{
    const u=new URL(value);
    if(u.protocol!=="https:"||u.username||u.password||!u.hostname||
      u.hostname==="localhost"||u.hostname.endsWith(".localhost")||
      /^(?:127\.|10\.|192\.168\.|169\.254\.)/.test(u.hostname))return null;
    u.hash="";return u.toString().replace(/\/$/u,"");
  }catch{return null;}
};
const safeLabel=(value:string)=>value.replace(/[[\]()\n]/g," ")
  .trim().slice(0,85)||"Verified source";
export interface ScopedCitationV1{
  readonly claimId:string;readonly evidenceId:string;
  readonly sourceId:string;readonly url:string;
  readonly publisher:string;readonly claimText:string;
}
export function getOwnedVerifiedCitationsV1(
  runtime:Readonly<MasterRuntimeSnapshotV1>,
  plan:Readonly<ArticleExecutionPlanV1>,sectionIndex:number,
):readonly ScopedCitationV1[]{
  const section=plan.sections.filter(s=>s.state==="WRITABLE")[sectionIndex];
  if(!section)return [];
  const claims=new Map(runtime.claimLedger.claims.map(c=>[c.id,c]));
  const sources=new Map(runtime.evidenceGraph.sources.map(s=>[s.id,s]));
  const evidenceIds=new Set(section.evidenceIds);
  const claimIds=new Set(section.requiredClaimIds);
  return runtime.evidenceGraph.claimEvidence.flatMap(item=>{
    if(!evidenceIds.has(item.id)||!claimIds.has(item.claimId)||
      item.kind!=="VERIFIED_EXCERPT"||item.relation!=="SUPPORTS"||
      !item.excerpt?.trim())return [];
    const claim=claims.get(item.claimId),source=sources.get(item.sourceId);
    if(!claim||claim.status!=="VERIFIED"||!source||!claim.text.trim()||
      !urlKey(source.url))return [];
    return [{
      claimId:claim.id,evidenceId:item.id,sourceId:source.id,
      url:source.url,publisher:safeLabel(source.publisher),
      claimText:claim.text,
    }];
  });
}
function paragraphForFullClaim(body:string,claimText:string):number|null{
  const wanted=normalize(claimText);
  if(wanted.length<28||wanted.split(" ").length<6)return null;
  const paragraphs=body.split(/\n{2,}/u);
  const matches:number[]=[];
  paragraphs.forEach((paragraph,index)=>{
    if(/^(?:#|[-*] |\d+\.|> |\|)/m.test(paragraph)||
      paragraph.includes("](")||paragraph.includes("~~~"))return;
    const sentences=paragraph.match(/[^.!?]+[.!?](?:\s|$)|[^.!?]+$/gu)??[];
    if(sentences.some(sentence=>normalize(sentence)===wanted ||
      normalize(sentence).includes(wanted)))matches.push(index);
  });
  return matches.length===1?matches[0]!:null;
}
export function draftExistingArticleSignedCitationsV1(input:{
  bodyMarkdown:string;plan:Readonly<ArticleExecutionPlanV1>;
  runtime:Readonly<MasterRuntimeSnapshotV1>;
}){
  const sections=input.plan.sections.filter(s=>s.state==="WRITABLE");
  const bodies=splitPersistedArticleByCanonicalH2V1(
    input.bodyMarkdown,sections.map(s=>s.heading));
  const audits=bodies.map((body,sectionIndex)=>{
    const allowed=getOwnedVerifiedCitationsV1(
      input.runtime,input.plan,sectionIndex);
    const paragraphs=body.split(/\n{2,}/u),used=new Set<string>();
    const present=new Set([...body.matchAll(
      /\[[^\]]+\]\((https?:\/\/[^)\s]+)\)/gu)]
      .map(m=>urlKey(m[1])).filter(Boolean));
    const proposed:{claimId:string;url:string;sectionIndex:number}[]=[];
    const missing=new Set<string>();
    for(const entry of allowed){
      const key=urlKey(entry.url);
      if(!key||present.has(key)||used.has(key))continue;
      const index=paragraphForFullClaim(body,entry.claimText);
      if(index===null){missing.add(entry.claimId);continue;}
      // Attribution after the already existing full verified sentence.
      // Never introduces/rephrases a factual statement.
      paragraphs[index]+="\n\n[Source: "+entry.publisher+"]("+entry.url+")";
      used.add(key);
      proposed.push({claimId:entry.claimId,url:entry.url,sectionIndex});
    }
    return {
      heading:sections[sectionIndex]!.heading,
      sectionIndex,
      availableVerifiedClaims:new Set(allowed.map(a=>a.claimId)).size,
      originalLinkCount:present.size,
      proposedCitationCount:proposed.length,
      proposed,
      exactClaimAnchorMissing:[...missing],
      proposedBody:paragraphs.join("\n\n"),
    };
  });
  const revised=audits.map(r=>"## "+r.heading+"\n\n"+r.proposedBody)
    .join("\n\n");
  const original=sections.map((s,i)=>
    "## "+s.heading+"\n\n"+bodies[i]).join("\n\n");
  if(normalize(original)!==normalize(input.bodyMarkdown))
    throw new Error("CITATION_REPAIR_UNOWNED_INTRO_OR_TEXT_DRIFT");
  return {
    mode:"READ_ONLY_SIGNED_CITATION_DRAFT_V1",
    proposedBodyMarkdown:revised,
    totalAddedCitations:audits.reduce((n,r)=>n+r.proposedCitationCount,0),
    sections:audits,
    semanticReverificationPerformed:false,nineCriticsPerformed:false,
    serpReplayPerformed:false,commitAllowed:false,
  };
}
