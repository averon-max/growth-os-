import {describe,expect,it} from "vitest";
import {evaluateArticleSearchReadinessV2,inspectProseJoinAnomaliesV2}
  from "./article-search-readiness-v2";
import {buildSerpReplayArticleFingerprintV1} from "./serp-replay-fingerprint";
import type {MasterRuntimeSnapshotV1} from "./master-runtime-adapter";
import type {ArticleExecutionPlanV1} from "./article-execution-plan-v1";

const article={
  title:"What Is Credit Monitoring? How It Works and Its Limits",
  metaDescription:"An introduction to credit monitoring",
  h1:"What Is Credit Monitoring?",
  bodyMarkdown:"## What is credit monitoring?\n\nThis guide explains what is credit monitoring and how alerts work.\n"+
    "## How does credit monitoring work?\n\nFree credit monitoring can provide alerts.\n"+
    "## Service coverage\n\n3 bureau credit monitoring may cover multiple reports.",
};
const plan={
  requiredQuestions:[],
  sections:[{state:"WRITABLE",requiredQuestionIds:[]}],
} as unknown as ArticleExecutionPlanV1;
const runtime={
  mission:{location:"United States",language:"English",
    jurisdiction:"US",riskClass:"YMYL_FINANCE"},
  queryGraph:{missionIntent:"INFORMATIONAL",
    samePageNodeIds:["node-real"],
    provenance:[{nodeId:"node-real",sources:["DATAFORSEO"]}],
    nodes:[{id:"node-real",query:"how often do credit monitoring alerts update",
      cluster:"alert-delivery",intent:"INFORMATIONAL",
      subIntent:"alert frequency",sourceConfidence:0.84,
      searchVolume:undefined,gscImpressions:undefined}]},
  sectionBlueprints:{sections:[
    {heading:"How does credit monitoring work?",
      queryNodeIds:["node-real"]},
  ]},
  serpResearch:{country:"United States",language:"English",
    results:[{url:"https://example.org/a"},{url:"https://example.org/b"},
      {url:"https://example.org/c"}]},
} as unknown as MasterRuntimeSnapshotV1;
const replay={
  executionStatus:"SUCCEEDED",
  replayStatus:"WARN",
  articleFingerprintAlgo:"SHA256_V1",
  articleFingerprint:buildSerpReplayArticleFingerprintV1(article),
  warnings:["COMPETITOR_DETAIL_MISSING"],
};
const audit=(overrides:Partial<Parameters<typeof evaluateArticleSearchReadinessV2>[0]>={})=>
  evaluateArticleSearchReadinessV2({
    article,runtime,plan,replay,primaryKeyword:"what is credit monitoring",
    secondaryKeywords:["free credit monitoring","3 bureau credit monitoring"],
    ...overrides,
  });
describe("real-evidence SEO readiness never confused with 3/3 brief tokens",()=>{
  it("3/3 exact keywords are not SEO readiness without real observed related queries",()=>{
    const empty={
      ...runtime,queryGraph:{...(runtime.queryGraph),
        nodes:[],provenance:[],samePageNodeIds:[]},
    } as unknown as MasterRuntimeSnapshotV1;
    const result=audit({runtime:empty});
    expect(result.briefLexicalCoverage).toHaveLength(3);
    expect(result.briefLexicalCoverage.every(k=>k.exactMentions>0)).toBe(true);
    expect(result.status).toBe("RESEARCH_REQUIRED");
    expect(result.canClaimSeoReady).toBe(false);
    expect(result.findings.map(x=>x.code)).toContain(
      "NO_OBSERVED_SUPPORTING_QUERIES");
  });
  it("maps REAL market query to its exact H2 and preserves unknown metrics as null",()=>{
    const result=audit();
    expect(result.observedSupportingQueries).toBe(1);
    expect(result.assignedSupportingQueries).toBe(1);
    expect(result.observedQueryClusters[0].queries[0]).toMatchObject({
      query:"how often do credit monitoring alerts update",
      ownerHeading:"How does credit monitoring work?",
      sources:["DATAFORSEO"],searchVolume:null,gscImpressions:null,
    });
    expect(result.findings.map(x=>x.code)).not.toContain(
      "NO_OBSERVED_SUPPORTING_QUERIES");
    expect(result.findings.map(x=>x.code)).toContain("SERP_REPLAY_WARN");
  });
  it("rejects synthetic MANUAL or AI-model guessed queries as observed demand",()=>{
    const suspect={
      ...runtime,queryGraph:{...runtime.queryGraph,
        provenance:[{nodeId:"node-real",sources:["MANUAL","AI_MODE"]}]},
    } as unknown as MasterRuntimeSnapshotV1;
    expect(audit({runtime:suspect}).observedSupportingQueries).toBe(0);
  });
  it("flags known pasted text defects without changing publication bytes",()=>{
    const bad={...article,bodyMarkdown:article.bodyMarkdown+
      "\n\nA service may watch one report ormultiple reports. "+
      "Delivery by phone,depending on the service."};
    const r=audit({article:bad});
    expect(r.findings.map(x=>x.code)).toContain("PROSE_SPACING_DEFECT");
    expect(r.article.probableSpacingIssues).toContain("ormultiple");
    expect(r.article.probableSpacingIssues).toContain("phone,depending");
    expect(bad.bodyMarkdown).toContain("ormultiple");
  });
  it("forces new replay if article changes; never reuses historical WARN fingerprint",()=>{
    const changed={...article,bodyMarkdown:article.bodyMarkdown+" Additional."};
    const r=audit({article:changed});
    expect(r.replay.articleFingerprintMatches).toBe(false);
    expect(r.findings.map(x=>x.code)).toContain(
      "SERP_REPLAY_CURRENT_VERSION_MISSING");
  });
  it("does not require arbitrary word count, number of keywords or decorative H3s",()=>{
    const r=audit();
    expect(r.findings.map(x=>x.code)).not.toContain("KEYWORD_COUNT_BELOW_20");
    expect(r.explanation).toContain("ranking");
  });
  it("recognizes simple punctuation issues but not ordinary comma-space",()=>{
    expect(inspectProseJoinAnomaliesV2(
      "Review your report, then contact the bureau.")).toEqual([]);
  });
});

