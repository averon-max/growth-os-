/**
 * A verified deduplication may remove genuine boilerplate and leave the
 * comprehensive guide just under its product editorial word floor.
 * Recover reader value without restoring copied prose or inventing claims.
 * Deterministic selection only, no I/O or paid calls.
 */
export interface QualityDepthTargetV1 {
  readonly index:number;
  readonly currentSectionWords:number;
  readonly targetSectionWords:number;
  readonly desiredAdditionalWords:number;
  readonly verifiedClaims:number;
  readonly assignedEvidence:number;
}
export function planPostEditorialDepthRecoveryV1({
  articleWords,minArticleWords,maxArticleWords,sections,
  maxAttempts=2,
}:{
  articleWords:number;minArticleWords:number;maxArticleWords:number;
  sections:readonly {
    index:number;
    sectionWords:number;
    verifiedClaims:number;
    assignedEvidence:number;
  }[];
  maxAttempts?:number;
}):readonly QualityDepthTargetV1[]{
  if(![articleWords,minArticleWords,maxArticleWords,maxAttempts].every(
    Number.isInteger)||articleWords<0||minArticleWords<0||
    maxArticleWords<minArticleWords||maxAttempts<1||maxAttempts>3)
    throw new Error("POST_EDITORIAL_DEPTH_INVALID_CONSTRAINTS");
  if(articleWords>=minArticleWords)return [];
  const shortfall=minArticleWords-articleWords;
  // Extra room compensates for modest model variation; 0 keyword quota,
  // no required exact-match repetition. This is a bounded target, not a
  // license to add facts unsupported by assigned sources.
  const desiredAdditionalWords=Math.max(60,shortfall+24);
  if(desiredAdditionalWords>maxArticleWords-articleWords)return [];
  return [...sections]
    .filter(x=>Number.isInteger(x.index)&&x.index>=0&&
      Number.isInteger(x.sectionWords)&&x.sectionWords>=80&&
      x.verifiedClaims>=2&&x.assignedEvidence>=2)
    .sort((a,b)=>b.verifiedClaims-a.verifiedClaims||
      b.assignedEvidence-a.assignedEvidence||a.index-b.index)
    .slice(0,maxAttempts)
    .map(x=>({
      index:x.index,currentSectionWords:x.sectionWords,
      targetSectionWords:x.sectionWords+desiredAdditionalWords,
      desiredAdditionalWords,
      verifiedClaims:x.verifiedClaims,
      assignedEvidence:x.assignedEvidence,
    }));
}
