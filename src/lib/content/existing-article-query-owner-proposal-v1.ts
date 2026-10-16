/**
 * ONLY a versioned review proposal for the existing page.
 * Real QueryGraph / SectionBlueprintSet / ExecutionPlan are immutable.
 * No writes, no new keywords, no semantic assumptions beyond an already
 * evidenced, exact-after-possessive heading match.
 */
import {createHash} from "node:crypto";
import {buildSerpReplayArticleFingerprintV1}
  from "./serp-replay-fingerprint";
import type {MasterRuntimeSnapshotV1} from "./master-runtime-adapter";
import type {ArticleExecutionPlanV1} from "./article-execution-plan-v1";
import {evaluateArticleSearchReadinessV2}
  from "./article-search-readiness-v2";
import type {SearchReadinessArticleV2,SearchReadinessReplayV2}
  from "./article-search-readiness-v2";

const sha=(x:unknown)=>createHash("sha256")
  .update(JSON.stringify(x)).digest("hex");
const normal=(v:string)=>v.normalize("NFKC").toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu," ").trim().replace(/\s+/gu," ");
export function proposeExistingArticleQueryOwnerRebindV1(input:{
  article:Readonly<SearchReadinessArticleV2>;
  runtime:Readonly<MasterRuntimeSnapshotV1>;
  plan:Readonly<ArticleExecutionPlanV1>;
  primaryKeyword:string;secondaryKeywords:readonly string[];
  replay:Readonly<SearchReadinessReplayV2>|null;
}){
  const readiness=evaluateArticleSearchReadinessV2(input);
  const provenances=new Map(input.runtime.queryGraph.provenance.map(x=>
    [x.nodeId,x.sources] as const));
  const same=new Set(input.runtime.queryGraph.samePageNodeIds);
  const sections=input.runtime.sectionBlueprints.sections;
  const headings=[...input.article.bodyMarkdown.matchAll(/^##\s+([^\n]+)/gm)]
    .map(m=>m[1]!.trim());
  const proposals=readiness.suggestedQueryRebindings.flatMap(candidate=>{
    const matches=input.runtime.queryGraph.nodes.filter(node=>
      normal(node.query)===normal(candidate.query)&&
      same.has(node.id)&&node.sourceConfidence>=0.6&&
      (provenances.get(node.id)??[]).includes("DATAFORSEO") &&
      node.intent===input.runtime.queryGraph.missionIntent);
    if(matches.length!==1)return [];
    const node=matches[0]!;
    const section=sections[candidate.ownerSectionIndex];
    const planSection=input.plan.sections
      .filter(s=>s.state==="WRITABLE")[candidate.ownerSectionIndex];
    if(!section||!planSection||
      candidate.confidence!=="EXACT_AFTER_POSSESSIVE_NORMALIZATION"||
      candidate.verifiedEvidenceCount<=0||
      headings[candidate.ownerSectionIndex]!==candidate.ownerHeading||
      section.heading!==candidate.ownerHeading||
      planSection.heading!==candidate.ownerHeading ||
      sections.some(x=>x.queryNodeIds.includes(node.id)))return [];
    return [{
      nodeId:node.id,
      observedQuery:node.query,
      marketEvidenceSources:provenances.get(node.id)!,
      organicSearchVolume:node.searchVolume??null,
      oldOwnerSectionIndex:null,
      proposedOwnerSectionIndex:candidate.ownerSectionIndex,
      proposedOwnerH2:candidate.ownerHeading,
      verifiedSectionEvidenceCount:candidate.verifiedEvidenceCount,
      confidence:candidate.confidence,
      wouldAddExistingNodeIdToSection:true,
    }];
  });
  return {
    version:"QUERY_SECTION_OWNER_REBIND_PROPOSAL_V1" as const,
    candidateCount:proposals.length,
    proposals,
    currentQueryGraphVersion:input.runtime.queryGraph.version,
    currentGraphMissionId:input.runtime.queryGraph.missionId,
    currentSectionBlueprintCount:sections.length,
    sourceArticleFingerprint:buildSerpReplayArticleFingerprintV1(
      input.article),
    sourceQueryGraphSha256:sha(input.runtime.queryGraph),
    sourceSectionBlueprintSha256:sha(input.runtime.sectionBlueprints),
    sourceExecutionPlanSha256:sha(input.plan),
    signedResearchUpdated:false,
    articleChanged:false,
    searchVolumeGenerated:false,
    dataForSeoCalls:0,
    modelCalls:0,
    databaseUnchanged:true,
    canClaimQueryBindingResolved:false,
    action:"HUMAN_VERIFY_AND_VERSION_RESEARCH_BINDING_BEFORE_SEO_READY" as const,
  };
}
