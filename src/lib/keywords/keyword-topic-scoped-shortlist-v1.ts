import type {KeywordCandidateV2,KeywordClusterV2,KeywordExclusionV2}
  from "./keyword-intelligence-v2";
import {assessKeywordTopicIntentV1,
  type KeywordTopicAssessmentV1}
  from "./keyword-topic-intent-gate-v1";

/**
 * Evaluate TOPIC + INTENT before computing any top-volume shortlist.
 * Unknown intent is excluded from this informational page's paid SERP,
 * not asserted globally worthless. The original observations persist.
 */
export function createTopicScopedKeywordShortlistV1({
  seed,candidates,maxClusters=30,
}:{
  seed:string;candidates:readonly KeywordCandidateV2[];
  maxClusters?:number;
}):{
  clusters:KeywordClusterV2[];
  excluded:KeywordExclusionV2[];
  assessments:readonly KeywordTopicAssessmentV1[];
  acceptedCandidateCount:number;
}{
  if(!Number.isInteger(maxClusters)||maxClusters<1||maxClusters>500)
    throw new Error("TOPIC_SCOPED_CLUSTER_LIMIT_INVALID");
  const assessments=candidates.map(candidate=>
    assessKeywordTopicIntentV1({seed,query:candidate.keyword}));
  const excluded:KeywordExclusionV2[]=assessments.filter(x=>
    !x.eligibleForArticleSerp).map(x=>({
      keyword:x.query,
      reason:x.decision==="AMBIGUOUS_TOPIC_REVIEW"?
        "INTENT_REVIEW_REQUIRED" as const:
        x.decision==="SEPARATE_BRAND_PRODUCT_PAGE"||
        x.decision==="SEPARATE_COMMERCIAL_PAGE"||
        x.decision==="SEPARATE_NAVIGATION_OR_SUPPORT"?
        "SEPARATE_PAGE_INTENT" as const:
        "TOPIC_SCOPE_MISMATCH" as const,
    }));
  // The original generic intent classifier mislabels definitional
  // phrases containing "service" as TRANSACTIONAL and concept-vs-concept
  // explanations as COMMERCIAL. Correct ONLY accepted informational
  // candidates; keep untouched raw observed candidates in the archive.
  const accepted:KeywordCandidateV2[]=candidates.flatMap(
    (candidate,index)=>{
      const assessment=assessments[index];
      if(!assessment?.eligibleForArticleSerp)return [];
      return [{...candidate,
        intent:assessment.pageIntent==="INFORMATIONAL"?
          "INFORMATIONAL" as const:candidate.intent,
      }];
    });
  const byCluster=new Map<string,KeywordCandidateV2[]>();
  for(const candidate of accepted){
    const arr=byCluster.get(candidate.clusterId)??[];
    arr.push(candidate);
    byCluster.set(candidate.clusterId,arr);
  }
  const clusters=[...byCluster.entries()].map(([id,keywords])=>{
    const sorted=[...keywords].sort((a,b)=>
      b.opportunityScore-a.opportunityScore||
      a.keyword.localeCompare(b.keyword));
    const primary=sorted[0];
    return {id,intent:primary.intent,primary,keywords:sorted,
      opportunityScore:primary.opportunityScore};
  }).sort((a,b)=>b.opportunityScore-a.opportunityScore||
    a.primary.keyword.localeCompare(b.primary.keyword)).slice(0,maxClusters);
  return {clusters,excluded,assessments,
    acceptedCandidateCount:accepted.length};
}
