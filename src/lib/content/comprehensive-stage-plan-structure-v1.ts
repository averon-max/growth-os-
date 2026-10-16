import {resolveArticleLengthContractV1}
  from "./article-length-contract-v1";

/**
 * Growth OS PRODUCT contract for a comprehensive 2000+ word explainer.
 * 1-2 major reader jobs cannot create a complete long-form guide.
 *
 * This is a research/planning fail-closed check, not a Google SEO rule.
 * The planner must find distinct useful jobs with verified evidence;
 * it may never fabricate headings merely to satisfy a number.
 */
export function inspectComprehensiveStagePlanStructureV1({
  intent,pageType,sections,
}:{
  intent:string;pageType:string;
  sections:readonly {heading:string;mission:string}[];
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
  const minimumH2=comprehensive?6:null;
  const insufficient=comprehensive&&(
    sections.length<6||uniqueJobs<6||uniqueHeadings<6);
  return {
    version:"COMPREHENSIVE_STAGE_PLAN_STRUCTURE_V1" as const,
    minimumH2,plannedH2:sections.length,
    uniqueJobs,uniqueHeadings,insufficient,
    issueCode:insufficient?
      "sections[].comprehensiveReaderJobs":null,
    note:"Distinct supported reader jobs required, never decorative H2 or a Google heading quota.",
  };
}
