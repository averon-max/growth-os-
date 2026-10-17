import {describe,expect,it} from "vitest";
import {buildArticleDemandOutlineAuditV1}
  from "./article-demand-outline-audit-v1";
import type {MasterRuntimeSnapshotV1} from "./master-runtime-adapter";
const data={
  title:"What Is Credit Monitoring?",h1:"What Is Credit Monitoring?",
  primaryKeyword:"what is credit monitoring",
  secondaryKeywords:["free credit monitoring","3 bureau credit monitoring"],
  bodyMarkdown:[
    "## What is credit monitoring?",
    "A credit monitoring service tracks account changes.",
    "## What are the limitations of credit monitoring?",
    "Some services offer free credit monitoring.",
    "### What monitoring may miss",
    "An alert cannot prevent every fraud event.",
    "### What to do after an alert",
    "Review your report and correct errors.",
    "## Does credit monitoring affect your credit score?",
    "Compare three reports before selecting 3 bureau credit monitoring.",
  ].join("\n\n"),
};
const runtime={
  queryGraph:{
    missionIntent:"INFORMATIONAL",
    samePageNodeIds:["q-real","q-manual","q-separate"],
    nodes:[
      {id:"q-real",query:"does credit monitoring affect credit score",
        intent:"INFORMATIONAL",cluster:"score",sourceConfidence:0.9,
        searchVolume:40},
      {id:"q-manual",query:"fake guessed keyword",
        intent:"INFORMATIONAL",cluster:"guess",sourceConfidence:0.9},
      {id:"q-separate",query:"best paid monitoring service",
        intent:"COMMERCIAL",cluster:"comparison",sourceConfidence:0.9},
    ],
    provenance:[
      {nodeId:"q-real",sources:["DATAFORSEO"]},
      {nodeId:"q-manual",sources:["MANUAL"]},
      {nodeId:"q-separate",sources:["DATAFORSEO"]},
    ],
  },
  sectionBlueprints:{sections:[
    {queryNodeIds:[]},{queryNodeIds:[]},{queryNodeIds:[]},
  ]},
} as unknown as MasterRuntimeSnapshotV1;
describe("exact brief matches must never be described as all SEO demand",()=>{
  it("reports 3/3 exact phrases separately from real extra query demand",()=>{
    const r=buildArticleDemandOutlineAuditV1({
      ...data,runtime,approvedNodeOwners:{"q-real":2},
    });
    expect(r.briefExactCoverage).toEqual({
      used:3,total:3,notTotalSeoCoverage:true,
    });
    expect(r.researchedAdditionalQueryCount).toBe(1);
    expect(r.realSearchQueries).toHaveLength(1);
    expect(r.realSearchQueries[0]).toMatchObject({
      nodeId:"q-real",searchVolume:40,exactMentions:0,
      ownerH2Index:2,
    });
    expect(r.realAdditionalQueriesWithoutExactPhrase)
      .toContain("does credit monitoring affect credit score");
  });
  it("shows real H2/H3 distribution without inventing a quota",()=>{
    const r=buildArticleDemandOutlineAuditV1({...data,runtime});
    expect(r.article).toMatchObject({h1:1,h2:3,h3:2});
    expect(r.sections.map(s=>s.h3.length)).toEqual([0,2,0]);
    expect(r.searchDataLimits.noHeadingCountTargetInvented).toBe(true);
  });
  it("does not manufacture demand from the brief when research is missing",()=>{
    const r=buildArticleDemandOutlineAuditV1({...data,runtime:null});
    expect(r.realSearchQueries).toEqual([]);
    expect(r.briefExactCoverage.total).toBe(3);
    expect(r.searchDataLimits.noNewProviderCalls).toBe(true);
  });
});