/**
 * A read-only view of WHY a candidate claim did not become
 * VERIFIED_EXCERPT. Public fetched pages are discovery context.
 * Near matches are NEVER promoted to proof. No loosened thresholds.
 */
import {
  findVerifiedExcerptCandidateV1,
  rankEvidenceRecoveryExcerptsV1,
} from "./live-evidence-verification";

export type DiagnosisClaimV1=Readonly<{
  id:string;sectionId:string;text:string;
}>;
export type DiagnosisSourceV1=Readonly<{
  id:string;url:string;
}>;
export interface DiagnosisBodyV1{
  readonly sourceId:string;
  readonly bodyText:string|null;
  readonly status:"FETCHED"|"FETCH_FAILED";
}
export function inspectResearchRecoveryEvidenceV1({
  claims,sources,bodies,
}:{
  claims:readonly DiagnosisClaimV1[];
  sources:readonly DiagnosisSourceV1[];
  bodies:readonly DiagnosisBodyV1[];
}){
  const fetched=new Map(bodies
    .filter(b=>b.status==="FETCHED"&&b.bodyText)
    .map(b=>[b.sourceId,b.bodyText!] as const));
  const claimDiagnostics=claims.map(claim=>{
    const verified: Array<{sourceId:string;host:string;coverage:number}>=[];
    const near:Array<{
      sourceId:string;host:string;coverage:number;preview:string;
    }>=[];
    for(const source of sources){
      const text=fetched.get(source.id);
      if(!text)continue;
      let host:string;
      try{host=new URL(source.url).hostname;}catch{host="invalid";}
      const exact=findVerifiedExcerptCandidateV1({
        claimText:claim.text,bodyText:text,
      });
      if(exact){
        verified.push({
          sourceId:source.id,host,coverage:exact.coverage,
        });
        continue;
      }
      const candidates=rankEvidenceRecoveryExcerptsV1({
        claimText:claim.text,bodyText:text,maxCandidates:1,
      });
      if(candidates.length){
        near.push({
          sourceId:source.id,host,
          coverage:candidates[0].coverage,
          preview:candidates[0].excerpt.slice(0,200),
        });
      }
    }
    const byCoverage=(a:{coverage:number},b:{coverage:number})=>
      b.coverage-a.coverage;
    return {
      sectionId:claim.sectionId,claimId:claim.id,claim:claim.text,
      strictMatches:verified.length,
      strictSourceDomains:[...new Set(verified.map(v=>v.host))],
      bestStrict:verified.sort(byCoverage).slice(0,2),
      nearMatches:near.sort(byCoverage).slice(0,2),
      verdict:verified.length>0
        ?"LEXICALLY_VERIFIED_NOT_SEMANTICALLY_REVIEWED"
        :near.length>0
          ?"FETCHED_RELEVANT_CONTEXT_BUT_NOT_VERIFIED"
          :"NO_MATCHING_FETCHED_EVIDENCE",
    };
  });
  return {
    version:"RESEARCH_RECOVERY_EVIDENCE_DIAGNOSTICS_V1",
    fetchedSources:fetched.size,
    attemptedSources:sources.length,
    verifiedClaims:claimDiagnostics.filter(x=>x.strictMatches>0).length,
    nearOnlyClaims:claimDiagnostics.filter(x=>x.strictMatches===0&&
      x.nearMatches.length>0).length,
    unmatchedClaims:claimDiagnostics.filter(x=>x.strictMatches===0&&
      x.nearMatches.length===0).length,
    claimDiagnostics,
    warning:"These results are lexical diagnostics only; no source is promoted to VERIFIED_EXCERPT and no semantic model is called.",
  };
}
