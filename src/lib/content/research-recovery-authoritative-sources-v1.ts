/**
 * Explicit, local-only recovery source seeds.
 *
 * A user-authorized, known government URL is an additional CANDIDATE
 * for the SSRF-safe crawler, strict excerpt matcher, and semantic
 * entailment reviewer. Its authority class is not evidence approval.
 * Never import arbitrary commercial URLs as "authoritative" sources.
 */
import {createHash} from "node:crypto";
import type {EvidenceSource} from "./evidence-graph";

const invalid=(why:string):never=>{
  throw new Error("RESEARCH_RECOVERY_SOURCE_SEED_INVALID:"+why);
};
export function buildResearchRecoveryGovernmentSeedsV1(
  urls:readonly string[],
  existing:readonly EvidenceSource[],
):EvidenceSource[]{
  if(urls.length>6)invalid("TOO_MANY");
  const existingUrls=new Set(existing.map(s=>s.url));
  const visited=new Set<string>();
  const now=new Date();
  const seeds:EvidenceSource[]=[];
  for(const raw of urls){
    if(typeof raw!=="string"||raw.length>1500)
      invalid("URL");
    let url:URL;
    try{url=new URL(raw);}catch{return invalid("URL");}
    const host=url.hostname.toLowerCase();
    // Only literal US .gov hosts; no numeric hosts, userinfo, odd
    // ports, protocol downgrades, or misleading .gov.evil.com.
    if(url.protocol!=="https:"||
      !/^(?:[a-z0-9-]+\.)*[a-z0-9-]+\.gov$/.test(host)||
      url.username||url.password||
      (url.port!==""&&url.port!=="443")||
      url.search.length>0||url.hash.length>0)
      invalid("NOT_GOVERNMENT_HTTPS");
    const normalized=url.toString();
    if(visited.has(normalized))invalid("DUPLICATE_URL");
    visited.add(normalized);
    if(existingUrls.has(normalized))continue;
    seeds.push({
      id:"research-gov-"+createHash("sha256")
        .update(normalized).digest("hex").slice(0,14),
      url:normalized,publisher:host,sourceType:"PRIMARY_GOVERNMENT",
      authorityTier:"A",retrievedAt:now,
      jurisdiction:"US",
    });
  }
  return seeds;
}
