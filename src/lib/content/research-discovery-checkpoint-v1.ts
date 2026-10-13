/**
 * Persist ONLY public discovery metadata from completed DataForSEO
 * searches. Never caches or promotes verified evidence, claims, or
 * source page bodies. Rehydrated URLs are still subject to the
 * production SSRF-safe crawler and strict excerpt verification.
 */
import type {EvidenceSource} from "./evidence-graph";
const types=new Set([
  "PRIMARY_GOVERNMENT","PRIMARY_OFFICIAL","ACADEMIC",
  "REPUTABLE_SECONDARY","COMPETITOR","UGC",
]);
const tiers=new Set(["A","B","C","D","E","F"]);
const fail=(code:string):never=>{
  throw new Error("RESEARCH_DISCOVERY_CHECKPOINT_INVALID:"+code);
};
export function encodeResearchDiscoveryCheckpointV1(
  sources:readonly EvidenceSource[]
):string{
  if(sources.length>24)fail("TOO_MANY_SOURCES");
  return JSON.stringify({
    version:"RESEARCH_DISCOVERY_CHECKPOINT_V1",
    sources,
  });
}
export function decodeResearchDiscoveryCheckpointV1(
  value:string
):EvidenceSource[]{
  let raw:unknown;
  try{raw=JSON.parse(value);}catch{return fail("NOT_JSON");}
  if(!raw||typeof raw!=="object"||Array.isArray(raw))
    fail("NOT_OBJECT");
  const result=raw as {version?:unknown;sources?:unknown};
  if(result.version!=="RESEARCH_DISCOVERY_CHECKPOINT_V1"||
    !Array.isArray(result.sources)||result.sources.length>24)
    fail("SCHEMA");
  const seen=new Set<string>();
  return result.sources.map(entry=>{
    if(!entry||typeof entry!=="object"||Array.isArray(entry))
      fail("SOURCE_FORMAT");
    const s=entry as Record<string,unknown>;
    if(typeof s.id!=="string"||!s.id.trim()||
      typeof s.url!=="string"||typeof s.publisher!=="string"||
      !types.has(String(s.sourceType))||
      !tiers.has(String(s.authorityTier))||
      seen.has(s.id))
      fail("SOURCE_METADATA");
    let parsed:URL;
    try{parsed=new URL(s.url);}catch{return fail("SOURCE_URL");}
    if(!["https:","http:"].includes(parsed.protocol)||
      parsed.username||parsed.password)fail("SOURCE_URL_UNSAFE");
    seen.add(s.id);
    const date=(v:unknown):Date=>{
      if(typeof v!=="string")fail("SOURCE_DATE");
      const d=new Date(v);
      if(!Number.isFinite(d.getTime()))fail("SOURCE_DATE");
      return d;
    };
    return {
      id:s.id,url:s.url,publisher:s.publisher,
      sourceType:s.sourceType as EvidenceSource["sourceType"],
      authorityTier:s.authorityTier as EvidenceSource["authorityTier"],
      retrievedAt:date(s.retrievedAt),
      ...(typeof s.jurisdiction==="string"
        ?{jurisdiction:s.jurisdiction}:{}),
      ...(s.publishedAt==null?{}:{publishedAt:date(s.publishedAt)}),
      ...(s.updatedAt==null?{}:{updatedAt:date(s.updatedAt)}),
    };
  });
}
