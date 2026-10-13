import {describe,expect,it} from "vitest";
import {
  decodeResearchDiscoveryCheckpointV1,
  encodeResearchDiscoveryCheckpointV1,
} from "./research-discovery-checkpoint-v1";
import type {EvidenceSource} from "./evidence-graph";
const source:EvidenceSource={
  id:"source-1",url:"https://consumer.ftc.gov/example",
  publisher:"Federal Trade Commission",
  sourceType:"PRIMARY_GOVERNMENT",authorityTier:"A",
  retrievedAt:new Date("2026-10-13T04:00:00.000Z"),
};
describe("cost-aware source URL discovery checkpoint",()=>{
  it("reuses bounded sourced URLs and Dates without marking any quote verified",()=>{
    const encoded=encodeResearchDiscoveryCheckpointV1([source]);
    expect(encoded).not.toContain("VERIFIED_EXCERPT");
    const decoded=decodeResearchDiscoveryCheckpointV1(encoded);
    expect(decoded).toHaveLength(1);
    expect(decoded[0]).toEqual(source);
    expect(decoded[0].retrievedAt).toBeInstanceOf(Date);
  });
  it("supports complete but zero-result discovery without replaying paid queries",()=>{
    expect(decodeResearchDiscoveryCheckpointV1(
      encodeResearchDiscoveryCheckpointV1([]),
    )).toEqual([]);
  });
  it("rejects tampered duplicate IDs and unsafe URL scheme",()=>{
    const duplicate=JSON.stringify({
      version:"RESEARCH_DISCOVERY_CHECKPOINT_V1",
      sources:[source,source],
    });
    expect(()=>decodeResearchDiscoveryCheckpointV1(duplicate))
      .toThrow("RESEARCH_DISCOVERY_CHECKPOINT_INVALID:SOURCE_METADATA");
    const unsafe=JSON.stringify({
      version:"RESEARCH_DISCOVERY_CHECKPOINT_V1",
      sources:[{...source,url:"file:///private/etc/passwd"}],
    });
    expect(()=>decodeResearchDiscoveryCheckpointV1(unsafe))
      .toThrow("SOURCE_URL_UNSAFE");
  });
  it("does not accept unrecognized provider authority labels",()=>{
    const wrong=JSON.stringify({
      version:"RESEARCH_DISCOVERY_CHECKPOINT_V1",
      sources:[{...source,authorityTier:"TOP"}],
    });
    expect(()=>decodeResearchDiscoveryCheckpointV1(wrong))
      .toThrow("SOURCE_METADATA");
  });
});
