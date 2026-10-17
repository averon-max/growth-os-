/**
 * Independent exact-text and immutable-owner what-if checks.
 * This module never alters the signed Research snapshot or article bytes.
 */
import {createHash} from "node:crypto";
import {previewObservedArticleJoinCopyeditV1}
  from "./article-copyedit-join-repair-v1";
import {proposeExistingArticleQueryOwnerRebindV1}
  from "./existing-article-query-owner-proposal-v1";
import {evaluateArticleSearchReadinessV2}
  from "./article-search-readiness-v2";
import type {MasterRuntimeSnapshotV1} from "./master-runtime-adapter";
import type {ArticleExecutionPlanV1} from "./article-execution-plan-v1";
import type {SearchReadinessArticleV2,SearchReadinessReplayV2}
  from "./article-search-readiness-v2";

const words=[
  "creditcard","thereview","informationyou","assumptionto",
  "ofcoverage","whosecoverage","toreview",
] as const;
const checksum=(value:unknown)=>createHash("sha256")
  .update(JSON.stringify(value)).digest("hex");
export function probeSavedArticleJoinIntegrityV1(markdown:string){
  const preview=previewObservedArticleJoinCopyeditV1(markdown);
  // Intentionally independent of Markdown splitting/protection so false
  // negatives in the copyeditor become visible instead of hidden.
  const exactLiteralHits:Array<{token:string;occurrences:number}>=words.flatMap(word=>{
    const matches=[...markdown.matchAll(new RegExp(
      "\\b"+word+"\\b","giu"))];
    return matches.length?[{token:word,occurrences:matches.length}]:[];
  });
  const toaOccurrences=[...markdown.matchAll(
    /\b(?:relevant|applies) toa particular\b/giu)].length;
  if(toaOccurrences)exactLiteralHits.push({
    token:"toa",occurrences:toaOccurrences,
  });
  return {
    version:"SAVED_ARTICLE_INDEPENDENT_LITERAL_JOIN_PROBE_V1" as const,
    articleCharacters:markdown.length,
    exactLiteralHits,
    totalLiteralHits:exactLiteralHits.reduce((n,h)=>n+h.occurrences,0),
    copyeditPreviewHits:preview.changes.reduce(
      (n,h)=>n+h.occurrences,0),
    independentScannerDisagrees:
      exactLiteralHits.reduce((n,h)=>n+h.occurrences,0)!==
      preview.changes.reduce((n,h)=>n+h.occurrences,0),
    noDbChanges:true,
  };
}
export function simulateQueryOwnerBindingWithoutPersistenceV1(input:{
  article:Readonly<SearchReadinessArticleV2>;
  runtime:Readonly<MasterRuntimeSnapshotV1>;
  plan:Readonly<ArticleExecutionPlanV1>;
  primaryKeyword:string;secondaryKeywords:readonly string[];
  replay:Readonly<SearchReadinessReplayV2>|null;
}){
  const proposal=proposeExistingArticleQueryOwnerRebindV1(input);
  if(proposal.candidateCount!==1){
    return {previewOnly:true,eligible:false as const,reason:"NOT_EXACTLY_ONE_PROPOSAL",
      beforeFindingCodes:[],afterFindingCodes:[],researchUnchanged:true};
  }
  const candidate=proposal.proposals[0]!;
  const oldSections=input.runtime.sectionBlueprints.sections;
  const current=oldSections[candidate.proposedOwnerSectionIndex];
  if(!current||current.queryNodeIds.includes(candidate.nodeId))
    throw new Error("OWNER_PROPOSAL_DRIFT_OR_ALREADY_BOUND");
  const sourceGraphHash=checksum(input.runtime.queryGraph);
  const sourceBlueprintHash=checksum(input.runtime.sectionBlueprints);
  const copiedSections=oldSections.map((section,index)=>
    index!==candidate.proposedOwnerSectionIndex?section:{
      ...section,queryNodeIds:[...section.queryNodeIds,candidate.nodeId],
    });
  const simulatedRuntime={
    ...input.runtime,
    sectionBlueprints:{...input.runtime.sectionBlueprints,
      sections:copiedSections},
  };
  const before=evaluateArticleSearchReadinessV2(input);
  const after=evaluateArticleSearchReadinessV2({
    ...input,runtime:simulatedRuntime,
  });
  if(checksum(input.runtime.queryGraph)!==sourceGraphHash||
    checksum(input.runtime.sectionBlueprints)!==sourceBlueprintHash)
    throw new Error("SIMULATION_MUTATED_SIGNED_RESEARCH");
  return {
    version:"QUERY_OWNER_REBIND_WHAT_IF_V1",
    previewOnly:true,eligible:true as const,
    queryNodeId:candidate.nodeId,
    ownerH2Index:candidate.proposedOwnerSectionIndex,
    beforeFindingCodes:before.findings.map(x=>x.code),
    afterFindingCodes:after.findings.map(x=>x.code),
    warningWouldClear:before.findings.some(x=>
      x.code==="QUERY_BINDING_REVIEW_REQUIRED")&&
      !after.findings.some(x=>x.code==="QUERY_BINDING_REVIEW_REQUIRED"),
    sourceGraphSha256:sourceGraphHash,
    sourceBlueprintSha256:sourceBlueprintHash,
    researchUnchanged:true,databaseUnchanged:true,
    approved:false,
    note:"This is an in-memory what-if, not a signed/persisted versioned Query Graph binding.",
  };
}
