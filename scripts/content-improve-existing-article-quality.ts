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
  const reviewedCitationMode=args.includes("--repair-reviewed-citations");
  const exactCitationMode=args.includes("--repair-signed-citations");
  const citationMode=exactCitationMode||reviewedCitationMode;
  if(!articleId||!/^[a-z0-9_-]{5,100}$/i.test(articleId)||
    args.some(a=>a!=="--execute"&&a!=="--authorize-paid-improvement"&&
      a!=="--repair-signed-citations"&&
      a!=="--repair-reviewed-citations"&&
      !a.startsWith("--article="))||
    execute!==authorized||(exactCitationMode&&reviewedCitationMode))
    throw new Error(
      "USAGE: --article=EXISTING_ID [--repair-signed-citations | --repair-reviewed-citations] [--execute --authorize-paid-improvement]");
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
    const signedCitationPreview=citationMode?await (async()=>{
      const {draftExistingArticleSignedCitationsV1}=await import(
        "../src/lib/content/existing-article-source-citation-repair-v1");
      const {verifyExistingArticleCitationScopeV1}=await import(
        "../src/lib/content/existing-article-citation-authority-v1");
      const draft=reviewedCitationMode
        ?await (async()=>{
          const {loadReviewedSignedCitationDraftV1}=await import(
            "../src/lib/content/existing-article-reviewed-citation-recovery-v1");
          return loadReviewedSignedCitationDraftV1({
            articleId,bodyMarkdown:article.bodyMarkdown,plan,
            runtime:inspected.runtime!,
          });
        })()
        :draftExistingArticleSignedCitationsV1({
          bodyMarkdown:article.bodyMarkdown,plan,runtime:inspected.runtime!,
        });
      const scope=verifyExistingArticleCitationScopeV1({
        candidateBodyMarkdown:draft.proposedBodyMarkdown,
        plan,runtime:inspected.runtime!,
      });
      return {
        proposedCitationCount:draft.totalAddedCitations,
        candidateSections:draft.sections.map(x=>({
          index:x.sectionIndex,heading:x.heading,
          proposedCitations:x.proposedCitationCount,
          sourceClaimAnchorsNotExact:x.exactClaimAnchorMissing.length,
        })),
        scopeStatus:scope.status,
        sectionsStillWithoutVisibleSources:
          scope.sections.filter(section=>
            section.assignedEvidence>0&&section.approvedLinks===0)
            .map(section=>({index:section.sectionIndex,heading:section.heading})),
        canBeginSameArticleSignedCitationRepair:
          draft.totalAddedCitations>0&&
          scope.status==="REVIEW_SEMANTIC_PROOF_REQUIRED"&&
          scope.sections.every(section=>
            section.assignedEvidence===0||section.approvedLinks>0),
        note:"Lexically anchored verified citations, not final factual publication approval. Any paid run still requires section semantic verification, 9 critics, fresh replay, unchanged-source CAS.",
      };
    })():null;
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
    const {composeMasterArticleV1}=
      await import("../src/lib/content/master-article-composer");
    const signedPartialArticle=verifiedProgress?
      composeMasterArticleV1({
        contract,shell:verifiedProgress.shell,
        sections:verifiedProgress.accepted.map(x=>x.section),
      }):null;
    const actualCachedArticleWords=signedPartialArticle?
      countWords(signedPartialArticle.bodyMarkdown):null;
    const {inspectQualityKeywordRegressionV1}=
      await import("../src/lib/content/quality-improvement-keyword-recovery-v1");
    const {splitPersistedArticleByCanonicalH2V1}=
      await import("../src/lib/content/existing-article-section-rebind-v1");
    const keywordCheck=signedPartialArticle?
      inspectQualityKeywordRegressionV1({
        original:{title:article.title,metaDescription:article.metaDescription,
          h1:article.h1,bodyMarkdown:article.bodyMarkdown},
        current:signedPartialArticle,
        primaryKeyword:article.brief.primaryKeyword,
        secondaryKeywords:article.brief.secondaryKeywords,
        originalSectionBodies:splitPersistedArticleByCanonicalH2V1(
          article.bodyMarkdown,
          contract.sectionContracts.map(s=>s.blueprint.heading)),
        editableSectionIndices:improvement.steps.map(s=>s.index),
      }):null;
    const {detectHighConfidenceEditorialRepetitionV1}=
      await import("../src/lib/content/editorial-repetition-guard-v1");
    const {proposeOriginalSectionKeywordSentenceV1}=
      await import("../src/lib/content/quality-improvement-keyword-original-sentence-v1");
    const originalBodies=splitPersistedArticleByCanonicalH2V1(
      article.bodyMarkdown,contract.sectionContracts.map(x=>x.blueprint.heading));
    const sentenceRecoveryCandidates=verifiedProgress&&keywordCheck?
      keywordCheck.losses.map(loss=>{
        const index=loss.repairableOwningSections[0];
        if(index===undefined)return {
          keyword:loss.keyword,originalSectionIndex:null,
          candidateAvailable:false,preflightReason:"NO_EDITABLE_ORIGINAL_OWNER",
        };
        const sentence=proposeOriginalSectionKeywordSentenceV1({
          originalBody:originalBodies[index],
          currentBody:verifiedProgress.accepted[index].section.bodyMarkdown,
          missingKeyword:loss.keyword,
        });
        if(!sentence)return {
          keyword:loss.keyword,originalSectionIndex:index,
          candidateAvailable:false,
          preflightReason:"NO_SAFE_ORIGINAL_SENTENCE_PLACEMENT",
        };
        const proposedSections=verifiedProgress.accepted.map((entry,i)=>({
          heading:entry.section.heading,
          bodyMarkdown:i===index?sentence.bodyMarkdown:
            entry.section.bodyMarkdown,
        }));
        const keywordComposed=composeMasterArticleV1({
          contract,shell:verifiedProgress.shell,
          sections:verifiedProgress.accepted.map((entry,i)=>
            i===index?{...entry.section,bodyMarkdown:sentence.bodyMarkdown}:
              entry.section),
        });
        const proposedWordCount=countWords(keywordComposed.bodyMarkdown);
        const restoredCoverage=inspectQualityKeywordRegressionV1({
          original:{title:article.title,metaDescription:article.metaDescription,
            h1:article.h1,bodyMarkdown:article.bodyMarkdown},
          current:keywordComposed,
          primaryKeyword:article.brief.primaryKeyword,
          secondaryKeywords:article.brief.secondaryKeywords,
          originalSectionBodies:originalBodies,
          editableSectionIndices:improvement.steps.map(x=>x.index),
        });
        const detectedRepetition=detectHighConfidenceEditorialRepetitionV1(
          proposedSections);
        return {
          keyword:loss.keyword,originalSectionIndex:index,
          candidateAvailable:true,proposedWordCount,
          wouldRestoreCoverage:restoredCoverage.restored,
          editorialFindings:detectedRepetition.map(f=>f.code),
          freeValidationPass:
            restoredCoverage.losses.length<keywordCheck.losses.length &&
            detectedRepetition.length===0 &&
            proposedWordCount>=minimumWords &&
            proposedWordCount<=3200,
          note:"Proposed original sentence still requires paid current-source semantic verification.",
        };
      }):[];
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
      completeArticleWords:actualCachedArticleWords,
      completeArticleMinimumWords:minimumWords,
      needsPostEditorialDepthRecovery:actualCachedArticleWords!==null&&
        actualCachedArticleWords<minimumWords,
      originalSentenceRecovery:sentenceRecoveryCandidates,
      plannedKeywordCoverage:{
        originalUsed:keywordCheck?.originalUsed??null,
        cachedUsed:keywordCheck?.currentUsed??null,
        restored:keywordCheck?.restored??null,
        lostExactPhrases:keywordCheck?.losses??[],
      },
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


    /*
     * READ_ONLY_SEARCH_EDITORIAL_HANDOFF_V1
     *
     * Word-target completion != search/editorial readiness.
     * Keep this separate from the paid depth-only improvement gate:
     * source citations and signed query ownership require their own
     * provenance review, not forced model expansion.
     */
    const editorialReadiness=!execute?await (async()=>{
      const {evaluateArticleSearchReadinessV2}=
        await import("../src/lib/content/article-search-readiness-v2");
      const replay=await prisma.serpReplayArtifact.findFirst({
        where:{contentArticleId:articleId},
        orderBy:[{createdAt:"desc"},{id:"desc"}],
      });
      const readiness=evaluateArticleSearchReadinessV2({
        article:{
          title:article.title,metaDescription:article.metaDescription,
          h1:article.h1,bodyMarkdown:article.bodyMarkdown,
        },
        primaryKeyword:article.brief.primaryKeyword,
        secondaryKeywords:article.brief.secondaryKeywords,
        runtime:inspected.runtime,plan,replay,
      });
      return {
        status:readiness.status,
        canClaimSeoReady:readiness.canClaimSeoReady,
        publishRecommendation:readiness.publishRecommendation,
        findings:readiness.findings.map(f=>({
          code:f.code,severity:f.severity,
          action:f.action,...(f.detail?{detail:f.detail}:{}),
        })),
        sourceReviewCandidates:readiness.sectionSourceCandidates.map(s=>({
          sectionIndex:s.sectionIndex,heading:s.heading,
          availableVerifiedSourceLinks:s.evidenceBackedLinks.length,
          governmentSourceUrls:s.evidenceBackedLinks
            .filter(link=>link.sourceType==="PRIMARY_GOVERNMENT")
            .map(link=>link.url),
        })),
        suggestedQueryRebindings:readiness.suggestedQueryRebindings,
        nextAction:readiness.findings.length>0
          ?"REVIEW_OWNING_EDITORIAL_STAGES_NO_AUTO_REWRITE"
          :"NO_EDITORIAL_READINESS_FINDINGS",
        note:"NO_DEFICIT only means word target met. This report neither alters signed evidence/query ownership nor approves publication.",
      };
    })():null;

    console.log(JSON.stringify({
      mode:citationMode
        ?(execute?"EXPLICIT_PAID_SAME_ID_SIGNED_CITATION_REPAIR":
          "FREE_SAME_ID_SIGNED_CITATION_REPAIR_PREVIEW")
        :(execute?"EXPLICIT_PAID_SAME_ID_IMPROVEMENT":
          "FREE_SAME_ID_QUALITY_IMPROVEMENT_PREVIEW"),
      reviewSource:reviewedCitationMode?"EXACT_SIGNED_H2_CHECKPOINTS":
        exactCitationMode?"EXACT_SIGNED_CLAIM_MATCHES":"NONE",
      articleId,status:article.status,updatedAt:article.updatedAt.toISOString(),
      currentWords:countWords(article.bodyMarkdown),requiredWords:minimumWords,
      currentH3:(article.bodyMarkdown.match(/^###\s+/gm)??[]).length,
      improvement,
      signedCitationPreview,
      editorialReadiness,
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
      article.publishedUrl!==null||
      (citationMode?!signedCitationPreview?.canBeginSameArticleSignedCitationRepair:
        !improvement.eligible))
      throw new Error("PAID_IMPROVEMENT_NOT_ELIGIBLE");
    if(!checkpointReady)throw new Error(
      "PAID_IMPROVEMENT_SAFE_STOP_NO_COMPATIBLE_SIGNED_CHECKPOINT");
    const {improveExistingArticleQualityV1}=
      await import("../src/lib/content/existing-article-quality-improvement-v1");
    const result=await improveExistingArticleQualityV1(
      articleId,article.updatedAt.toISOString(),
      reviewedCitationMode?"REVIEWED_SIGNED_CITATIONS":
        exactCitationMode?"EXACT_SIGNED_CITATIONS":"DEPTH");
    console.log(JSON.stringify(result,null,2));
    console.log("SAME_ID_QUALITY_IMPROVEMENT_FINISHED");
  }finally{await prisma.$disconnect();}
}
main().catch(e=>{
  console.error("QUALITY_IMPROVEMENT_STOPPED:",
    e instanceof Error?e.message:String(e));process.exitCode=1;
});
