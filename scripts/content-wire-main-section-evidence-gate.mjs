/**
 * Adapt SECTION_EDITORIAL_EVIDENCE_CAPACITY_V1 into an older local
 * service.ts without replacing the existing production Writer.
 *
 * Idempotent, guarded single-file edit; no API calls, no DB changes.
 * Refuses unmatched worktree layouts instead of guessing.
 */
import { readFile,writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const file=resolve("src/lib/content/service.ts");
const importCode=[
  "import {",
  "  assertSectionEvidenceCapacityV1,",
  '} from "./section-evidence-capacity-v1";',
].join("\n");
async function main(){
  let source=await readFile(file,"utf8");
  const existingImport=source.includes('from "./section-evidence-capacity-v1"');
  const existingCall=/assertSectionEvidenceCapacityV1\s*\(\s*persistedArticleExecutionPlan\.sections\s*\)/.test(source);
  if(existingImport&&existingCall){
    console.log("MAIN_SECTION_EVIDENCE_GATE_ALREADY_PRESENT");
    return;
  }
  if(existingImport!==existingCall){
    throw new Error("MAIN_SECTION_EVIDENCE_GATE_PARTIAL_INTEGRATION_NO_FILES_CHANGED");
  }
  const importAnchor=/import\s*\{\s*assertArticlePreWriterAnswerSupportV2,[\s\S]*?\}\s*from\s*["']\.\/article-prewriter-evidence-gate-v1["'];/g;
  const imports=[...source.matchAll(importAnchor)];
  const callAnchor=/(assertArticlePreWriterAnswerSupportV2\s*\(\s*persistedArticleExecutionPlan\s*\)\s*;)/g;
  const calls=[...source.matchAll(callAnchor)];
  if(imports.length!==1||calls.length!==1){
    throw new Error("MAIN_SERVICE_EVIDENCE_INSERTION_LAYOUT_UNEXPECTED_NO_FILES_CHANGED");
  }
  source=source.replace(importAnchor,match=>match+"\n"+importCode);
  source=source.replace(callAnchor,match=>match+[
    "",
    "  /* EVIDENCE_BEFORE_EDITORIAL_VOLUME_V1 */",
    "  assertSectionEvidenceCapacityV1(",
    "    persistedArticleExecutionPlan.sections",
    "  );",
  ].join("\n"));
  // Check both symbols survived and only one guard is present.
  if(source.split('from "./section-evidence-capacity-v1"').length!==2||
     source.split("assertSectionEvidenceCapacityV1(").length!==2){
    throw new Error("MAIN_SERVICE_EVIDENCE_INSERTION_VERIFICATION_FAILED");
  }
  await writeFile(file,source,"utf8");
  console.log("MAIN_SECTION_EVIDENCE_GATE_WIRED");
}
main().catch(e=>{
  console.error(e instanceof Error?e.message:String(e));
  process.exitCode=1;
});
