/**
 * SAME-ID source-grounded article improvement.
 *
 * Free preview:
 *  GROWTH_OS_ENV_DIR=... NODE_OPTIONS=--conditions=react-server \
 *  npx tsx scripts/content-improve-existing-article-quality.ts --article=ID
 *
 * Paid, explicit:
 *  ... --article=ID --execute --authorize-paid-improvement
 *
 * No new brief/article, no paid research. Requires a saved SHA256-verified
 * same-article POST_FINAL_REPLAY checkpoint and unchanged local database.
 * Preserves old bytes unless all section, 9 critic, publication, Content,
 * and SERP replay gates pass and a serializable CAS commits.
 */
import {loadEnvConfig} from "@next/env";
loadEnvConfig(process.env.GROWTH_OS_ENV_DIR?.trim()||process.cwd());
async function main(){
  const args=process.argv.slice(2);
  const articleId=args.find(a=>a.startsWith("--article="))?.slice(10);
  const execute=args.includes("--execute");
  const authorized=args.includes("--authorize-paid-improvement");
  if(!articleId||!/^[a-z0-9_-]{5,100}$/i.test(articleId)||
    args.some(a=>a!=="--execute"&&a!=="--authorize-paid-improvement"&&
      !a.startsWith("--article="))||
    execute!==authorized)throw new Error(
      "USAGE: --article=EXISTING_ID [--execute --authorize-paid-improvement]");
  const {prisma}=await import("../src/lib/prisma");
  try{
    const article=await prisma.contentArticle.findUnique({
      where:{id:articleId},
      include:{brief:{select:{
        primaryKeyword:true,secondaryKeywords:true,websiteId:true,
      }}},
    });
    if(!article)throw new Error("ARTICLE_NOT_FOUND");
    const snapshot=await prisma.contentEvidenceSnapshot.findUnique({
      where:{briefId:article.briefId},select:{plan:true},
    });
    if(!snapshot)throw new Error("EVIDENCE_SNAPSHOT_NOT_FOUND");
    const {parsePersistedArticleExecutionPlanV1}=
      await import("../src/lib/content/article-execution-plan-binding-v1");
    const {resolveArticleLengthContractV1}=
      await import("../src/lib/content/article-length-contract-v1");
    const {planSameArticleQualityImprovementV1}=
      await import("../src/lib/content/same-article-quality-improvement-v1");
    const {countWords}=
      await import("../src/lib/content/article-analyzer");
    const plan=parsePersistedArticleExecutionPlanV1(
      (snapshot.plan as Record<string,unknown>).articleExecutionPlan);
    const profile=resolveArticleLengthContractV1(plan);
    const minimumWords=profile.targetWords?.min??0;
    const sectionPlans=plan.sections.filter(s=>s.state==="WRITABLE");
    const sections=article.bodyMarkdown.split(/^##\s+/m).slice(1)
      .map((raw,index)=>{
        const body=raw.slice(Math.max(0,raw.indexOf("\n")+1));
        const section=sectionPlans[index];
        return {
          index,words:countWords(body),
          maxWords:section?.targetWords?.max??0,
          claimCount:section?.requiredClaimIds.length??0,
          evidenceCount:section?.evidenceIds.length??0,
          h3Count:(body.match(/^###\s+/gm)??[]).length,
        };
      });
    const improvement=planSameArticleQualityImprovementV1({
      wordCount:countWords(article.bodyMarkdown),minimumWords,sections,
    });
    // Signed section progress may reside under a historic contract hash,
    // or under the original checkout while this script runs in a worktree.
    // A FREE preview must inspect these archives before authorizing AI.
    const {inspectMasterRuntimeSnapshot}=
      await import("../src/lib/content/master-runtime-adapter");
    const {buildArticleGenerationContractV1}=
      await import("../src/lib/content/article-generation-contract");
    const {bindArticleExecutionPlanToGenerationContractV1}=
      await import("../src/lib/content/article-execution-plan-binding-v1");
    const {inspectArchivedWriterProgressV1}=
      await import("../src/lib/content/writer-recovery-archived-progress-v1");
    const {geminiGenerator}=await import("../src/lib/content/gemini-generator");
    const {resolve,join}=await import("node:path");
    const inspected=inspectMasterRuntimeSnapshot(snapshot.plan);
    if(!inspected.runtime)throw new Error("SAVED_CURRENT_RUNTIME_NOT_VALID");
    const contract=bindArticleExecutionPlanToGenerationContractV1({
      plan,contract:buildArticleGenerationContractV1(inspected.runtime),
    });
    const bases=[...new Set([
      resolve(process.env.GROWTH_OS_ARTICLE_CHECKPOINT_DIR?.trim()||
        ".growth-os-tmp/article-checkpoints"),
      ...(process.env.GROWTH_OS_ENV_DIR?.trim()?
        [resolve(process.env.GROWTH_OS_ENV_DIR,
          ".growth-os-tmp/article-checkpoints")]:[]),
    ])];
    const searches=[];
    let compatibleArchive=false;
    for(const base of bases){
      for(const relative of ["research-recovery-editorial","research-recovery"]){
        const found=await inspectArchivedWriterProgressV1({
          rootDirectory:join(base,relative),
          articleId,briefId:article.briefId,
          contract,modelName:geminiGenerator.modelName,
        });
        searches.push({
          kind:relative,compatible:found.compatible,
          inspected:found.candidatesInspected,
          verifiedSections:found.verifiedSections,
          rejectionReasons:found.rejectionReasons,
        });
        if(found.compatible){compatibleArchive=true;break;}
      }
      if(compatibleArchive)break;
    }
    const {readFile}=await import("node:fs/promises");
    let exactFinalCheckpoint=false;
    for(const base of bases){
      try{
        const raw=JSON.parse(await readFile(
          join(base,articleId+"-POST_FINAL_REPLAY.json"),"utf8"));
        const cp=raw?.checkpoint;
        const {createHash}=await import("node:crypto");
        exactFinalCheckpoint=cp?.articleId===articleId&&
          cp?.briefId===article.briefId&&
          raw.sha256===createHash("sha256").update(
            JSON.stringify(cp)).digest("hex");
        if(exactFinalCheckpoint)break;
      }catch{/* absent or unusable, never a source of authority */}
    }
    const checkpointReady=compatibleArchive||exactFinalCheckpoint;
    // Read ONLY the exact source+article-version-scoped local progress.
    // Inspecting the actual verified partial article prevents a needless
    // paid redo when its H3 headings were simply counted by a broken regex.
    const {qualityImprovementProgressDirectoryV1}=
      await import("../src/lib/content/quality-improvement-progress-scope-v1");
    const {fingerprintMasterWriterContractV1,
      readMasterWriterSectionProgressV1}=
      await import("../src/lib/content/master-writer-section-progress-v1");
    const progressDir=qualityImprovementProgressDirectoryV1({
      root:resolve(process.env.GROWTH_OS_ARTICLE_CHECKPOINT_DIR?.trim()||
        ".growth-os-tmp/article-checkpoints"),
      articleId,briefId:article.briefId,
      updatedAt:article.updatedAt.toISOString(),
      article:{title:article.title,metaDescription:article.metaDescription,
        h1:article.h1,bodyMarkdown:article.bodyMarkdown},
      snapshot:snapshot.plan,contract,modelName:geminiGenerator.modelName,
    });
    const progress=await readMasterWriterSectionProgressV1({
      directory:progressDir,articleId,briefId:article.briefId,
      contractHash:fingerprintMasterWriterContractV1(
        contract,geminiGenerator.modelName),
      modelName:geminiGenerator.modelName,
    });
    const verifiedProgress=progress?.accepted.length===
      contract.sectionContracts.length?progress:null;
    const partialH3=verifiedProgress?.accepted.reduce(
      (n,e)=>n+(e.section.bodyMarkdown.match(/^###\s+\S/gm)??[]).length,0)??0;
    const partialWords=verifiedProgress?.accepted.reduce(
      (n,e)=>n+countWords(e.section.bodyMarkdown),0)??null;
    const {detectHighConfidenceEditorialRepetitionV1}=
      await import("../src/lib/content/editorial-repetition-guard-v1");
    const verifiedEditorialFindings=verifiedProgress?
      detectHighConfidenceEditorialRepetitionV1(
        verifiedProgress.accepted.map(e=>({
          heading:e.section.heading,
          bodyMarkdown:e.section.bodyMarkdown,
        }))
      ):[];

    const incrementalQualityProgress={
      found:!!verifiedProgress,
      verifiedSections:verifiedProgress?.accepted.length??0,
      h3Count:partialH3,
      sectionWordTotal:partialWords,
      editorialRepetitionFindings:verifiedEditorialFindings.map(f=>({
        code:f.code,sectionIndex:f.sectionIndex,
        affectedSections:f.affectedSections,
        repeatedPhrases:f.repeatedPhrases,
      })),
      editorialClean:verifiedProgress!==null&&
        verifiedProgress!==undefined&&
        verifiedEditorialFindings.length===0,
      sourceBound:true,
      note:"Section-only word total excludes H2 heading words.",
    };


    console.log(JSON.stringify({
      mode:execute?"EXPLICIT_PAID_SAME_ID_IMPROVEMENT":
        "FREE_SAME_ID_QUALITY_IMPROVEMENT_PREVIEW",
      articleId,status:article.status,updatedAt:article.updatedAt.toISOString(),
      currentWords:countWords(article.bodyMarkdown),requiredWords:minimumWords,
      currentH3:(article.bodyMarkdown.match(/^###\s+/gm)??[]).length,
      improvement,
      verifiedCheckpointReady:checkpointReady,
      incrementalQualityProgress,
      checkpointEvidence:{
        compatibleArchivedProgress:compatibleArchive,
        exactFinalCheckpoint,
        searches,
      },
      ...(execute?{}:{modelCalls:0,databaseUnchanged:true}),
    },null,2));
    if(!execute){
      console.log("READ_ONLY_PREVIEW_FINISHED");
      return;
    }
    if(article.status!=="IN_REVIEW"||article.publishedAt!==null||
      article.publishedUrl!==null||!improvement.eligible)
      throw new Error("PAID_IMPROVEMENT_NOT_ELIGIBLE");
    if(!checkpointReady)throw new Error(
      "PAID_IMPROVEMENT_SAFE_STOP_NO_COMPATIBLE_SIGNED_CHECKPOINT");
    const {improveExistingArticleQualityV1}=
      await import("../src/lib/content/existing-article-quality-improvement-v1");
    const result=await improveExistingArticleQualityV1(
      articleId,article.updatedAt.toISOString());
    console.log(JSON.stringify(result,null,2));
    console.log("SAME_ID_QUALITY_IMPROVEMENT_FINISHED");
  }finally{await prisma.$disconnect();}
}
main().catch(e=>{
  console.error("QUALITY_IMPROVEMENT_STOPPED:",
    e instanceof Error?e.message:String(e));process.exitCode=1;
});
