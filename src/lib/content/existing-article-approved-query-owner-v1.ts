/**
 * Append-only HUMAN-approved owner overlay. This NEVER alters canonical
 * QueryGraph, SectionBlueprintSet, execution plan, signed evidence or prose.
 * The overlay is valid only for the exact source article/research/replay.
 * One approval is not a claim that the article is SEO-ready.
 */
import type {MasterRuntimeSnapshotV1} from "./master-runtime-adapter";
import type {ArticleExecutionPlanV1} from "./article-execution-plan-v1";
import type {SearchReadinessArticleV2,SearchReadinessReplayV2}
  from "./article-search-readiness-v2";
import {proposeExistingArticleQueryOwnerRebindV1}
  from "./existing-article-query-owner-proposal-v1";

export const HUMAN_OWNER_APPROVAL_ATTESTATION_V1=
  "I_REVIEWED_THE_QUERY_AND_EXISTING_H2" as const;

export type ExistingArticleOwnerReviewV1={
  decisionVersion:string;
  decision:string;
  contentArticleId:string;
  evidenceSnapshotId:string;
  queryNodeId:string;
  observedQuery:string;
  ownerSectionIndex:number;
  ownerHeading:string;
  sourceArticleFingerprint:string;
  sourceQueryGraphSha256:string;
  sourceSectionBlueprintSha256:string;
  sourceExecutionPlanSha256:string;
  sourceReplayArtifactId:string;
  reviewerAttestation:string;
};

export function evaluateApprovedExistingArticleQueryOwnerV1(input:{
  articleId:string;evidenceSnapshotId:string;replayArtifactId:string|null;
  article:Readonly<SearchReadinessArticleV2>;
  runtime:Readonly<MasterRuntimeSnapshotV1>;
  plan:Readonly<ArticleExecutionPlanV1>;
  primaryKeyword:string;secondaryKeywords:readonly string[];
  replay:Readonly<SearchReadinessReplayV2>|null;
  review:Readonly<ExistingArticleOwnerReviewV1>|null;
}){
  const proposal=proposeExistingArticleQueryOwnerRebindV1(input);
  const candidate=proposal.candidateCount===1?proposal.proposals[0]:null;
  const record=input.review;
  const matched=!!candidate&&!!record&&
    record.decisionVersion==="QUERY_OWNER_HUMAN_APPROVAL_V1"&&
    record.decision==="APPROVED"&&
    record.contentArticleId===input.articleId&&
    record.evidenceSnapshotId===input.evidenceSnapshotId&&
    record.sourceReplayArtifactId===input.replayArtifactId&&
    !!input.replay&&
    input.replay.articleFingerprint===proposal.sourceArticleFingerprint&&
    input.replay.executionStatus==="SUCCEEDED"&&
    record.queryNodeId===candidate.nodeId&&
    record.observedQuery===candidate.observedQuery&&
    record.ownerSectionIndex===candidate.proposedOwnerSectionIndex&&
    record.ownerHeading===candidate.proposedOwnerH2&&
    record.sourceArticleFingerprint===proposal.sourceArticleFingerprint&&
    record.sourceQueryGraphSha256===proposal.sourceQueryGraphSha256&&
    record.sourceSectionBlueprintSha256===
      proposal.sourceSectionBlueprintSha256&&
    record.sourceExecutionPlanSha256===proposal.sourceExecutionPlanSha256&&
    record.reviewerAttestation===HUMAN_OWNER_APPROVAL_ATTESTATION_V1;
  if(!matched){
    return {
      valid:false as const,reason:!record?"NO_APPROVED_REVIEW":
        "REVIEW_PROVENANCE_OR_CONTENT_MISMATCH",
      runtime:input.runtime,originalResearchChanged:false,
    };
  }
  const sections=input.runtime.sectionBlueprints.sections.map(
    (section,index)=>index!==candidate.proposedOwnerSectionIndex?section:{
      ...section,queryNodeIds:[...section.queryNodeIds,candidate.nodeId],
    });
  return {
    valid:true as const,reason:"EXACT_HUMAN_APPROVED_REVIEW",
    runtime:{...input.runtime,
      sectionBlueprints:{...input.runtime.sectionBlueprints,sections}},
    originalResearchChanged:false,
    reviewAppliedAsIndependentOverlay:true,
    observedQuery:candidate.observedQuery,
    queryNodeId:candidate.nodeId,
    ownerSectionIndex:candidate.proposedOwnerSectionIndex,
  };
}
