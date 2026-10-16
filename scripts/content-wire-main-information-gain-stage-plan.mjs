/**
 * Narrow idempotent integration adapter for a locally modified
 * production-master-live-stage-planner.ts.
 * Does not overwrite the user's existing planning implementation.
 * No AI, network, DB or other source files are touched.
 */
import {readFile,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
const path=resolve("src/lib/content/production-master-live-stage-planner.ts");
const imp='import {\n  inspectStagePlanInformationGainV1,\n  INFORMATION_GAIN_ATOMIC_CLAIM_PLANNING_RULES_V1,\n} from "./stage-plan-information-gain-v1";';
const importAnchor='import {\n  normalizeProductionClaimCategoryV2,\n} from "./production-claim-category-normalization-v2";';
const promptAnchor='      atomicClaimContract,\n\n      sectionClaimOwnershipContract,';
const promptReplacement='      atomicClaimContract,\n\n      INFORMATION_GAIN_ATOMIC_CLAIM_PLANNING_RULES_V1,\n\n      sectionClaimOwnershipContract,';
const gateAnchor='      /*\n       * TEMPLATE_H2_PLANNING_GUIDANCE_ONLY_V2';
const gateReplacement=[
  '      /* STAGE_PLAN_INFORMATION_GAIN_CLAIM_BREADTH_V1 */',
  '      const informationGain=inspectStagePlanInformationGainV1(',
  '        candidate.sections',
  '      );',
  '      if(informationGain.issueCode){',
  '        missing.push(informationGain.issueCode);',
  '      }',
  '',
  gateAnchor,
].join("\n");
function count(source,needle){return source.split(needle).length-1;}
async function main(){
  let source=await readFile(path,"utf8");
  if(source.includes(imp)&&source.includes(promptReplacement)&&
    source.includes("STAGE_PLAN_INFORMATION_GAIN_CLAIM_BREADTH_V1")){
    console.log("MAIN_INFORMATION_GAIN_STAGE_PLAN_ALREADY_WIRED");
    return;
  }
  if(count(source,importAnchor)!==1||
     count(source,promptAnchor)!==1||
     count(source,gateAnchor)!==1||
     count(source,imp)!==0||
     count(source,"STAGE_PLAN_INFORMATION_GAIN_CLAIM_BREADTH_V1")!==0){
    throw new Error("MAIN_STAGE_PLANNER_UNEXPECTED_LAYOUT_NO_FILES_CHANGED");
  }
  source=source.replace(importAnchor,importAnchor+"\n\n"+imp);
  source=source.replace(promptAnchor,promptReplacement);
  source=source.replace(gateAnchor,gateReplacement);
  if(count(source,"inspectStagePlanInformationGainV1(")!==1||
     count(source,"INFORMATION_GAIN_ATOMIC_CLAIM_PLANNING_RULES_V1,")!==2){
    throw new Error("MAIN_STAGE_PLANNER_INSERTION_VERIFICATION_FAILED");
  }
  await writeFile(path,source,"utf8");
  console.log("MAIN_INFORMATION_GAIN_STAGE_PLAN_WIRED");
}
main().catch(error=>{
  console.error(error instanceof Error?error.message:String(error));
  process.exitCode=1;
});
