/**
 * A DataForSEO/GSC discovery is an observed keyword candidate, NOT
 * an automatic article fact, same-page decision or keyword stuffing target.
 * Only previously evidenced query-graph ownership authorizes mapping.
 */
import {normalizeKeywordV2,
  type KeywordClusterV2} from "../keywords/keyword-intelligence-v2";
import type {QueryGraph} from "./query-graph";
import type {SectionBlueprintSet} from "./section-blueprint";
export type KeywordArticleDecisionV1=
  "ALREADY_ASSIGNED_SAME_PAGE"|"SAME_PAGE_NEEDS_H2_BINDING"|
  "SEPARATE_PAGE_DO_NOT_INSERT"|"UNCLASSIFIED_INTENT_REVIEW_REQUIRED";
export function inspectObservedKeywordArticleBridgeV1({
  clusters,queryGraph,blueprints,
}:{
  clusters:readonly KeywordClusterV2[];
  queryGraph:Readonly<QueryGraph>;
  blueprints:Readonly<SectionBlueprintSet>;
}){
  const byKeyword=new Map(queryGraph.nodes.map(x=>
    [normalizeKeywordV2(x.query),x] as const));
  const same=new Set(queryGraph.samePageNodeIds);
  const separate=new Set(queryGraph.separatePageNodeIds);
  const owner=new Map<string,{heading:string;index:number}>();
  blueprints.sections.forEach((s,index)=>s.queryNodeIds.forEach(nodeId=>
    owner.set(nodeId,{heading:s.heading,index})));
  return clusters.flatMap(cluster=>cluster.keywords.map(candidate=>{
    const known=byKeyword.get(normalizeKeywordV2(candidate.keyword));
    const section=known?owner.get(known.id):undefined;
    const decision:KeywordArticleDecisionV1=!known?
      "UNCLASSIFIED_INTENT_REVIEW_REQUIRED":
      separate.has(known.id)?"SEPARATE_PAGE_DO_NOT_INSERT":
      same.has(known.id)&&section?"ALREADY_ASSIGNED_SAME_PAGE":
      same.has(known.id)?"SAME_PAGE_NEEDS_H2_BINDING":
      "UNCLASSIFIED_INTENT_REVIEW_REQUIRED";
    return {
      query:candidate.keyword,
      clusterId:cluster.id,
      clusterPrimary:cluster.primary.keyword,
      observedIntent:candidate.intent,
      sources:candidate.sources,
      searchVolume:candidate.searchVolume,
      keywordDifficulty:candidate.keywordDifficulty,
      gscImpressions:candidate.impressions??null,
      samePageDecision:decision,
      ownedSectionIndex:decision==="ALREADY_ASSIGNED_SAME_PAGE"?
        section!.index:null,
      ownedHeading:decision==="ALREADY_ASSIGNED_SAME_PAGE"?
        section!.heading:null,
      action:decision==="ALREADY_ASSIGNED_SAME_PAGE"?
        "Audit reader-answer coverage and factual support in existing H2.":
        decision==="SAME_PAGE_NEEDS_H2_BINDING"?
        "Review same-page intent and verify existing claims before section mapping.":
        decision==="SEPARATE_PAGE_DO_NOT_INSERT"?
        "Separate-page topic. Avoid article keyword cannibalization.":
        "Review SERP intent/page type and content ownership. No automatic insertion.",
    };
  }));
}
