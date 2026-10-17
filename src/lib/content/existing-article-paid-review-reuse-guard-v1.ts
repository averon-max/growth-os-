/**
 * This is a cost guard ONLY, not a trust or content-verification gate.
 * The produced Markdown and report are NEVER reused for editorial writes;
 * signed per-H2 checkpoints remain authoritative.
 */
export function assessCompletedCitationReportReuseV1(input:{
  articleId:string;originalSha256:string;
  report:unknown;
  outstandingRequiredSectionIndices:readonly number[];
}){
  const value=input.report;
  const r=value&&typeof value==="object"&&!Array.isArray(value)?
    value as Record<string,unknown>:null;
  const completed=!!r&&
    r.articleId===input.articleId&&
    r.expectedSha===input.originalSha256&&
    r.status==="DRAFT_COMPLETE_SECTIONS_PENDING_CRITICS_AND_SERP_REPLAY"&&
    r.databaseUnchanged===true&&
    r.commitAllowed===false&&
    Array.isArray(r.stillUncitedSections)&&
    r.stillUncitedSections.length===0&&
    typeof r.totalVisibleCitationLinks==="number"&&
    r.totalVisibleCitationLinks>0;
  return {
    previouslyCompleted:completed,
    blockNewModelCalls:completed&&
      input.outstandingRequiredSectionIndices.length>0,
    unresolvedCheckpointIndices:input.outstandingRequiredSectionIndices,
    requiresManualCheckpointRecovery:completed&&
      input.outstandingRequiredSectionIndices.length>0,
  };
}
