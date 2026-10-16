/**
 * Reconstruct a MasterWriterRun from a SHA256-checked historical section
 * progress, without pretending its old full contract SHA equals the current
 * contract or silently executing a new Writer.
 *
 * ALL six original sections are reconciled to CURRENT claim/evidence graph
 * and undergo fresh paid semantic verification before authorizing edits.
 * Any mismatch in article bytes, shell, section identity, mandatory
 * claims or source support fails closed. No file or DB writes.
 */
import type {ArticleGenerationContractV1}
  from "./article-generation-contract";
import type {MasterWriterSectionProgressV1}
  from "./master-writer-section-progress-v1";
import type {MasterWriterRunV1}
  from "./master-writer-orchestrator";
import {composeMasterArticleV1}
  from "./master-article-composer";
import {normalizeMasterArticleProseSpacesV1}
  from "./article-prose-whitespace-v1";
import {verifyGeneratedSectionOnlyV1,
  type MasterSectionVerificationGenerator}
  from "./master-section-repair";
import {splitPersistedArticleByCanonicalH2V1}
  from "./existing-article-section-rebind-v1";
import {inspectSavedWriterAgainstCurrentContractV1}
  from "./writer-recovery-archived-progress-v1";

export interface PersistedArticleShapeV1{
  readonly title:string;
  readonly metaDescription:string;
  readonly h1:string;
  readonly bodyMarkdown:string;
}

export async function rebindSignedArchivedWriterRunV1({
  progress,contract,generator,article,
}:{
  progress:Readonly<MasterWriterSectionProgressV1>;
  contract:Readonly<ArticleGenerationContractV1>;
  generator:Readonly<MasterSectionVerificationGenerator>;
  article:Readonly<PersistedArticleShapeV1>;
}):Promise<Readonly<MasterWriterRunV1>>{
  const mismatches=inspectSavedWriterAgainstCurrentContractV1({
    checkpoint:progress,contract,modelName:generator.modelName,
  });
  if(mismatches.length)throw new Error(
    "QUALITY_ARCHIVE_CURRENT_EVIDENCE_MISMATCH:"+mismatches.join(","));
  const shell=progress.shell;
  if(shell.provenance?.modelName!==generator.modelName ||
    shell.provenance.h1Mission!==contract.h1Mission ||
    shell.provenance.sourceRuntimeVersion!==contract.sourceRuntimeVersion ||
    shell.title!==article.title ||
    shell.metaDescription!==article.metaDescription ||
    shell.h1!==article.h1)
    throw new Error("QUALITY_ARCHIVE_SHELL_MISMATCH");

  const bodies=splitPersistedArticleByCanonicalH2V1(
    article.bodyMarkdown,
    contract.sectionContracts.map(c=>c.blueprint.heading));
  const verified=[];
  for(let i=0;i<progress.accepted.length;i++){
    const archived=progress.accepted[i];
    const body=bodies[i];
    // A critic may have changed prose after the checkpoint was written.
    // Never reuse its outdated semantic verification for those bytes.
    const section={...archived.section,bodyMarkdown:body};
    verified.push(await verifyGeneratedSectionOnlyV1({
      contract:contract.sectionContracts[i],
      section,generator,
    }));
  }
  const sections=verified.map(x=>x.section);
  const reconciliations=verified.map(x=>x.reconciliation);
  const semantics=verified.map(x=>x.semanticVerification);
  const repairs=progress.accepted.map(x=>x.repair);
  const result=composeMasterArticleV1({
    contract,shell,sections,
  });
  if(result.title!==article.title ||
    result.metaDescription!==article.metaDescription ||
    result.h1!==article.h1 ||
    result.bodyMarkdown!==normalizeMasterArticleProseSpacesV1(
      article.bodyMarkdown))
    throw new Error("QUALITY_ARCHIVE_ARTICLE_BYTES_MISMATCH");
  const names=[...new Set(sections.map(s=>s.provenance.modelName))];
  return {
    version:"MASTER_WRITER_RUN_V1",
    shell,sections,reconciliations,semanticVerifications:semantics,
    repairs,article:result,
    provenance:{
      sourceContractVersion:"ARTICLE_GENERATION_CONTRACT_V1",
      sourceRuntimeVersion:contract.sourceRuntimeVersion,
      generatorModelName:generator.modelName,
      shellModelName:shell.provenance.modelName,
      sectionModelNames:names,
      sectionCount:sections.length,
      reconciliationCount:reconciliations.length,
      reconciliationWarnCount:reconciliations.filter(s=>s.status==="WARN").length,
      reconciliationBlockCount:0,
      semanticVerificationCount:semantics.length,
      semanticWarnCount:semantics.filter(s=>s.status==="WARN").length,
      semanticBlockCount:0,
      repairedSectionCount:repairs.filter(r=>r.attempted).length,
      repairAttemptCount:repairs.reduce((n,r)=>n+r.attemptCount,0),
      executionMode:"SEQUENTIAL",
    },
  };
}
