/**
 * FREE post-CAS validation: latest stored article, latest actual replay,
 * source-link scope, QueryGraph ownership, and literal copyedit proposal.
 * NEVER edits article, research, replay, source ledger, or source URLs.
 *
 * GROWTH_OS_ENV_DIR=... NODE_OPTIONS=--conditions=react-server \
 * npx tsx scripts/content-existing-article-postcommit-audit.ts --article=ID
 */
import {loadEnvConfig} from "@next/env";
loadEnvConfig(process.env.GROWTH_OS_ENV_DIR?.trim()||process.cwd());
const object=(v:unknown):Record<string,unknown>|null=>
  v!==null&&typeof v==="object"&&!Array.isArray(v)?
    v as Record<string,unknown>:null;
const arrayOfText=(v:unknown):string[]=>
  Array.isArray(v)?v.filter((x):x is string=>typeof x==="string"):[];
async function main(){
  const args=process.argv.slice(2);
  const articleId=args.find(a=>a.startsWith("--article="))?.slice(10);
  if(args.length!==1||!articleId||!/^[a-z0-9_-]{5,100}$/i.test(articleId))
    throw new Error("USAGE: --article=EXISTING_ID");
  const {prisma}=await import("../src/lib/prisma");
  try {
    const article=await prisma.contentArticle.findUnique({
      where:{id:articleId},
      include:{brief:{select:{
        websiteId:true,primaryKeyword:true,secondaryKeywords:true,
      }}},
    });
    if(!article)throw new Error("ARTICLE_NOT_FOUND");
    const [saved,replay]=await Promise.all([
      prisma.contentEvidenceSnapshot.findUnique({
        where:{briefId:article.briefId},select:{id:true,plan:true},
      }),
      prisma.serpReplayArtifact.findFirst({
        where:{contentArticleId:articleId},
        orderBy:[{createdAt:"desc"},{id:"desc"}],
      }),
    ]);
    const {buildSerpReplayArticleFingerprintV1}=await import(
      "../src/lib/content/serp-replay-fingerprint");
    const {previewObservedArticleJoinCopyeditV1}=await import(
      "../src/lib/content/article-copyedit-join-repair-v1");
    const {probeSavedArticleJoinIntegrityV1,
      simulateQueryOwnerBindingWithoutPersistenceV1}=await import(
      "../src/lib/content/existing-article-postcommit-integrity-v1");
    const {evaluateArticleSearchReadinessV2}=await import(
      "../src/lib/content/article-search-readiness-v2");
    const {inspectMasterRuntimeSnapshot}=await import(
      "../src/lib/content/master-runtime-adapter");
    const {parsePersistedArticleExecutionPlanV1}=await import(
      "../src/lib/content/article-execution-plan-binding-v1");
    const {verifyExistingArticleCitationScopeV1}=await import(
      "../src/lib/content/existing-article-citation-authority-v1");
    const original={
      title:article.title,metaDescription:article.metaDescription,
      h1:article.h1,bodyMarkdown:article.bodyMarkdown,
    };
    const proposal=previewObservedArticleJoinCopyeditV1(article.bodyMarkdown);
    const {buildArticleDemandOutlineAuditV1}=await import(
      "../src/lib/content/article-demand-outline-audit-v1");
    const {detectArticleInformationGainDefectsV1}=await import(
      "../src/lib/content/article-editorial-information-gain-v1");
    const {previewArticleWithoutInlineSourceLabelsV1}=await import(
      "../src/lib/content/article-reader-cleanup-v1");
    const oldFingerprint=buildSerpReplayArticleFingerprintV1(original);
    const proposedFingerprint=buildSerpReplayArticleFingerprintV1({
      ...original,bodyMarkdown:proposal.proposedBodyMarkdown,
    });
    const planData=object(saved?.plan);
    const runtime=saved?
      inspectMasterRuntimeSnapshot(saved.plan).runtime:null;
    const plan=planData?
      parsePersistedArticleExecutionPlanV1(planData.articleExecutionPlan):null;
    const readiness=evaluateArticleSearchReadinessV2({
      article:original,runtime,plan,replay,
      primaryKeyword:article.brief.primaryKeyword,
      secondaryKeywords:article.brief.secondaryKeywords,
    });
    const sourceScope=runtime&&plan?
      verifyExistingArticleCitationScopeV1({
        candidateBodyMarkdown:article.bodyMarkdown,runtime,plan,
      }):null;
    const {proposeExistingArticleQueryOwnerRebindV1}=await import(
      "../src/lib/content/existing-article-query-owner-proposal-v1");
    const queryBindingProposal=runtime&&plan?
      proposeExistingArticleQueryOwnerRebindV1({
        article:original,runtime,plan,
        primaryKeyword:article.brief.primaryKeyword,
        secondaryKeywords:article.brief.secondaryKeywords,replay,
      }):null;
    const queryBindingWhatIf=runtime&&plan?
      simulateQueryOwnerBindingWithoutPersistenceV1({
        article:original,runtime,plan,
        primaryKeyword:article.brief.primaryKeyword,
        secondaryKeywords:article.brief.secondaryKeywords,replay,
      }):null;
    // The canonical evidence snapshot is frozen. An optional, separately
    // approved owner decision is accepted only when *all* original SHA
    // fingerprints, replay ID and evidence snapshot ID still match.
    // P2021 means this new append-only table hasn't been migrated yet;
    // the legacy audit remains fully read-only and functional.
    const {evaluateApprovedExistingArticleQueryOwnerV1}=await import(
      "../src/lib/content/existing-article-approved-query-owner-v1");
    let approvedReviewStore="AVAILABLE";
    let approvedReview:null|{
      id:string;decisionVersion:string;decision:string;
      contentArticleId:string;evidenceSnapshotId:string;queryNodeId:string;
      observedQuery:string;ownerSectionIndex:number;ownerHeading:string;
      sourceArticleFingerprint:string;sourceQueryGraphSha256:string;
      sourceSectionBlueprintSha256:string;sourceExecutionPlanSha256:string;
      sourceReplayArtifactId:string;reviewerAttestation:string;
    }=null;
    const singleNode=queryBindingProposal?.candidateCount===1
      ?queryBindingProposal.proposals[0]?.nodeId:null;
    if(singleNode){
      try{
        approvedReview=await prisma.contentQueryOwnerReview.findFirst({
          where:{contentArticleId:articleId,queryNodeId:singleNode,
            sourceArticleFingerprint:oldFingerprint},
          orderBy:[{createdAt:"desc"},{id:"desc"}],
        });
      }catch(e){
        if(e&&typeof e==="object"&&"code" in e&&e.code==="P2021")
          approvedReviewStore="MIGRATION_NOT_INSTALLED";
        else throw e;
      }
    }
    const approvedOwner=runtime&&plan&&saved?
      evaluateApprovedExistingArticleQueryOwnerV1({
        articleId,evidenceSnapshotId:saved.id,
        replayArtifactId:replay?.id??null,
        article:original,runtime,plan,
        primaryKeyword:article.brief.primaryKeyword,
        secondaryKeywords:article.brief.secondaryKeywords,replay,
        review:approvedReview,
      }):null;
    const afterApproval=approvedOwner?.valid?
      evaluateArticleSearchReadinessV2({
        article:original,runtime:approvedOwner.runtime,plan,replay,
        primaryKeyword:article.brief.primaryKeyword,
        secondaryKeywords:article.brief.secondaryKeywords,
      }):null;
    // Treat approved, source-hash-matched read-time ownership as the
    // EFFECTIVE article-readiness view. Never imply that the original
    // immutable signed graph changed. Do not show the original query
    // ownership warning as if approval had not happened.
    const effectiveReadiness=afterApproval??readiness;
    const provenance=object(replay?.provenance);
    const editorialRecovery=object(provenance?.editorialRecovery);
    const approvedNodeOwners:Record<string,number>={};
    if(approvedOwner?.valid)
      approvedNodeOwners[approvedOwner.queryNodeId]=approvedOwner.ownerSectionIndex;
    const demandOutline=buildArticleDemandOutlineAuditV1({
      ...original,
      primaryKeyword:article.brief.primaryKeyword,
      secondaryKeywords:article.brief.secondaryKeywords,
      runtime,
      approvedNodeOwners,
    });
    const semanticFillerFindings=detectArticleInformationGainDefectsV1(
      article.bodyMarkdown);
    const readerPreview=previewArticleWithoutInlineSourceLabelsV1(
      article.bodyMarkdown);
    const {draftSavedArticleSectionReferenceLayoutV1}=await import(
      "../src/lib/content/article-reader-cleanup-v1");
    const sourceLayout=draftSavedArticleSectionReferenceLayoutV1(
      article.bodyMarkdown);
    const layoutScope=runtime&&plan?
      verifyExistingArticleCitationScopeV1({
        candidateBodyMarkdown:sourceLayout.proposedBodyMarkdown,
        plan,runtime,
      }):null;
    const layoutFindings=detectArticleInformationGainDefectsV1(
      sourceLayout.proposedBodyMarkdown);
    const layoutOriginalLinks=sourceScope?.sections.map(
      x=>x.approvedLinks)??[];
    const layoutApprovedLinks=layoutScope?.sections.map(
      x=>x.approvedLinks)??[];
    const layoutSafeForResearchSemantics=
      !!layoutScope&&sourceLayout.everyH2RetainsItsOwnUrls&&
      layoutScope.unapprovedLinks===0&&
      layoutOriginalLinks.length===layoutApprovedLinks.length&&
      layoutOriginalLinks.every((n,i)=>n===layoutApprovedLinks[i]);
    // Cost-free go/no-go before anyone authorizes a bounded model repair.
    // Old generation checkpoints can be outdated after the 13 citations
    // were saved. The exact article and CURRENT evidence must be validated.
    const {evaluateComprehensiveEditorialReleaseV1}=await import(
      "../src/lib/content/comprehensive-editorial-release-gate-v1");
    const {detectPersistedArticleEditorialRepetitionV1}=await import(
      "../src/lib/content/editorial-repetition-guard-v1");
    const {assertSectionEvidenceCapacityV1}=await import(
      "../src/lib/content/section-evidence-capacity-v1");
    const structuralGate=plan?
      evaluateComprehensiveEditorialReleaseV1({
        plan,bodyMarkdown:article.bodyMarkdown,
      }):null;
    const repeatedAdvice=detectPersistedArticleEditorialRepetitionV1(
      article.bodyMarkdown);
    let repairEvidencePreflight="RESEARCH_NOT_AVAILABLE";
    if(plan&&runtime){
      try{
        assertSectionEvidenceCapacityV1(plan.sections);
        repairEvidencePreflight="PASS";
      }catch(e){
        repairEvidencePreflight="STOP:"+(e instanceof Error?e.message:String(e));
      }
    }
    let checkpointPreflight:"RESEARCH_NOT_AVAILABLE"|"VERIFIED_ARCHIVE_FOUND"|
      "NO_COMPATIBLE_SIGNED_ARCHIVE"="RESEARCH_NOT_AVAILABLE";
    let archivedSections=0;
    if(plan&&runtime&&repairEvidencePreflight==="PASS"){
      const {buildArticleGenerationContractV1}=await import(
        "../src/lib/content/article-generation-contract");
      const {bindArticleExecutionPlanToGenerationContractV1}=await import(
        "../src/lib/content/article-execution-plan-binding-v1");
      const {inspectArchivedWriterProgressV1}=await import(
        "../src/lib/content/writer-recovery-archived-progress-v1");
      const {geminiGenerator}=await import(
        "../src/lib/content/gemini-generator");
      const {resolve,join}=await import("node:path");
      const contract=bindArticleExecutionPlanToGenerationContractV1({
        plan,contract:buildArticleGenerationContractV1(runtime),
      });
      const roots=[...new Set([
        resolve(process.env.GROWTH_OS_ARTICLE_CHECKPOINT_DIR?.trim()||
          ".growth-os-tmp/article-checkpoints"),
        ...(process.env.GROWTH_OS_ENV_DIR?.trim()?
          [resolve(process.env.GROWTH_OS_ENV_DIR,
            ".growth-os-tmp/article-checkpoints")]:[]),
      ])].flatMap(base=>[
        join(base,"research-recovery-editorial"),
        join(base,"research-recovery"),
      ]);
      checkpointPreflight="NO_COMPATIBLE_SIGNED_ARCHIVE";
      for(const rootDirectory of roots){
        const inspection=await inspectArchivedWriterProgressV1({
          rootDirectory,articleId,briefId:article.briefId,
          modelName:geminiGenerator.modelName,contract,
        });
        if(inspection.compatible&&inspection.candidate){
          checkpointPreflight="VERIFIED_ARCHIVE_FOUND";
          archivedSections=inspection.verifiedSections;
          break;
        }
      }
    }
    const repairPreflight={
      version:"EXISTING_ARTICLE_FREE_REPAIR_PREFLIGHT_V1",
      mode:"NO_PROVIDER_CALLS_NO_WRITES",
      currentArticleStatus:article.status,
      currentArticleFingerprint:oldFingerprint,
      highConfidenceInformationDefects:semanticFillerFindings.map(f=>({
        code:f.code,sectionIndex:f.sectionIndex,
      })),
      repeatedAdviceSections:repeatedAdvice.map(f=>f.sectionIndex),
      structureBlockers:structuralGate?.blockers??["RESEARCH_NOT_AVAILABLE"],
      currentH2Count:structuralGate?.h2Count??null,
      currentH3Count:structuralGate?.h3Count??null,
      currentH3OwnerSections:structuralGate?.h3OwnerSections??null,
      requiredH3ForThisProduct:structuralGate?.minimumH3??null,
      evidencePreflight:repairEvidencePreflight,
      signedArchivePreflight:checkpointPreflight,
      signedArchiveSectionCount:archivedSections,
      estimatedModelCalls:null,
      modelCallHardCapIfSeparatelyAuthorized:16,
      repairAttemptHardCapIfSeparatelyAuthorized:2,
      paidRepairNotAuthorized:true,
      canGuaranteeRepairSuccess:false,
    };
    const result={
      mode:"FREE_EXISTING_ARTICLE_POSTCOMMIT_AUDIT",
      articleId,websiteId:article.brief.websiteId,
      articleStatus:article.status,
      articleUpdatedAt:article.updatedAt.toISOString(),
      oldFingerprint,
      currentSavedReplay:{
        id:replay?.id??null,status:replay?.replayStatus??null,
        executionStatus:replay?.executionStatus??null,
        articleFingerprintMatches:replay?.articleFingerprint===oldFingerprint,
        capturedAt:replay?.serpCapturedAt?.toISOString()??null,
        warnings:arrayOfText(replay?.warnings),
        blockers:arrayOfText(replay?.blockers),
        comparisonsRecorded:Array.isArray(replay?.comparisons)?
          replay.comparisons.length:0,
        recordedCriticStatus:editorialRecovery?.finalCriticStatus??null,
        recordedReadinessStatus:editorialRecovery?.readinessStatus??null,
      },
      actualSavedCitationScope:sourceScope?{
        status:sourceScope.status,totalVisibleLinks:sourceScope.totalLinks,
        unauthorizedLinks:sourceScope.unapprovedLinks,
        uncoveredEvidenceSections:sourceScope.uncitedEvidenceSections,
        perH2:sourceScope.sections.map(x=>({
          index:x.sectionIndex,heading:x.heading,links:x.links,
          signedLinks:x.approvedLinks,
        })),
      }:null,
      demandOutline,
      editorialInformationDensity:{
        totalHighConfidenceFindings:semanticFillerFindings.length,
        findings:semanticFillerFindings,
        releaseGateNeedsRevision:semanticFillerFindings.length>0,
        noModelCalls:true,
      },
      repairPreflight,
      sourceLayoutCandidate:{
        mode:"FREE_ONLY_DOES_NOT_UPDATE_ARTICLE",
        totalMovedSourceLabels:sourceLayout.movedSourceLabels,
        sourceLabelsStillInline:sourceLayout.sourceLabelsStillInline,
        sameH2UrlScopePreserved:layoutSafeForResearchSemantics,
        sectionStats:sourceLayout.sections,
        layoutOnlyFindingsRemaining:layoutFindings.map(x=>({
          code:x.code,sectionIndex:x.sectionIndex,
        })),
        proposalFingerprint:buildSerpReplayArticleFingerprintV1({
          ...original,bodyMarkdown:sourceLayout.proposedBodyMarkdown,
        }),
        articleReplayWillBeStaleIfCommitted:sourceLayout.changed,
        noAutoCommit:true,
        noProviderCalls:true,
      },
      readerSourcePresentation:{
        inlineSourceLabelLinksMovedToOptionalFooter:
          readerPreview.researchLinks.length,
        savedMarkdownUnchanged:readerPreview.originalUnchanged,
        sourceUrlsPreserved:true,
        requiresReviewBeforePublishing:readerPreview.researchLinks.length>0,
      },
      queryBindingProposal,
      queryBindingWhatIf,
      approvedQueryOwnerReview:{
        storeStatus:approvedReviewStore,
        existingReviewId:approvedReview?.id??null,
        validForExactSavedArticle:approvedOwner?.valid??false,
        validationReason:approvedOwner?.reason??"RESEARCH_UNAVAILABLE",
        sourceResearchUnchanged:true,
        effectiveFindingCodesAfterHumanApproval:
          afterApproval?.findings.map(x=>x.code)??null,
        canClaimSeoReadyAfterApproval:
          afterApproval?.canClaimSeoReady??false,
      },
      independentCopyeditProbe:
        probeSavedArticleJoinIntegrityV1(article.bodyMarkdown),
      searchEditorial:{
        status:effectiveReadiness.status,
        canClaimSeoReady:effectiveReadiness.canClaimSeoReady,
        publishRecommendation:effectiveReadiness.publishRecommendation,
        approvedOwnerOverlayApplied:approvedOwner?.valid??false,
        originalResearchSnapshotUnchanged:true,
        findings:effectiveReadiness.findings.map(x=>({
          code:x.code,severity:x.severity,detail:x.detail??null,
          action:x.action,
        })),
        signedOriginalFindingCodes:readiness.findings.map(x=>x.code),
        suggestedQueryRebindings:
          effectiveReadiness.suggestedQueryRebindings,
      },
      knownCopyedit:{
        changes:proposal.changes,
        remainingKnownDefectsAfterProposal:proposal.remainingKnownProseDefects,
        exactProposedFingerprint:proposedFingerprint,
        currentReplayWillBeStaleIfApplied:
          proposedFingerprint!==oldFingerprint,
        safeForAutomaticPersist:false,
      },
      paidCalls:0,databaseUnchanged:true,
      nextAction:"REVIEW_COPYEDIT_AND_REAL_REPLAY_WARNINGS_BEFORE_NEW_FINGERPRINT_COMMIT",
    };
    console.log(JSON.stringify(result,null,2));
  }finally{await prisma.$disconnect();}
}
main().catch(e=>{
  console.error("POSTCOMMIT_AUDIT_FAILED="+(
    e instanceof Error?e.message:String(e)));
  process.exitCode=1;
});