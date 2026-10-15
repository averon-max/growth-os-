/**
 * Fail-closed, bounded response to a semantic entailment rejection.
 *
 * A near-lexical claim can be broader than its real source. Select
 * ONE atomic source-literal sentence for each under-deep section,
 * reusing the EXISTING rejected claim ID and the precise, already
 * fetched and lexically verified source excerpt. It is never approved
 * here: a subsequent clean strict refetch + semantic pass is required.
 */
import type {EvidenceSource,ClaimEvidence} from "./evidence-graph";
import type {ResearchExpansionClaimV1}
  from "./existing-article-research-plan-v1";
import type {
  OfficialPostSemanticProcedureAlternativeV1,
  PostSemanticComparisonAlternativeV1,
} from "./live-evidence-verification";
import {isServiceChoiceSectionV1,isServiceChoiceSourceFactV1,
  scoreServiceChoiceDecisionFactV1,
} from "./live-evidence-verification";

type Section={id:string;heading:string;mission:string};
export interface PostSemanticNarrowingV1{
  claimId:string;sectionId:string;text:string;
  sourceId:string;sourceEvidenceId:string;
}
const tokens=(s:string)=>[...new Set(
  (s.toLowerCase().match(/[\p{L}\p{N}]+/gu)??[])
    .filter(x=>x.length>3&&!new Set([
      "with","that","this","from","have","were","they","their",
      "your","after","before","should","what","which","when",
      "does","would","there","about","into","some","many",
      "information","people","person","service","services",
    ]).has(x)))];
const similarity=(a:string,b:string)=>{
  const x=new Set(tokens(a)),y=new Set(tokens(b));
  return [...x].filter(k=>y.has(k)).length/
    Math.max(1,new Set([...x,...y]).size);
};
const comparisonQuestion=isServiceChoiceSectionV1;
const comparisonFact=isServiceChoiceSourceFactV1;
const repeatedBureauFacet=(sentence:string,known:readonly string[])=>
  /\b(?:one|two|three|all|each|every|single)\b/i.test(sentence)&&
  /\bbureaus?\b/i.test(sentence)&&known.some(text=>
    /\bbureaus?\b/i.test(text)&&
    /\b(?:one|two|three|all|each|every|single)\b/i.test(text));
const procedureQuestion=(s:string)=>
  /\b(?:what (?:should|can|do)|how (?:do|to|can)|steps? to)\b/i.test(s)&&
  // "How to choose/compare" is an evaluation, not a repair action.
  !/\b(?:choose|compare|select|pick|evaluate|decide)\b/i.test(s);
const humanResponseAction=/\b(?:contact|dispute|review|check|report|file|investigate|correct|verify|request|submit|call|place|freeze|block)\b/i;
/**
 * Distinguish an actual consumer instruction from website navigation,
 * a company's duty or a description of an alerting product.
 *
 * This is a CANDIDATE FILTER, never a verification or semantic verdict.
 * Require an explicit reader-directed imperative or a reader-focused
 * "if you..." / "to correct..." clause leading to an action verb.
 */
export function isReaderInitiatedResponseStepV1(sentence:string):boolean{
  const clean=sentence.trim();
  if(clean.length<55||clean.length>320||!/[.!]$/.test(clean)||
    clean.includes("?"))return false;
  return /^(?:(?:if|when)\s+you\b[^,]{0,140},\s*)?(?:to\s+(?:correct|dispute|verify|review|check|report|investigate|protect|resolve|fix)\b[^,]{0,140},\s*)?(?:you\s+(?:should|must|can|need\s+to)\s+)?(?:contact|dispute|review|check|report|file|investigate|correct|verify|request|submit|call|place|freeze|block)\b/i.test(clean);
}
const sentenceParts=(text:string):readonly string[]=>text
  .replace(/\s+/g," ").trim()
  .split(/(?<=[.!?])\s+/)
  .map(s=>s.trim())
  .filter(s=>s.length>=55&&s.length<=320&&/[.!?]$/.test(s));
