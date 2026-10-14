/**
 * SOURCE_GROUNDED_CLAIM_REPLAN_V1
 *
 * Source-first claim recovery: an old speculative claim cannot force
 * a publisher's quote to change its meaning. Only a REAL fetched
 * excerpt, scoped to a fixed existing section, may propose a revised
 * atomic claim. This builds candidates; it NEVER grants evidence authority.
 *
 * Positive model proposals must later pass unchanged strict quote
 * verifier AND separately the full semantic entailment reviewer.
 */
import {createHash} from "node:crypto";
import {
  findVerifiedExcerptCandidateV1,
  type EvidenceClaimRecoveryCandidateV1,
} from "./live-evidence-verification";
import type {EvidenceSource} from "./evidence-graph";
import type {ResearchExpansionClaimV1}
  from "./existing-article-research-plan-v1";
type Section=Readonly<{id:string;heading:string;mission:string;}>;
export interface SourceGroundedReplanQuoteV1 {
  readonly quoteId:string;
  readonly claimId:string;
  readonly sourceId:string;
  readonly sourceUrl:string;
  readonly excerpt:string;
  readonly coverage:number;
}
export interface SourceGroundedReplanSectionV1 {
  readonly sectionId:string;
  readonly heading:string;
  readonly mission:string;
  readonly claimIds:readonly string[];
  readonly quotes:readonly SourceGroundedReplanQuoteV1[];
}
export interface SourceGroundedClaimReplacementV1{
  readonly claimId:string;
  readonly quoteId:string;
  readonly text:string;
}
const code=(why:string)=>new Error("SOURCE_GROUNDED_CLAIM_REPLAN_INVALID:"+why);
const digest=(s:string)=>createHash("sha256").update(s,"utf8")
  .digest("hex").slice(0,16);
const relevantAuthority=(s:EvidenceSource|undefined)=>
  s!==undefined&&["A","B","C"].includes(s.authorityTier) &&
  ["PRIMARY_GOVERNMENT","PRIMARY_OFFICIAL","ACADEMIC",
    "REPUTABLE_SECONDARY"].includes(s.sourceType);
