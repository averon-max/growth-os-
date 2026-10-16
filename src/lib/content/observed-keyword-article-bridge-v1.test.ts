import {describe,expect,it} from "vitest";
import {inspectObservedKeywordArticleBridgeV1}
  from "./observed-keyword-article-bridge-v1";
import type {QueryGraph} from "./query-graph";
import type {SectionBlueprintSet} from "./section-blueprint";
import type {KeywordClusterV2} from "../keywords/keyword-intelligence-v2";
const graph={
  nodes:[
    {id:"a",query:"what is credit monitoring"},
    {id:"b",query:"how credit monitoring alerts work"},
    {id:"c",query:"best paid credit monitoring services"},
  ],
  samePageNodeIds:["a","b"],separatePageNodeIds:["c"],
} as unknown as QueryGraph;
const blueprint={
  sections:[{heading:"How it works",queryNodeIds:["a"]}],
} as unknown as SectionBlueprintSet;
const make=(keyword:string):KeywordClusterV2=>({
  id:"cluster-a",intent:"INFORMATIONAL",
  opportunityScore:42,
  primary:{keyword,id:keyword,normalized:keyword,clusterId:"cluster-a",
    intent:"INFORMATIONAL",sources:["DATAFORSEO"],
    searchVolume:null,keywordDifficulty:null} as KeywordClusterV2["primary"],
  keywords:[{keyword,id:keyword,normalized:keyword,clusterId:"cluster-a",
    intent:"INFORMATIONAL",sources:["DATAFORSEO"],
    searchVolume:null,keywordDifficulty:null} as KeywordClusterV2["primary"]],
});
describe("observed keyword-to-article bridge",()=>{
  it("does not invent same-page mapping for brand-new keyword ideas",()=>{
    const [x]=inspectObservedKeywordArticleBridgeV1({
      clusters:[make("is credit monitoring free")],
      queryGraph:graph,blueprints:blueprint,
    });
    expect(x.samePageDecision).toBe("UNCLASSIFIED_INTENT_REVIEW_REQUIRED");
    expect(x.ownedHeading).toBeNull();
    expect(x.searchVolume).toBeNull();
  });
  it("treats known separate-page commercial intent as cannibalization risk",()=>{
    const [x]=inspectObservedKeywordArticleBridgeV1({
      clusters:[make("best paid credit monitoring services")],
      queryGraph:graph,blueprints:blueprint,
    });
    expect(x.samePageDecision).toBe("SEPARATE_PAGE_DO_NOT_INSERT");
  });
  it("keeps existing same-page but unassigned query pending evidence",()=>{
    const [x]=inspectObservedKeywordArticleBridgeV1({
      clusters:[make("how credit monitoring alerts work")],
      queryGraph:graph,blueprints:blueprint,
    });
    expect(x.samePageDecision).toBe("SAME_PAGE_NEEDS_H2_BINDING");
  });
  it("preserves actual assigned source-backed section",()=>{
    const [x]=inspectObservedKeywordArticleBridgeV1({
      clusters:[make("what is credit monitoring")],
      queryGraph:graph,blueprints:blueprint,
    });
    expect(x.samePageDecision).toBe("ALREADY_ASSIGNED_SAME_PAGE");
    expect(x.ownedHeading).toBe("How it works");
  });
});
