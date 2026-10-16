/**
 * Provenance-preserving bridge between the strict research Claim Ledger and
 * the independent external Publication Policy.
 *
 * Never promotes a snippet, candidate, unsupported claim or unassigned
 * evidence. A single original verified excerpt remains one source record:
 * do NOT concatenate separate excerpts to manufacture price support.
 */
import type {EvidenceGraph} from "./evidence-graph";
import type {ClaimLedger} from "./claim-ledger";
import {
  externalEvidenceSourceId,
  type ExternalEvidenceSource,
  type ExternalEvidenceAuthority,
} from "./external-evidence-sources";
import {findVerifiedExcerptCandidateV1}
  from "./live-evidence-verification";

type SectionScope=Readonly<{
  state:string;
  requiredClaimIds:readonly string[];
  evidenceIds:readonly string[];
}>;

function publicationAuthority(
  sourceType:string,
  hostname:string
):ExternalEvidenceAuthority{
  if(sourceType==="PRIMARY_GOVERNMENT" && hostname.endsWith(".gov"))
    return "GOVERNMENT";
  if(/(?:^|\.)(?:equifax|experian|transunion)\.com$/.test(hostname))
    return "CREDIT_BUREAU";
  if(sourceType==="REPUTABLE_SECONDARY")return "PUBLISHER";
  return "OTHER";
}

export function buildResearchRecoveryPublicationSourcesV1({
  existing,graph,ledger,sections,
}:{
  existing:readonly ExternalEvidenceSource[];
  graph:Readonly<EvidenceGraph>;
  ledger:Readonly<ClaimLedger>;
  sections:readonly SectionScope[];
}):ExternalEvidenceSource[]{
  const requiredIds=new Set(sections.filter(s=>s.state==="WRITABLE")
    .flatMap(s=>s.requiredClaimIds));
  const evidenceIds=new Set(sections.filter(s=>s.state==="WRITABLE")
    .flatMap(s=>s.evidenceIds));
  const claims=new Map(ledger.claims.map(c=>[c.id,c] as const));
  const sources=new Map(graph.sources.map(s=>[s.id,s] as const));
  const additions:ExternalEvidenceSource[]=[];
  // A cached SERP snippet is not a duplicate of a newly verified quote.
  const seen=new Set(existing.filter(s=>s.evidenceLevel==="VERIFIED_EXCERPT")
    .map(s=>s.url+"|"+s.excerpt));
  for(const evidence of graph.claimEvidence){
    if(!evidenceIds.has(evidence.id) || !requiredIds.has(evidence.claimId) ||
      evidence.kind!=="VERIFIED_EXCERPT" ||
      evidence.relation!=="SUPPORTS" || !evidence.excerpt?.trim())
      continue;
    const claim=claims.get(evidence.claimId);
    const source=sources.get(evidence.sourceId);
    if(!claim || claim.status!=="VERIFIED" ||
      !claim.evidenceIds.includes(evidence.id) || !source ||
      source.sourceType==="UGC" || source.sourceType==="COMPETITOR")
      continue;
    // Reuse the *same* strict lexical support invariant enforced by
    // assertStoredPublicationEvidenceV1, in addition to the research ledger.
    if(findVerifiedExcerptCandidateV1({
      claimText:claim.text,bodyText:evidence.excerpt,
    })===null)continue;
    let url:URL;
    try{url=new URL(source.url);}catch{continue;}
    if(url.protocol!=="https:")continue;
    const excerpt=evidence.excerpt.trim();
    const key=url.toString()+"|"+excerpt;
    if(seen.has(key))continue;
    seen.add(key);
    const domain=url.hostname.toLocaleLowerCase("en-US").replace(/^www\./,"");
    additions.push({
      id:externalEvidenceSourceId(url.toString())+":"+evidence.id,
      url:url.toString(),
      domain,
      title:source.publisher,
      excerpt,
      evidenceLevel:"VERIFIED_EXCERPT",
      authority:publicationAuthority(source.sourceType,domain),
      discoveredBy:["VERIFIED_RESEARCH"],
    });
  }
  return [...existing,...additions];
}
