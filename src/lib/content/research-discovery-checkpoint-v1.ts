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
  const result=raw as Record<string,unknown>;
  const rows:unknown=result.sources;
  if(result.version!=="RESEARCH_DISCOVERY_CHECKPOINT_V1"||
    !Array.isArray(rows)||rows.length>24)return fail("SCHEMA");
  const seen=new Set<string>();
  return rows.map((entry:unknown):EvidenceSource=>{
    if(!entry||typeof entry!=="object"||Array.isArray(entry))
      fail("SOURCE_FORMAT");
    const s=entry as Record<string,unknown>;
    const id=s.id, url=s.url, publisher=s.publisher;
    const sourceType=s.sourceType,authorityTier=s.authorityTier;
    if(typeof id!=="string"||!id.trim()||
      typeof url!=="string"||typeof publisher!=="string"||
      typeof sourceType!=="string"||!types.has(sourceType)||
      typeof authorityTier!=="string"||!tiers.has(authorityTier)||
      seen.has(id))return fail("SOURCE_METADATA");
    let parsed:URL;
    try{parsed=new URL(url);}catch{return fail("SOURCE_URL");}
    if(!["https:","http:"].includes(parsed.protocol)||
      parsed.username||parsed.password)return fail("SOURCE_URL_UNSAFE");
    seen.add(id);
    const date=(v:unknown):Date=>{
      if(typeof v!=="string")return fail("SOURCE_DATE");
      const d=new Date(v);
      if(!Number.isFinite(d.getTime()))return fail("SOURCE_DATE");
      return d;
    };
    return {
      id,url,publisher,
      sourceType:sourceType as EvidenceSource["sourceType"],
      authorityTier:authorityTier as EvidenceSource["authorityTier"],
      retrievedAt:date(s.retrievedAt),
      ...(typeof s.jurisdiction==="string"
        ?{jurisdiction:s.jurisdiction}:{}),
      ...(s.publishedAt==null?{}:{publishedAt:date(s.publishedAt)}),
      ...(s.updatedAt==null?{}:{updatedAt:date(s.updatedAt)}),
    };
  });
}
