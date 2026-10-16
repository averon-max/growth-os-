/**
 * Global article depth convergence for one source-verified SAME-ID revision.
 * Per-section "minWords" are model guidance, NOT independently required
 * publication floors. Enforce positive useful growth, per-section maximums,
 * and a single final article-wide minimum instead.
 */
export function assessVerifiedDepthRevisionV1({
  originalWords,verifiedWords,plannedMinWords,maxWords,
  h3Before=0,h3After=0,isCompensation=false,
}:{
  originalWords:number;
  verifiedWords:number;
  plannedMinWords:number;
  maxWords:number;
  h3Before?:number;
  h3After?:number;
  isCompensation?:boolean;
}){
  if([originalWords,verifiedWords,plannedMinWords,maxWords,
    h3Before,h3After].some(x=>!Number.isInteger(x)||x<0)||
    maxWords<originalWords)
    throw new Error("QUALITY_REVISION_METRICS_INVALID");
  const gain=verifiedWords-originalWords;
  // A structural second pass is permitted only if it genuinely adds
  // a previously absent usable H3, verified under all existing gates.
  const headingGain=h3After-h3Before;
  const accepted=verifiedWords<=maxWords&&
    (gain>=(isCompensation?8:15)||
      (isCompensation&&gain>=-5&&headingGain>0));
  return {
    accepted,
    gain,
    headingGain,
    plannedLocalShortfall:Math.max(0,plannedMinWords-verifiedWords),
    reason:verifiedWords>maxWords?"SECTION_EXCEEDS_SOURCE_BOUND_MAX":
      gain<(isCompensation?8:15) &&
        !(isCompensation&&gain>=-5&&headingGain>0)
        ?"NO_MEANINGFUL_VERIFIED_IMPROVEMENT":"ACCEPTED",
  } as const;
}

export function selectRemainingQualityCompensationV1({
  sections,usedIndices,minimumWords,currentWords,currentH3,
  requiredH3=2,
}:{
  sections:readonly {
    index:number;currentWords:number;maxWords:number;
    claimCount:number;evidenceCount:number;
    h3Count:number;
  }[];
  usedIndices:readonly number[];
  minimumWords:number;
  currentWords:number;
  currentH3:number;
  requiredH3?:number;
}){
  const remainingWords=Math.max(0,minimumWords-currentWords);
  const remainingH3=Math.max(0,requiredH3-currentH3);
  if(remainingWords===0&&remainingH3===0)return null;
  const used=new Set(usedIndices);
  const viable=sections.filter(s=>
    !used.has(s.index) && s.claimCount>=2&&s.evidenceCount>=2&&
    s.maxWords-s.currentWords>=
      (remainingWords>0?12:0));
  if(!viable.length)return null;
  viable.sort((a,b)=>
    (b.maxWords-b.currentWords)-(a.maxWords-a.currentWords)||
      a.index-b.index);
  const section=viable[0];
  const minimumGain=remainingWords>0
    ?Math.min(section.maxWords-section.currentWords,
      Math.max(15,remainingWords+5)):0;
  const targetWords=Math.min(section.maxWords,
    section.currentWords+minimumGain);
  return {
    index:section.index,
    minWords:targetWords,
    preferredWords:Math.min(section.maxWords,targetWords+5),
    maxWords:section.maxWords,
    remainingWords,
    remainingH3,
  };
}