describe("real 2026-10-16 Mac query-to-H2 evidence mismatch",()=>{
  const savedArticle={
    ...article,
    bodyMarkdown:"## What is credit monitoring?\n\nA service monitors reports.\n"+
      "## How does credit monitoring work?\n\nAlerts can be sent.\n"+
      "## What are the limitations of credit monitoring?\n\nNot prevention.\n"+
      "## Does credit monitoring affect your credit score?\n\nMonitoring the report is not a hard inquiry.\n"+
      "## What should you look for in a credit monitoring service?\n\nCompare notices.\n"+
      "## What should you do after a credit monitoring alert?\n\nRead it carefully.",
  };
  const savedRuntime={
    ...runtime,
    queryGraph:{
      missionIntent:"INFORMATIONAL",
      samePageNodeIds:["node-real"],
      provenance:[{nodeId:"node-real",sources:["DATAFORSEO"]}],
      nodes:[{id:"node-real",
        query:"does credit monitoring affect credit score",
        cluster:"credit monitoring basics",intent:"INFORMATIONAL",
        subIntent:"impact and limitations",sourceConfidence:0.9,
        searchVolume:40,gscImpressions:undefined}],
    },
    sectionBlueprints:{sections:[
      {heading:"What is credit monitoring?",queryNodeIds:[]},
      {heading:"How does credit monitoring work?",queryNodeIds:[]},
      {heading:"What are the limitations of credit monitoring?",queryNodeIds:[]},
      {heading:"Does credit monitoring affect your credit score?",
        queryNodeIds:[],requiredClaims:["claim-score"],evidenceIds:["e-score"]},
      {heading:"What should you look for in a credit monitoring service?",
        queryNodeIds:[]},
      {heading:"What should you do after a credit monitoring alert?",
        queryNodeIds:[]},
    ]},
    evidenceGraph:{
      sources:[{id:"s-score",url:"https://www.consumerfinance.gov/",
        sourceType:"PRIMARY_GOVERNMENT",publisher:"CFPB"}],
      claimEvidence:[{id:"e-score",claimId:"claim-score",sourceId:"s-score",
        kind:"VERIFIED_EXCERPT",relation:"SUPPORTS",
        excerpt:"Requesting one's own report is not a hard inquiry."}],
    },
  } as unknown as MasterRuntimeSnapshotV1;
  const replayMissing={
    ...replay,
    articleFingerprint:buildSerpReplayArticleFingerprintV1(savedArticle),
    warnings:["SERP_REPLAY_MISSING_DATA:https://money.com/best-credit-monitoring-services"],
    blockers:[],
  };
  it("finds existing sourced H2 without lying that immutable queryNodeId assignment exists",()=>{
    const result=audit({
      article:savedArticle,runtime:savedRuntime,replay:replayMissing,
    });
    expect(result.observedSupportingQueries).toBe(1);
    expect(result.assignedSupportingQueries).toBe(0);
    expect(result.existingH2MatchSuggestions).toBe(1);
    expect(result.suggestedQueryRebindings[0]).toMatchObject({
      query:"does credit monitoring affect credit score",
      ownerSectionIndex:3,
      ownerHeading:"Does credit monitoring affect your credit score?",
      verifiedEvidenceCount:1,
    });
    expect(result.findings.map(x=>x.code)).toContain(
      "QUERY_BINDING_REVIEW_REQUIRED");
    expect(result.findings.map(x=>x.code)).not.toContain(
      "QUERY_TO_SECTION_BRIDGE_MISSING");
    expect(result.canClaimSeoReady).toBe(false);
    expect(result.status).toBe("HUMAN_REVIEW_REQUIRED");
  });
  it("attributes missing-data replay WARN to source availability, not article inferiority",()=>{
    const result=audit({
      article:savedArticle,runtime:savedRuntime,replay:replayMissing,
    });
    const missing=result.findings.find(
      x=>x.code==="SERP_REPLAY_EVIDENCE_INCOMPLETE");
    expect(missing?.detail).toContain("money.com");
    expect(result.replay.status).toBe("WARN");
    expect(result.replay.articleFingerprintMatches).toBe(true);
  });
  it("does not invent an evidence-backed heading match when source proof is absent",()=>{
    const noEvidence={
      ...savedRuntime,evidenceGraph:{sources:[],claimEvidence:[]},
    } as unknown as MasterRuntimeSnapshotV1;
    const r=audit({
      article:savedArticle,runtime:noEvidence,replay:replayMissing,
    });
    expect(r.existingH2MatchSuggestions).toBe(0);
    expect(r.findings.map(x=>x.code)).toContain(
      "QUERY_TO_SECTION_BRIDGE_MISSING");
  });
});