export function buildSourceGroundedReplanPacketV1({
  sections,claims,candidates,sources,
}:{
  sections:readonly Section[];
  claims:readonly ResearchExpansionClaimV1[];
  candidates:readonly EvidenceClaimRecoveryCandidateV1[];
  sources:readonly EvidenceSource[];
}):readonly SourceGroundedReplanSectionV1[]{
  if(sections.length===0||sections.length>8)
    throw code("SECTION_SCOPE");
  const bySource=new Map(sources.map(s=>[s.id,s] as const));
  const seenSection=new Set<string>();
  const result:SourceGroundedReplanSectionV1[]=[];
  for(const section of sections){
    if(!section.id||seenSection.has(section.id))
      throw code("DUPLICATE_SECTION");
    seenSection.add(section.id);
    const owned=claims.filter(c=>c.sectionId===section.id);
    const validIds=new Set(owned.map(c=>c.id));
    const matches=candidates.filter(c=>
      validIds.has(c.claimId)&&
      relevantAuthority(bySource.get(c.sourceId))&&
      c.excerpt.trim().length>=45&&
      c.excerpt.trim().length<=1100&&
      c.coverage>=0.35&&
      c.coverage<1.01);
    const ranked=[...matches].sort((a,b)=>{
      const tier=(v:EvidenceClaimRecoveryCandidateV1)=>
        bySource.get(v.sourceId)?.authorityTier==="A"?0:
        bySource.get(v.sourceId)?.authorityTier==="B"?1:2;
      return tier(a)-tier(b)||
        b.coverage-a.coverage||
        a.sourceUrl.localeCompare(b.sourceUrl);
    });
    const usedHosts=new Set<string>();
    const quotes:SourceGroundedReplanQuoteV1[]=[];
    const usedClaimIds=new Set<string>();
    const selectQuote=(match:EvidenceClaimRecoveryCandidateV1)=>{
      let host="";
      try{host=new URL(match.sourceUrl).hostname.toLowerCase();}
      catch{return false;}
      if(usedHosts.has(host))return false;
      const excerpt=match.excerpt.trim();
      quotes.push({
        quoteId:"quote-"+digest([
          section.id,match.claimId,match.sourceId,excerpt,
        ].join("\u0000")),
        claimId:match.claimId,
        sourceId:match.sourceId,
        sourceUrl:match.sourceUrl,
        excerpt,
        coverage:match.coverage,
      });
      usedHosts.add(host);
      usedClaimIds.add(match.claimId);
      return true;
    };
    // Give several distinct atomic facets a chance before spending
    // all four quote slots on the first high-ranked claim.
    for(const match of ranked){
      if(usedClaimIds.has(match.claimId))continue;
      selectQuote(match);
      if(quotes.length>=4)break;
    }
    for(const match of ranked){
      if(quotes.length>=4)break;
      selectQuote(match);
    }
    result.push({
      sectionId:section.id,heading:section.heading,
      mission:section.mission,claimIds:owned.map(c=>c.id),
      quotes,
    });
  }
  return result;
}
export function validateSourceGroundedClaimReplanV1({
  packet,replacements,originalClaims,
}:{
  packet:readonly SourceGroundedReplanSectionV1[];
  replacements:readonly SourceGroundedClaimReplacementV1[];
  originalClaims:readonly ResearchExpansionClaimV1[];
}):readonly ResearchExpansionClaimV1[]{
  // One or two separately sourced, atomic facts may be recovered
  // for each missing section. More facts require more source authority,
  // NOT repeating the same quote or inventing a new claim id.
  if(!Array.isArray(replacements)||
    replacements.length<packet.length||
    replacements.length>packet.length*2)
    throw code("REPLACEMENT_SECTION_COVERAGE");
  const claimed=new Map(originalClaims.map(c=>[c.id,c] as const));
  const authorized=new Map(packet.flatMap(section=>
    section.quotes.map(q=>[q.quoteId,{
      ...q,sectionId:section.sectionId,
    }] as const)));
  const requiredSections=new Set(packet.map(s=>s.sectionId));
  const seenClaims=new Set<string>(),seenQuotes=new Set<string>();
  const sectionCounts=new Map<string,number>();
  const patches=new Map<string,ResearchExpansionClaimV1>();
  for(const output of replacements){
    if(!output||typeof output.claimId!=="string"||
      typeof output.quoteId!=="string"||
      typeof output.text!=="string")
      throw code("FORMAT");
    const existing=claimed.get(output.claimId);
    const quote=authorized.get(output.quoteId);
    const replacement=output.text.trim();
    if(!existing||!quote||existing.sectionId!==quote.sectionId||
      existing.id!==quote.claimId||
      seenClaims.has(existing.id)||seenQuotes.has(quote.quoteId)||
      (sectionCounts.get(existing.sectionId)??0)>=2||
      !requiredSections.has(existing.sectionId))
      throw code("UNAUTHORIZED_CLAIM_OR_QUOTE");
    if(replacement.length<24||replacement.length>320||
      !/[.!?]$/.test(replacement))
      throw code("CLAIM_TEXT_INVALID");
    const strictlyVerified=findVerifiedExcerptCandidateV1({
      claimText:replacement,bodyText:quote.excerpt,
    });
    if(!strictlyVerified)
      throw code("PROPOSED_TEXT_NOT_STRICTLY_SUPPORTED_BY_EXCERPT");
    if(replacement.toLowerCase()===existing.text.toLowerCase())
      throw code("UNMODIFIED_SPECULATIVE_CLAIM");
    patches.set(existing.id,{...existing,text:replacement});
    seenClaims.add(existing.id);
    seenQuotes.add(quote.quoteId);
    sectionCounts.set(existing.sectionId,
      (sectionCounts.get(existing.sectionId)??0)+1);
  }
  if([...requiredSections].some(id=>!sectionCounts.has(id)))
    throw code("MISSING_SECTION_REPLACEMENT");
  return originalClaims.map(c=>patches.get(c.id)??c);
}
