import {describe,expect,it} from "vitest";
import {buildEvidenceGraph,type ClaimEvidenceKind}
  from "./evidence-graph";
import {buildClaimLedger} from "./claim-ledger";
import {buildResearchRecoveryPublicationSourcesV1}
  from "./research-recovery-publication-bridge-v1";
import {evaluateArticlePublicationPolicy}
  from "./article-publication-policy";
import {analyzeArticleAgainstPlan} from "./content-plan-analysis";

const moneySentence="Credit monitoring can cost anywhere from $0 to $50 per month, depending on the service and level of coverage.";
const url="https://money.com/best-credit-monitoring-services/";
const source={
  id:"source-money",
  url,
  publisher:"Money",
  sourceType:"REPUTABLE_SECONDARY" as const,
  authorityTier:"C" as const,
  retrievedAt:new Date("2026-10-14T12:00:00Z"),
};
function fixture(kind:ClaimEvidenceKind="VERIFIED_EXCERPT",excerpt=moneySentence){
  const graph=buildEvidenceGraph({
    sources:[source],
    claimEvidence:[{
      id:"evidence-money",claimId:"research-section-5-1",
      sourceId:"source-money",kind,relation:"SUPPORTS",excerpt,
    }],
  });
  const ledger=buildClaimLedger({
    claims:[{
      id:"research-section-5-1",text:moneySentence,
      category:"COMPARISON",risk:"MEDIUM",
    }],graph,asOf:new Date("2026-10-14T12:00:00Z"),
  });
  return {graph,ledger};
}
const section={
  state:"WRITABLE",requiredClaimIds:["research-section-5-1"],
  evidenceIds:["evidence-money"],
};

describe("research-to-publication source authority bridge",()=>{
  it("reuses a verified exact excerpt to pass the unchanged external price policy",()=>{
    const {graph,ledger}=fixture();
    expect(ledger.claims[0].status).toBe("VERIFIED");
    const sources=buildResearchRecoveryPublicationSourcesV1({
      existing:[],graph,ledger,sections:[section],
    });
    expect(sources).toHaveLength(1);
    expect(sources[0].evidenceLevel).toBe("VERIFIED_EXCERPT");
    expect(sources[0].discoveredBy).toEqual(["VERIFIED_RESEARCH"]);
    expect(sources[0].url).toBe(url);
    const article={
      title:"What Is Credit Monitoring?",
      metaDescription:"An overview of how credit monitoring services work.",
      h1:"What Is Credit Monitoring?",
      bodyMarkdown:moneySentence,
    };
    const intel=analyzeArticleAgainstPlan({
      ...article,primaryKeyword:"credit monitoring",
      plan:{externalEvidenceSources:sources},
    });
    const result=evaluateArticlePublicationPolicy({article,intelligence:intel});
    expect(result.pass).toBe(true);
    expect(result.blockingIssues).toEqual([]);
  });
  it("upgrades a discovered snippet only by adding separately verified authority",()=>{
    const {graph,ledger}=fixture();
    const discovered={
      id:"discovered-money",url,domain:"money.com",
      title:"Money",excerpt:moneySentence,
      evidenceLevel:"SEARCH_SNIPPET" as const,
      authority:"PUBLISHER" as const,
      discoveredBy:["SERP_ORGANIC" as const],
    };
    const sources=buildResearchRecoveryPublicationSourcesV1({
      existing:[discovered],graph,ledger,sections:[section],
    });
    expect(sources).toHaveLength(2);
    expect(sources[0].evidenceLevel).toBe("SEARCH_SNIPPET");
    expect(sources[1].evidenceLevel).toBe("VERIFIED_EXCERPT");
  });
  it("never promotes snippet-only evidence, even when the text is identical",()=>{
    const {graph,ledger}=fixture("SEARCH_SNIPPET");
    expect(buildResearchRecoveryPublicationSourcesV1({
      existing:[],graph,ledger,sections:[section],
    })).toEqual([]);
  });
  it("does not convert an unrelated or absent excerpt into price evidence",()=>{
    const {graph,ledger}=fixture("VERIFIED_EXCERPT",
      "Some credit monitoring services have paid plans available.");
    expect(buildResearchRecoveryPublicationSourcesV1({
      existing:[],graph,ledger,sections:[section],
    })).toEqual([]);
  });
  it("cannot use evidence outside the authoritative section allocation",()=>{
    const {graph,ledger}=fixture();
    const result=buildResearchRecoveryPublicationSourcesV1({
      existing:[],graph,ledger,
      sections:[{...section,evidenceIds:[]}],
    });
    expect(result).toEqual([]);
  });
  it("does not promote unpublished claims or excluded sources",()=>{
    const {graph,ledger}=fixture();
    expect(buildResearchRecoveryPublicationSourcesV1({
      existing:[],graph,ledger,
      sections:[{...section,state:"DEFERRED_NO_EVIDENCE"}],
    })).toEqual([]);
    const modified=buildEvidenceGraph({
      sources:[{...source,sourceType:"UGC",authorityTier:"F"}],
      claimEvidence:[{
        id:"evidence-money",claimId:"research-section-5-1",
        sourceId:"source-money",kind:"VERIFIED_EXCERPT",
        relation:"SUPPORTS",excerpt:moneySentence,
      }],
    });
    expect(buildResearchRecoveryPublicationSourcesV1({
      existing:[],graph:modified,ledger,sections:[section],
    })).toEqual([]);
  });
});
