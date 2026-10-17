import {resolveArticleLengthContractV1}
  from "./article-length-contract-v1";

/**
 * Existing Stage Plan structural diagnosis (before paid evidence closure).
 * Headings alone cannot prove that a comprehensive guide has enough
 * meaningful reader jobs. The planner must also assign topics, observed
 * same-page questions or atomic factual hypotheses to those sections.
 *
 * This is editorial product quality, never a Google SEO heading rule.
 * The upstream planner owns the single bounded regeneration attempt.
 */
export function inspectComprehensiveStagePlanStructureV1({
  intent,pageType,sections,
}:{
  intent:string;pageType:string;
  sections:readonly {
    heading:string;
    mission:string;
    topics?:readonly string[];
    questions?:readonly string[];
    requiredClaimIds?:readonly string[];
  }[];
}){
  const comprehensive=resolveArticleLengthContractV1({
    intent,pageType,
  }).articleClass==="COMPREHENSIVE_INFORMATIONAL";

  const normalized=(value:string)=>value.toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu," ").trim();

  const uniqueJobs=new Set(sections.map(section=>
    normalized(section.mission)).filter(Boolean)).size;
  const uniqueHeadings=new Set(sections.map(section=>
    normalized(section.heading)).filter(Boolean)).size;

  /*
   * Old caller fixtures may supply only heading + mission.
   * The production Stage Plan supplies arrays for scope ownership.
   * Apply this stronger check only when that structured scope exists.
   */
  const scopeAvailable=sections.some(section=>
    section.topics!==undefined||
    section.questions!==undefined||
    section.requiredClaimIds!==undefined);

  const sectionOwnsScope=(section:typeof sections[number])=>
    [section.topics,section.questions,section.requiredClaimIds]
      .some(items=>items?.some(item=>normalized(item).length>0));

  const unanchoredSections=scopeAvailable
    ? sections.filter(section=>!sectionOwnsScope(section)).length
    : null;

  const anchoredSections=scopeAvailable
    ? sections.length-(unanchoredSections??0)
    : null;

  // Allow an intro or transition without a standalone material claim.
  // Most H2s must still own concrete reader-information work.
  const scopeThin=comprehensive&&scopeAvailable&&
    (anchoredSections??0)<Math.ceil(sections.length*2/3);

  const minimumH2=comprehensive?6:null;
  const insufficient=comprehensive&&(
    sections.length<6||uniqueJobs<6||uniqueHeadings<6||scopeThin);

  return {
    version:"COMPREHENSIVE_STAGE_PLAN_STRUCTURE_V1" as const,
    minimumH2,plannedH2:sections.length,
    uniqueJobs,uniqueHeadings,
    unanchoredSections,anchoredSections,
    insufficient,
    issueCode:insufficient?
      "sections[].comprehensiveReaderJobs":null,
    note:"Most H2s need distinct owned information jobs; never invent evidence, keywords or decorative headings.",
  };
}
