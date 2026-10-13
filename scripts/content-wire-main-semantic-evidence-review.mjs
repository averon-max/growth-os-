/**
 * Bounded semantic evidence review: safe adapter for an older main worktree.
 * Patches existing verifier and existing Stage Planner by unique anchors;
 * never replaces either implementation, never calls AI, never touches DB.
 * Caller retains and restores backups if validation fails.
 */
import {readFile,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
const verifierPath=resolve("src/lib/content/live-evidence-verification.ts");
const plannerPath=resolve("src/lib/content/production-master-live-stage-planner.ts");
const findOnce=(source,anchor,label)=>{
  const count=source.split(anchor).length-1;
  if(count!==1)throw new Error("MAIN_SEMANTIC_ADAPTER_LAYOUT_"+label+"_NO_FILES_CHANGED:"+count);
};
const sourceImport='import {\n  fetchSinglePage,\n} from "../crawler/crawler";';
const qualifierImport='import { inspectClaimMaterialQualifiersV1 } from "./claim-material-qualifier-v1";';
const qualifierAnchor="    /*\n     * VERIFIED_EXCERPT_NEGATIVE_TARGET_GATE_V1";
const qualifierInsert=[
  "    /* MATERIAL_CLAIM_SCOPE_AND_ORDER_VERIFICATION_V1 */",
  "    if(!inspectClaimMaterialQualifiersV1({",
  "      claimText,excerpt,",
  "    }).passed)continue;",
  "",
].join("\n");
const plannerImportAnchor='import {\n  normalizeProductionClaimCategoryV2,\n} from "./production-claim-category-normalization-v2";';
const plannerImport='import {reviewAndConstrainVerifiedEvidenceV1} from "./semantic-evidence-review-v1";';
const plannerAnchor="  // ---- Stage 8A/8B ----";
const plannerInsert=[
  "  /* FINAL_EVIDENCE_SEMANTIC_ENTAILMENT_V1 */",
  "  const semanticEvidenceReview=await reviewAndConstrainVerifiedEvidenceV1({",
  "    claims:claimsInput,",
  "    graph:evidenceGraphInput,",
  "  });",
  "  evidenceGraphInput=semanticEvidenceReview.graph;",
  "  console.info(\"[content semantic evidence review]\",{",
  "    reviewed:semanticEvidenceReview.reviewedPairs,",
  "    approved:semanticEvidenceReview.approvedPairs,",
  "    demoted:semanticEvidenceReview.demotedEvidenceIds.length,",
  "    logicalAiCalls:semanticEvidenceReview.calls,",
  "  });",
  "",
].join("\n");
async function main(){
  const currentVerifier=await readFile(verifierPath,"utf8");
  const currentPlanner=await readFile(plannerPath,"utf8");
  let verifier=currentVerifier,planner=currentPlanner;
  const verifierPresent=verifier.includes(qualifierImport)&&
    verifier.includes("inspectClaimMaterialQualifiersV1({");
  if(!verifierPresent){
    findOnce(verifier,sourceImport,"VERIFIER_IMPORT");
    findOnce(verifier,qualifierAnchor,"VERIFIER_HOOK");
    if(verifier.includes(qualifierImport)||verifier.includes("inspectClaimMaterialQualifiersV1({")){
      throw new Error("MAIN_SEMANTIC_ADAPTER_PARTIAL_VERIFIER_NO_FILES_CHANGED");
    }
    verifier=verifier.replace(sourceImport,sourceImport+"\n"+qualifierImport)
      .replace(qualifierAnchor,qualifierInsert+"\n"+qualifierAnchor);
  }
  const plannerPresent=planner.includes(plannerImport)&&
    planner.includes("FINAL_EVIDENCE_SEMANTIC_ENTAILMENT_V1");
  if(!plannerPresent){
    findOnce(planner,plannerImportAnchor,"PLANNER_IMPORT");
    findOnce(planner,plannerAnchor,"PLANNER_STAGE");
    if(planner.includes(plannerImport)||planner.includes("FINAL_EVIDENCE_SEMANTIC_ENTAILMENT_V1"))
      throw new Error("MAIN_SEMANTIC_ADAPTER_PARTIAL_PLANNER_NO_FILES_CHANGED");
    planner=planner.replace(plannerImportAnchor,plannerImportAnchor+"\n\n"+plannerImport)
      .replace(plannerAnchor,plannerInsert+"\n"+plannerAnchor);
  }
  // Complete both transformations before writing EITHER file.
  if(verifier.split("inspectClaimMaterialQualifiersV1({").length!==2 ||
    planner.split("reviewAndConstrainVerifiedEvidenceV1({").length!==2){
    throw new Error("MAIN_SEMANTIC_ADAPTER_INVARIANT_NO_FILES_CHANGED");
  }
  if(currentVerifier!==verifier)await writeFile(verifierPath,verifier,"utf8");
  if(currentPlanner!==planner)await writeFile(plannerPath,planner,"utf8");
  console.log("MAIN_SEMANTIC_EVIDENCE_REVIEW_WIRED");
}
main().catch(error=>{
  console.error(error instanceof Error?error.message:String(error));
  process.exitCode=1;
});
