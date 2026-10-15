/**
 * SOURCE_FIRST_PAID_CHECKPOINT_DRIFT_REUSE_V1
 *
 * Web pages are not stable: a crawled excerpt, candidate ranking or
 * source availability can change a whole-packet hash without changing
 * the article or its paid research mission. Avoid spending on another
 * identical model inference when a previous saved response can be
 * authorized against the CURRENT immutable quote packet.
 *
 * This is NOT evidence approval. Every claim text is subsequently run
 * through the existing strict source-refetch and semantic verifier.
 */
import {readFile,readdir} from "node:fs/promises";
import {join} from "node:path";
import {findVerifiedExcerptCandidateV1}
  from "./live-evidence-verification";
import {readExistingResearchPlanningCheckpointV1}
  from "./existing-article-research-checkpoint-v1";
import {
  recoverSourceGroundedClaimReplanFromCachedModelV1,
  type SourceGroundedClaimReplacementV1,
  type SourceGroundedReplanSectionV1,
} from "./source-grounded-claim-replan-v1";
import type {ResearchExpansionClaimV1}
  from "./existing-article-research-plan-v1";

const root=".growth-os-tmp/research-recovery/source-grounded";
const pathSegment=/^[a-f0-9]{20}$/;
const fullDigest=/^[a-f0-9]{64}$/;
const marker="EXISTING_ARTICLE_RESEARCH_PAID_PLAN_CHECKPOINT_V1";
interface CachedScopeV1 {
  articleId:string;briefId:string;updatedAt:string;
}
export interface CompatibleSourceReplanCheckpointV1 {
  readonly response:string;
  readonly reusedExistingQuoteIds:number;
  readonly reboundStrictQuoteIds:number;
}
export function rebindCachedSourceReplanToCurrentQuotesV1({
  cachedResponse,packet,originalClaims,
}:{
  cachedResponse:string;
  packet:readonly SourceGroundedReplanSectionV1[];
  originalClaims:readonly ResearchExpansionClaimV1[];
}):CompatibleSourceReplanCheckpointV1|null{
  let replacements:unknown;
  try{
    const decoded=JSON.parse(cachedResponse) as {replacements?:unknown};
    replacements=decoded?.replacements;
  }catch{return null;}
  if(!Array.isArray(replacements)||replacements.length===0||
    replacements.length>18)return null;
  const currentQuotes=packet.flatMap(p=>p.quotes);
  const currentById=new Map(currentQuotes.map(q=>[q.quoteId,q] as const));
  const used=new Set<string>();
  const mapped:SourceGroundedClaimReplacementV1[]=[];
  let preserved=0,rebound=0;
  for(const entry of replacements){
    if(!entry||typeof entry!=="object")return null;
    const x=entry as Record<string,unknown>;
    if(typeof x.claimId!=="string"||
      typeof x.quoteId!=="string"||
      typeof x.text!=="string"||
      x.text.length>320||x.text.length<24)return null;
    let quote=currentById.get(x.quoteId);
    if(quote && quote.claimId===x.claimId && !used.has(quote.quoteId)){
      preserved++;
    }else{
      // Quote IDs are deterministic hashes of the exact fetched excerpt.
      // Rebind only when today's quote is strictly able to support the
      // SAME paid wording under the SAME existing claim ID. An unrelated
      // new page/claim is never entitled to a stale response.
      quote=currentQuotes.find(q=>
        q.claimId===x.claimId&&!used.has(q.quoteId)&&
        findVerifiedExcerptCandidateV1({
          claimText:x.text as string,bodyText:q.excerpt,
        })!==null);
      if(!quote)return null;
      rebound++;
    }
    used.add(quote.quoteId);
    mapped.push({claimId:x.claimId,quoteId:quote.quoteId,text:x.text});
  }
  // The unchanged normal recovery validator must authorize every quote,
  // enforce section ownership and find distinct atomic source facts.
  try{
    recoverSourceGroundedClaimReplanFromCachedModelV1({
      packet,replacements:mapped,originalClaims,
    });
  }catch{return null;}
  return {
    response:JSON.stringify({replacements:mapped}),
    reusedExistingQuoteIds:preserved,
    reboundStrictQuoteIds:rebound,
  };
}
export async function findCompatibleSourceReplanCheckpointV1({
  scope,packet,originalClaims,
}:{
  scope:CachedScopeV1;
  packet:readonly SourceGroundedReplanSectionV1[];
  originalClaims:readonly ResearchExpansionClaimV1[];
}):Promise<CompatibleSourceReplanCheckpointV1|null>{
  if(!/^[A-Za-z0-9_-]{5,100}$/.test(scope.articleId)||
    !/^[A-Za-z0-9_-]{5,100}$/.test(scope.briefId)||
    !Number.isFinite(Date.parse(scope.updatedAt)))return null;
  let folders:string[];
  try{
    folders=(await readdir(root)).filter(name=>pathSegment.test(name))
      .sort().reverse().slice(0,128);
  }catch(error){
    if((error as NodeJS.ErrnoException).code==="ENOENT")return null;
    throw error;
  }
  for(const folder of folders){
    const directory=join(root,folder);
    let metadata:unknown;
    try{
      metadata=JSON.parse(await readFile(
        join(directory,scope.articleId+"-planning.json"),"utf8"));
    }catch(error){
      if((error as NodeJS.ErrnoException).code==="ENOENT")continue;
      // Do not use corrupt or unexpected checkpoint files.
      continue;
    }
    const payload=(metadata as {payload?:Record<string,unknown>})
      ?.payload;
    if(!payload||payload.version!==marker||
      payload.articleId!==scope.articleId||
      payload.briefId!==scope.briefId||
      payload.updatedAt!==scope.updatedAt||
      typeof payload.evidenceSha256!=="string"||
      !fullDigest.test(payload.evidenceSha256)||
      folder!==payload.evidenceSha256.slice(0,20))continue;
    let raw:string|null;
    try{
      // Reuse the original SHA-256-integrity and immutable-scope reader:
      // never trust unverified JSON from an old response on disk.
      raw=await readExistingResearchPlanningCheckpointV1({
        ...scope,evidenceSha256:payload.evidenceSha256,directory,
      });
    }catch{continue;}
    if(!raw)continue;
    const compatible=rebindCachedSourceReplanToCurrentQuotesV1({
      cachedResponse:raw,packet,originalClaims,
    });
    if(compatible)return compatible;
  }
  return null;
}