export function selectPostSemanticSourceNarrowingV1({
  sections,claims,sources,originalEvidence,demotedEvidenceIds,
  approvedClaimIds,officialAlternatives=[],comparisonAlternatives=[],
}:{
  sections:readonly Section[];
  claims:readonly ResearchExpansionClaimV1[];
  sources:readonly EvidenceSource[];
  originalEvidence:readonly ClaimEvidence[];
  demotedEvidenceIds:readonly string[];
  approvedClaimIds:readonly string[];
  officialAlternatives?:readonly OfficialPostSemanticProcedureAlternativeV1[];
  comparisonAlternatives?:readonly PostSemanticComparisonAlternativeV1[];
}):readonly PostSemanticNarrowingV1[]{
  const sourceById=new Map(sources.map(s=>[s.id,s] as const));
  const demoted=new Set(demotedEvidenceIds);
  const approved=new Set(approvedClaimIds);
  const output:PostSemanticNarrowingV1[]=[];
  const usedTexts=new Set<string>();
  for(const section of sections){
    const sectionClaims=claims.filter(c=>c.sectionId===section.id);
    const good=sectionClaims.filter(c=>approved.has(c.id));
    if(good.length>=2)continue;
    const rejected=sectionClaims.filter(c=>!approved.has(c.id));
    if(rejected.length===0)continue;
    const focus=new Set(tokens(section.heading+" "+section.mission));
    const headingTokens=new Set(tokens(section.heading));
    const missionSpecific=new Set(tokens(section.mission)
      .filter(t=>!headingTokens.has(t)));
    const prior=good.map(c=>c.text);
    const candidates=rejected.flatMap(claim=>
      originalEvidence.filter(e=>e.claimId===claim.id&&
        demoted.has(e.id)&&e.kind==="VERIFIED_EXCERPT"&&
        e.relation==="SUPPORTS"&&!!e.excerpt).flatMap(e=>{
        const src=sourceById.get(e.sourceId);
        if(!src||!["A","B","C"].includes(src.authorityTier)||
          !["PRIMARY_GOVERNMENT","PRIMARY_OFFICIAL","ACADEMIC",
            "REPUTABLE_SECONDARY"].includes(src.sourceType))return [];
        return sentenceParts(e.excerpt!).filter(sentence=>{
          const shared=tokens(sentence).filter(t=>focus.has(t)).length;
          if(shared<2||
            procedureQuestion(section.heading)&&
              !isReaderInitiatedResponseStepV1(sentence)||
            comparisonQuestion(section.heading)&&
              (!comparisonFact(sentence)||repeatedBureauFacet(sentence,prior))||
            sentence.toLowerCase()===claim.text.toLowerCase()||
            usedTexts.has(sentence.toLowerCase())||
            prior.some(x=>similarity(x,sentence)>0.7))return false;
          // This is ONLY a candidate literal sentence. The caller
          // must re-fetch the page, pass the unchanged strict verifier,
          // and then obtain an independent semantic verdict.
          return true;
        }).map(sentence=>({
          claim,source:src,evidence:e,sentence,
          score:tokens(sentence).filter(t=>focus.has(t)).length+
            4*tokens(sentence).filter(t=>missionSpecific.has(t)).length+
            (comparisonQuestion(section.heading)
              ?scoreServiceChoiceDecisionFactV1(sentence):0),
        }));
      }));
    // Rejecting a too-broad old assertion does NOT mean every OTHER
    // sentence on its official source page is unsupported. If there
    // is no suitable literal from the rejected evidence pair, allow
    // an independent, previously fetched official sentence for this
    // existing, still-rejected claim. Strict live re-fetch + semantic
    // review in the calling pipeline remain mandatory.
    if(candidates.length===0&&procedureQuestion(section.heading)){
      for(const alt of officialAlternatives.filter(x=>
        x.sectionId===section.id)){
        const source=sourceById.get(alt.sourceId);
        if(!source||source.sourceType!=="PRIMARY_GOVERNMENT"||
          source.authorityTier!=="A")continue;
        let url:URL;
        try{url=new URL(alt.sourceUrl);}catch{continue;}
        if(url.protocol!=="https:"||
          !url.hostname.toLowerCase().endsWith(".gov")||
          source.url!==alt.sourceUrl)continue;
        const sentence=alt.text.trim();
        const shared=tokens(sentence).filter(t=>focus.has(t)).length;
        if(sentence.length<55||sentence.length>320||
          !/[.!?]$/.test(sentence)||
          // A source-backed consumer instruction about a CREDIT report
          // addresses credit-alert response even if the saved mission
          // uses different verbs ("act", "respond", "investigate").
          (shared<2&&!(shared>=1&&focus.has("credit")&&
            /\bcredit\s+(?:report|bureau)\b/i.test(sentence)))||
          !isReaderInitiatedResponseStepV1(sentence)||
          !humanResponseAction.test(sentence)||
          usedTexts.has(sentence.toLowerCase())||
          prior.some(p=>similarity(p,sentence)>0.7))continue;
        const candidateClaim=rejected.find(c=>
          c.text.toLowerCase()!==sentence.toLowerCase());
        if(!candidateClaim)continue;
        candidates.push({
          claim:candidateClaim,source,
          evidence:{
            id:"UNVERIFIED_OFFICIAL_PROCEDURE_ALTERNATIVE",
            claimId:candidateClaim.id,sourceId:source.id,
            kind:"REFERENCE_ONLY",relation:"PARTIALLY_SUPPORTS",
          } as ClaimEvidence,
          sentence,
          score:shared+4*tokens(sentence)
            .filter(t=>missionSpecific.has(t)).length,
        });
      }
    }
    if(candidates.length===0&&comparisonQuestion(section.heading)){
      for(const alt of comparisonAlternatives.filter(x=>
        x.sectionId===section.id)){
        const source=sourceById.get(alt.sourceId);
        if(!source||!["A","B","C"].includes(source.authorityTier)||
          !["PRIMARY_GOVERNMENT","PRIMARY_OFFICIAL","ACADEMIC",
            "REPUTABLE_SECONDARY"].includes(source.sourceType)||
          source.url!==alt.sourceUrl)continue;
        const sentence=alt.text.trim();
        if(sentence.length<65||sentence.length>320||
          !/[.!]$/.test(sentence)||!comparisonFact(sentence)||
          repeatedBureauFacet(sentence,prior)||
          usedTexts.has(sentence.toLowerCase())||
          prior.some(p=>similarity(p,sentence)>0.7))continue;
        const shared=tokens(sentence).filter(t=>focus.has(t)).length;
        if(shared<2)continue;
        const claim=rejected.find(c=>
          c.text.toLowerCase()!==sentence.toLowerCase());
        if(!claim)continue;
        candidates.push({
          claim,source,
          evidence:{
            id:"UNVERIFIED_TRUSTED_COMPARISON_ALTERNATIVE",
            claimId:claim.id,sourceId:source.id,
            kind:"REFERENCE_ONLY",relation:"PARTIALLY_SUPPORTS",
          } as ClaimEvidence,
          sentence,score:shared+4*tokens(sentence)
            .filter(t=>missionSpecific.has(t)).length+
            scoreServiceChoiceDecisionFactV1(sentence),
        });
      }
    }
    candidates.sort((a,b)=>
      (a.source.sourceType==="PRIMARY_GOVERNMENT"?0:1)-
      (b.source.sourceType==="PRIMARY_GOVERNMENT"?0:1)||
      b.score-a.score||
      a.sentence.length-b.sentence.length||
      a.source.id.localeCompare(b.source.id));
    const chosen=candidates[0];
    if(!chosen)continue;
    output.push({
      claimId:chosen.claim.id,sectionId:section.id,
      text:chosen.sentence,sourceId:chosen.source.id,
      sourceEvidenceId:chosen.evidence.id,
    });
    usedTexts.add(chosen.sentence.toLowerCase());
  }
  return output;
}
