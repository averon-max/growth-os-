/**
 * EXISTING_ARTICLE_RESEARCH_RECOVERY_V1
 *
 * Explicit paid, bounded, same-ID source-first rebuild of an IN_REVIEW
 * article whose section research lost informational depth.
 *
 * A. Re-plan only facts (not keywords/headings/intent/brief).
 * B. Fetch/verify proposed facts through the production SSRF-safe crawler.
 * C. One bounded source fallback wave; full semantic claim/excerpt review.
 * D. Rebuild SAME execution/section authority, run actual Master Writer,
 *    Critic->section repair, deterministic publication gates and SERP Replay.
 * E. Commit Article + Evidence Snapshot + append-only replay in one
 *    SERIALIZABLE CAS transaction. Archive old text and full old evidence
 *    snapshot as provenance. Never publish automatically.
 *
 * No DB write, new brief, new article or old-checkpoint mutation on failure.
 * One plan call, <=4 semantic evidence batches, <=30 writer/critic/replay
 * provider calls, <=6 targeted SERP fallback claim searches.
 * Provider transport retries may add physical requests; this limits
 * logical application dispatches, not provider-internal retries.
 */
import {createHash} from "node:crypto";
import {Prisma} from "@prisma/client";
import {prisma} from "@/lib/prisma";
import {callContentAiJson,geminiGenerator} from "./gemini-generator";
import {
  validateResearchExpansionProposalsV1,
  budgetResearchExpansionProposalsV1,
  type ResearchExpansionProposalV1,
} from "./existing-article-research-plan-v1";
import {
  readExistingResearchPlanningCheckpointV1,
  saveExistingResearchPlanningCheckpointV1,
  assertResearchPlanningCheckpointWritableV1,
} from "./existing-article-research-checkpoint-v1";
import {
  enrichLiveEvidenceGraphV1,
  discoverClaimEvidenceFallbackSourcesV1,
} from "./live-evidence-verification";
import {reviewAndConstrainVerifiedEvidenceV1} from "./semantic-evidence-review-v1";
import {buildEvidenceGraph} from "./evidence-graph";
import {buildClaimLedger,type ClaimInput} from "./claim-ledger";
import {buildSectionBlueprintSet} from "./section-blueprint";
import {buildArticleExecutionPlanV1} from "./article-execution-plan-v1";
import {parsePersistedArticleExecutionPlanV1,
  bindArticleExecutionPlanToGenerationContractV1}
  from "./article-execution-plan-binding-v1";
import {inspectSectionEvidenceCapacityV1} from "./section-evidence-capacity-v1";
import {inspectMasterRuntimeSnapshot} from "./master-runtime-adapter";
import {buildArticleGenerationContractV1} from "./article-generation-contract";
import {
  createContentRunBudgetV1,withContentRunBudgetV1,
} from "./content-run-budget-v1";
import {executeMasterWriterV1} from "./master-writer-orchestrator";
import {buildMasterArticleSemanticCriticContextV1}
  from "./master-article-semantic-critic-context";
import {buildCrawlCannibalizationCandidatesV1}
  from "./crawl-cannibalization-context";
import {executeMasterArticleCriticsV1,assertMasterArticleCriticExecutionPassed}
  from "./master-article-critic-fusion";
import {executeMasterArticleCriticRepairReplayV1}
  from "./master-article-critic-repair-execution";
import {executeSerpReplayV1} from "./serp-replay";
import {buildProductionFinalArticleReadinessV1}
  from "./production-final-article-readiness-adapter-v1";
import {auditArticle} from "./content-quality";
import {analyzeArticleAgainstPlan} from "./content-plan-analysis";
import {evaluateContentGate} from "./content-gate";
import {evaluateArticlePublicationPolicy} from "./article-publication-policy";
import {getBusinessFactRegistryForBrief} from "./evidence-snapshot";
import {assertStoredPublicationEvidenceV1}
  from "./stored-publication-evidence-gate-v1";
import {buildSerpReplayArticleFingerprintV1}
  from "./serp-replay-fingerprint";
import {detectPersistedArticleEditorialRepetitionV1}
  from "./editorial-repetition-guard-v1";
import {normalizeMasterArticleProseSpacesV1}
  from "./article-prose-whitespace-v1";

const active=new Set<string>();
const hash=(v:unknown)=>createHash("sha256")
  .update(typeof v==="string"?v:JSON.stringify(v),"utf8").digest("hex");
function check(value:unknown,code:string):asserts value{
  if(!value)throw new Error("SAVED_RESEARCH_RECOVERY_"+code);
}
function record(v:unknown):Record<string,unknown>{
  check(v!==null&&typeof v==="object"&&!Array.isArray(v),
    "INVALID_SNAPSHOT");
  return v as Record<string,unknown>;
}
function serializable(v:unknown):Prisma.InputJsonValue{
  return JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
}
function shape(a:{title:string;metaDescription:string;h1:string;bodyMarkdown:string}){
  return {title:a.title,metaDescription:a.metaDescription,
    h1:a.h1,bodyMarkdown:a.bodyMarkdown};
}
function parsePlanResponse(response:string):readonly ResearchExpansionProposalV1[]{
  const raw=record(JSON.parse(response));
  check(Array.isArray(raw.sections),"PLANNER_JSON_INVALID");
  return raw.sections as ResearchExpansionProposalV1[];
}
function siteDomain(url:string):string|null{
  try{return new URL(url).hostname;}catch{return null;}
}

export async function recoverExistingArticleResearchV1({
  articleId,expectedUpdatedAt,
}:{
  articleId:string;expectedUpdatedAt:string;
}){
  check(/^[a-zA-Z0-9_-]{5,100}$/.test(articleId),"ARTICLE_ID_INVALID");
  check(typeof expectedUpdatedAt==="string"&&
    Number.isFinite(Date.parse(expectedUpdatedAt)),
    "EXPECTED_VERSION_REQUIRED");
  check(!active.has(articleId),"ALREADY_RUNNING");
  active.add(articleId);
  try{
    const original=await prisma.contentArticle.findUnique({
      where:{id:articleId},
      include:{brief:{include:{website:{select:{url:true}}}}},
    });
    check(original && original.status==="IN_REVIEW" &&
      !original.publishedAt && !original.publishedUrl &&
      original.updatedAt.getTime()===Date.parse(expectedUpdatedAt),
      "ARTICLE_STATE_CHANGED");
    const siblingCount=await prisma.contentArticle.count({
      where:{briefId:original.briefId,id:{not:articleId}},
    });
    // The snapshot belongs to the Brief, not Article. Never rewrite
    // one article's shared research while other articles still use it.
    check(siblingCount===0,"SHARED_BRIEF_EVIDENCE_SNAPSHOT");
    const evidence=await prisma.contentEvidenceSnapshot.findUnique({
      where:{briefId:original.briefId},select:{plan:true},
    });
    check(evidence,"EVIDENCE_NOT_FOUND");
    const oldSnapshot=record(evidence.plan);
    const inspection=inspectMasterRuntimeSnapshot(evidence.plan);
    check(inspection.runtime && inspection.readiness==="READY",
      "STORED_RUNTIME_INVALID");
    const originalRuntime=inspection.runtime;
    const oldPlan=parsePersistedArticleExecutionPlanV1(
      oldSnapshot.articleExecutionPlan);
    const writable=oldPlan.sections.filter(s=>s.state==="WRITABLE");
    check(writable.length>0&&writable.length<=8,
      "SECTION_SCOPE_UNSUPPORTED");
    check(inspectSectionEvidenceCapacityV1(oldPlan.sections).length>0,
      "RESEARCH_DEPTH_ALREADY_SUFFICIENT");
    const priorArticle=shape(original);
    const originalEvidenceFingerprint=hash(evidence.plan);
    const savedClaims=originalRuntime.claimLedger.claims;
    const sourceDomains=[...new Set(
      originalRuntime.evidenceGraph.sources.map(s=>siteDomain(s.url))
        .filter((host):host is string=>Boolean(host))
    )].slice(0,30);
    check(sourceDomains.length>0,"SOURCE_INVENTORY_EMPTY");

    /*
     * One bounded planning inference only. No new keyword, outline,
     * question, competitor metric, market or business fact authority.
     */
    const planPrompt=[
      "Propose independently verifiable ATOMIC factual hypotheses for",
      "one existing SEO explainer whose large H2 sections contain only",
      "one broad generic fact each. These are hypotheses for research,",
      "NEVER publication facts; do not pretend any source supports them.",
      "Do not add sections, new questions, prices, statistics, product",
      "promises, legal rights, named source quotations or keyword variants.",
      "Preserve each existing heading and factual intent. Add 1-3 NEW",
      "distinct informative factual facets for EVERY writable section.",
      "GLOBAL HARD CEILING: no more than 18 proposals across ALL sections.",
      "Prefer three distinct useful claims per section when there are six.",
      "Prefer mechanism details, exceptions, real limitations, comparisons,",
      "and specific reader actions, only if reasonably source-verifiable.",
      "Avoid paraphrasing an existing claim. One factual proposition per",
      "claim. Do not bundle facts with AND, OR, lists, or invented examples.",
      "Return JSON ONLY: {\"sections\":[{\"sectionId\":\"exact id\",",
      "\"proposedClaims\":[{\"text\":\"one sentence ending period\",",
      "\"category\":\"FACT|STATISTIC|FINANCIAL|LEGAL|PRODUCT|PRICE|COMPARISON\",",
      "\"risk\":\"LOW|MEDIUM|HIGH\"}]}]}.",
      "Existing webpage title: "+original.h1,
      "Existing primary keyword: "+original.brief.primaryKeyword,
      "Existing sections: "+JSON.stringify(writable.map(section=>({
        sectionId:section.id,heading:section.heading,
        mission:section.mission,
        knownClaimTexts:section.requiredClaimIds.map(id=>
          savedClaims.find(c=>c.id===id)?.text??id),
      }))),
      "Domains already discovered (not evidence by themselves): "+
        JSON.stringify(sourceDomains),
    ].join("\n");
    const planningScope={
      articleId,briefId:original.briefId,
      updatedAt:original.updatedAt.toISOString(),
      evidenceSha256:originalEvidenceFingerprint,
    };
    const storedPlanningResponse=
      await readExistingResearchPlanningCheckpointV1(planningScope);
    if(storedPlanningResponse===null){
      await assertResearchPlanningCheckpointWritableV1(planningScope);
    }
    const rawPlan=storedPlanningResponse ??
      await callContentAiJson(planPrompt,{reasoningEffort:"low"});
    if(storedPlanningResponse===null){
      // A failure in a later strict gate must never force paying for
      // the same planning output again on the next local CLI run.
      await saveExistingResearchPlanningCheckpointV1(
        planningScope,rawPlan);
    }
    const bounded=budgetResearchExpansionProposalsV1({
      plan:oldPlan,proposals:parsePlanResponse(rawPlan),
    });
    const proposed=validateResearchExpansionProposalsV1({
      plan:oldPlan,
      existingClaimTexts:savedClaims.map(c=>c.text),
      proposals:bounded.proposals,
    });
    console.info("[content research recovery planning]",{
      resumedPaidPlan:storedPlanningResponse!==null,
      offered:bounded.offeredClaims,
      retained:bounded.retainedClaims,
      trimmedWithoutAdditionalAi:bounded.droppedClaims,
      planningModelCalls:storedPlanningResponse===null?1:0,
    });
    check(proposed.length<=18,"PLANNER_PROPOSALS_OVER_BUDGET");

    /*
     * Reuse the SAME previously discovered source inventory first.
     * Strict crawler safely fetches published pages; snippet-only
     * references have no factual authority.
     */
    let newGraph=await enrichLiveEvidenceGraphV1({
      graph:{
        sources:[...originalRuntime.evidenceGraph.sources],
        claimEvidence:[...originalRuntime.evidenceGraph.claimEvidence],
      },
      claims:proposed,
    });
    const newSupport=(id:string)=>newGraph.claimEvidence.some(e=>
      e.claimId===id&&e.kind==="VERIFIED_EXCERPT"&&
      e.relation==="SUPPORTS"&&!!e.excerpt?.trim());
    const unresolved=proposed.filter(c=>!newSupport(c.id));
    let fallbackSearches=0;
    if(unresolved.length){
      // One wave: at most one outstanding factual question from each
      // under-researched section. Avoid spending all fallback searches
      // on the first section's claims.
      const missingBySection=new Map<string,(typeof unresolved)[number]>();
      for(const claim of unresolved){
        if(!missingBySection.has(claim.sectionId))
          missingBySection.set(claim.sectionId,claim);
      }
      const probes=[...missingBySection.values()].slice(0,6);
      fallbackSearches=probes.length;
      const mission=record(oldSnapshot.searchMissionInput??{});
      const alreadySeen=new Set(newGraph.sources.map(s=>s.url));
      const fetched:Array<(typeof newGraph.sources)[number]>=[];
      for(const probe of probes){
        // One search per section, not one broad multi-claim search.
        // Reserve a place in the crawler's first-24 URL ceiling for
        // EVERY missing section instead of spending the whole budget
        // on URLs from the first query.
        // Explicit search callback works with BOTH production
        // fallback-provider signatures (old and new). At most ONE
        // provider search is made for this section's probe, regardless
        // of how many query strings the legacy fallback iterator emits.
        let searchRequestsForProbe=0;
        const search:NonNullable<
          Parameters<typeof discoverClaimEvidenceFallbackSourcesV1>[0]["search"]
        >=async input=>{
          if(searchRequestsForProbe++>=1)return {organic:[]};
          const {buildSerpIntelligence}=await import("./serp-intelligence");
          const serp=await buildSerpIntelligence({
            keyword:input.keyword,
            locationName:input.locationName,
            languageName:input.languageName,
          });
          return {organic:(serp.organic??[]) as unknown as
            readonly import("./live-evidence-verification").EvidenceFallbackOrganicResultV1[]};
        };
        const found=await discoverClaimEvidenceFallbackSourcesV1({
          claims:[probe],
          primaryQuery:original.brief.primaryKeyword,
          locationName:typeof mission.location==="string"
            ?mission.location:"United States",
          languageName:typeof mission.language==="string"
            ?mission.language:"English",
          existingUrls:[...alreadySeen],
          search,
        });
        let kept=0;
        for(const source of found){
          if(alreadySeen.has(source.url))continue;
          fetched.push(source);
          alreadySeen.add(source.url);
          if(++kept===3)break;
        }
      }
      if(fetched.length){
        newGraph=await enrichLiveEvidenceGraphV1({
          graph:{
            // At most 18 fetched URLs first, then the full old 62
            // source inventory for durable provenance.
            sources:[...fetched,...newGraph.sources],
            claimEvidence:[...newGraph.claimEvidence],
          },
          claims:proposed,
        });
      }
    }

    /*
     * This review also REASSESSES the old 14 lexical matches. An
     * unsupported old claim is not automatically inherited forever.
     */
    const semanticReview=await reviewAndConstrainVerifiedEvidenceV1({
      claims:[...savedClaims,...proposed],
      graph:newGraph,
    });
    const graphAfterReview=semanticReview.graph;
    const verifiedIds=new Set(graphAfterReview.claimEvidence.filter(e=>
      e.kind==="VERIFIED_EXCERPT"&&e.relation==="SUPPORTS"&&
      !!e.excerpt?.trim()).map(e=>e.claimId));
    const newSupported=proposed.filter(c=>verifiedIds.has(c.id));
    check(newSupported.length>=writable.length,
      "INSUFFICIENT_NEW_VERIFIED_CLAIMS");
    const scopedSections=oldPlan.sections.map(section=>{
      const originalIds=section.requiredClaimIds.filter(id=>
        verifiedIds.has(id));
      const added=newSupported.filter(c=>c.sectionId===section.id)
        .map(c=>c.id);
      const claims=[...new Set([...originalIds,...added])];
      const evidenceIds=[...new Set(graphAfterReview.claimEvidence
        .filter(e=>claims.includes(e.claimId)&&
          e.kind==="VERIFIED_EXCERPT"&&e.relation==="SUPPORTS")
        .map(e=>e.id))];
      if(section.state==="WRITABLE"){
        check(added.length>=1 && claims.length>=2,
          "SECTION_INFORMATION_GAIN_STILL_INSUFFICIENT:"+section.id);
        check(evidenceIds.length>=2,
          "SECTION_VERIFIED_EVIDENCE_STILL_SHALLOW:"+section.id);
      }
      return {...section,requiredClaimIds:claims,evidenceIds};
    });
    check(new Set(scopedSections.flatMap(s=>s.requiredClaimIds)).size===
      scopedSections.reduce((sum,s)=>sum+s.requiredClaimIds.length,0),
      "DUPLICATE_CLAIM_SECTION_OWNERSHIP");

    const usedIds=new Set(scopedSections.flatMap(s=>s.requiredClaimIds));
    const keptClaims:ClaimInput[]=[
      ...savedClaims.filter(c=>usedIds.has(c.id)),
      ...newSupported.filter(c=>usedIds.has(c.id)),
    ].map(c=>({
      id:c.id,text:c.text,category:c.category,risk:c.risk,
      ...("jurisdiction" in c && typeof c.jurisdiction==="string"
        ? {jurisdiction:c.jurisdiction}:{}),
    }));
    const graph=buildEvidenceGraph({
      sources:[...graphAfterReview.sources],
      claimEvidence:graphAfterReview.claimEvidence.filter(e=>
        usedIds.has(e.claimId)),
    });
    const ledger=buildClaimLedger({
      claims:keptClaims,graph,asOf:new Date(),
    });
    check(ledger.claims.filter(c=>usedIds.has(c.id))
      .every(c=>c.status==="VERIFIED"),
      "SEMANTIC_EVIDENCE_NOT_VERIFIED");

    const blueprints=buildSectionBlueprintSet({
      blueprint:originalRuntime.searchBlueprint,
      queryGraph:originalRuntime.queryGraph,
      claimLedger:ledger,
      evidenceGraph:graph,
      originalValue:originalRuntime.originalValue,
      sections:originalRuntime.sectionBlueprints.sections.map((b,index)=>({
        ...b,
        requiredClaims:scopedSections[index]?.requiredClaimIds??[],
        evidenceIds:scopedSections[index]?.evidenceIds??[],
        queryNodeIds:[...b.queryNodeIds],
        forbiddenClaims:[...b.forbiddenClaims].filter(id=>
          ledger.claims.some(c=>c.id===id)),
        internalLinks:[...b.internalLinks],
      })),
    });
    const rebuiltBasePlan=buildArticleExecutionPlanV1({
      websiteId:oldPlan.websiteId,
      topic:oldPlan.topic,
      primaryQuery:oldPlan.primaryQuery,
      intent:oldPlan.intent,
      pageType:oldPlan.pageType,
      riskClass:oldPlan.riskClass,
      pageAction:oldPlan.pageAction,
      requiredTopics:oldPlan.requiredTopics,
      requiredQuestions:oldPlan.requiredQuestions,
      requiredEntities:oldPlan.requiredEntities,
      verifiedEvidenceIds:graph.claimEvidence.filter(e=>
        e.kind==="VERIFIED_EXCERPT"&&e.relation==="SUPPORTS")
        .map(e=>e.id),
      sections:scopedSections,
    });
    const newPlan={
      ...rebuiltBasePlan,
      ...(oldPlan.mediaRequirements
        ? {mediaRequirements:oldPlan.mediaRequirements}:{}),
    };
    check(inspectSectionEvidenceCapacityV1(newPlan.sections).length===0,
      "POST_RESEARCH_INFORMATION_GAIN_FAILED");
    const newRuntime={
      ...originalRuntime,evidenceGraph:graph,claimLedger:ledger,
      sectionBlueprints:blueprints,
    };
    const revisedSnapshot={
      ...oldSnapshot,
      masterRuntime:newRuntime,
      articleExecutionPlan:newPlan,
      researchRecovery:{
        version:"EXISTING_ARTICLE_RESEARCH_RECOVERY_V1",
        previousSnapshotSha256:originalEvidenceFingerprint,
        newClaims:newSupported.map(c=>c.id),
        semanticReviewedPairs:semanticReview.reviewedPairs,
        semanticApprovedPairs:semanticReview.approvedPairs,
      },
    };
    const checked=inspectMasterRuntimeSnapshot(revisedSnapshot);
    check(checked.runtime&&checked.readiness==="READY",
      "REBUILT_RUNTIME_NOT_READY");
    assertStoredPublicationEvidenceV1(revisedSnapshot);
    const contract=bindArticleExecutionPlanToGenerationContractV1({
      plan:newPlan,
      contract:buildArticleGenerationContractV1(checked.runtime),
    });

    /*
     * All six old sections suffered from the same one-fact planner
     * defect; rebuilding all six is warranted. This occurs entirely
     * in memory and DOES NOT allocate a new ContentArticle row.
     */
    const budget=createContentRunBudgetV1({
      maxModelCalls:30,maxEstimatedInputTokens:125000,
      maxRepairCalls:8,
    });
    const generator=withContentRunBudgetV1({
      generator:geminiGenerator,budget,
    });
    const writer=await executeMasterWriterV1({contract,generator});
    const storedContext=buildMasterArticleSemanticCriticContextV1(
      checked.runtime);
    const crawl=storedContext.cannibalizationCandidates.length
      ?[]:await buildCrawlCannibalizationCandidatesV1({
        websiteId:original.brief.websiteId,
      });
    const context={
      ...storedContext,
      rankReadyKeywords:[
        original.brief.primaryKeyword,...original.brief.secondaryKeywords,
      ],
      cannibalizationCandidates:storedContext.cannibalizationCandidates.length
        ?storedContext.cannibalizationCandidates:crawl,
    };
    const firstCritics=await executeMasterArticleCriticsV1({
      contract,run:writer,generator,context,
    });
    const repaired=await executeMasterArticleCriticRepairReplayV1({
      contract,run:writer,initialCritics:firstCritics,generator,context,
    });
    assertMasterArticleCriticExecutionPassed(repaired.finalCritics);
    check(repaired.finalCritics.suite.status!=="BLOCK",
      "FINAL_SEMANTIC_CRITICS_BLOCKED");
    const candidate=shape(repaired.run.article);
    check(candidate.bodyMarkdown.trim().length>0 &&
      normalizeMasterArticleProseSpacesV1(candidate.bodyMarkdown)===
        candidate.bodyMarkdown &&
      detectPersistedArticleEditorialRepetitionV1(
        candidate.bodyMarkdown).length===0,
      "EDITORIAL_REPETITION_NOT_FIXED");
    const audit=auditArticle({
      article:candidate,
      primaryKeyword:original.brief.primaryKeyword,
    });
    const intelligence=analyzeArticleAgainstPlan({
      ...candidate,plan:revisedSnapshot,
      primaryKeyword:original.brief.primaryKeyword,
      secondaryKeywords:original.brief.secondaryKeywords,
    });
    const priorIntelligence=analyzeArticleAgainstPlan({
      ...priorArticle,plan:oldSnapshot,
      primaryKeyword:original.brief.primaryKeyword,
      secondaryKeywords:original.brief.secondaryKeywords,
    });
    check(
      intelligence.article.keywordCoverage.used>=
        priorIntelligence.article.keywordCoverage.used &&
      intelligence.article.keywordCoverage.missing<=
        priorIntelligence.article.keywordCoverage.missing,
      "KEYWORD_COVERAGE_REGRESSED"
    );
    const previousAudit=auditArticle({
      article:priorArticle,
      primaryKeyword:original.brief.primaryKeyword,
    });
    check(audit.h2Count===previousAudit.h2Count &&
      audit.h3Count===previousAudit.h3Count,
      "HEADING_STRUCTURE_DRIFT");

    const registry=await getBusinessFactRegistryForBrief({
      briefId:original.briefId,websiteId:original.brief.websiteId,
    });
    const content=evaluateContentGate({
      article:candidate,primaryKeyword:original.brief.primaryKeyword,
      audit,registry,
    });
    const policy=evaluateArticlePublicationPolicy({
      article:candidate,intelligence,
    });
    check(content.pass&&policy.pass,
      "FINAL_CONTENT_OR_PUBLICATION_POLICY_BLOCKED");
    const replay=await executeSerpReplayV1({
      runtime:checked.runtime,run:repaired.run,generator,
      siteDomain:siteDomain(original.brief.website.url),
    });
    check((replay.status==="READY"||replay.status==="WARN")&&
      replay.blockers.length===0&&
      replay.serpSnapshotFingerprint!==null&&
      replay.serpCapturedAt!==null&&
      replay.comparisons.length>0,
      "SERP_REPLAY_FAILED");
    const readiness=buildProductionFinalArticleReadinessV1({
      plan:newPlan,writerRun:repaired.run,
      finalCritics:repaired.finalCritics,
      articleBodyMarkdown:candidate.bodyMarkdown,
      contentGatePass:content.pass,publicationPolicyPass:policy.pass,
      serpReplay:replay,serpReplayWarning:null,
    });
    check(readiness.status==="PASS"||readiness.status==="WARN",
      "FINAL_READINESS_BLOCKED");

    const priorReplay=await prisma.serpReplayArtifact.findFirst({
      where:{contentArticleId:articleId},
      orderBy:[{createdAt:"desc"},{id:"desc"}],
    });
    const fingerprint=buildSerpReplayArticleFingerprintV1(candidate);
    check(fingerprint!==buildSerpReplayArticleFingerprintV1(priorArticle),
      "RESEARCH_RECOVERY_NO_ARTICLE_CHANGE");

    const artifactId=await prisma.$transaction(async tx=>{
      const [live,latestEvidence,latestReplay]=await Promise.all([
        tx.contentArticle.findUnique({where:{id:articleId}}),
        tx.contentEvidenceSnapshot.findUnique({
          where:{briefId:original.briefId},select:{plan:true},
        }),
        tx.serpReplayArtifact.findFirst({
          where:{contentArticleId:articleId},
          orderBy:[{createdAt:"desc"},{id:"desc"}],
        }),
      ]);
      const otherArticles=await tx.contentArticle.count({
        where:{briefId:original.briefId,id:{not:articleId}},
      });
      check(otherArticles===0,"SHARED_BRIEF_EVIDENCE_SNAPSHOT");
      check(live&&live.status==="IN_REVIEW"&&
        live.updatedAt.getTime()===original.updatedAt.getTime() &&
        JSON.stringify(shape(live))===JSON.stringify(priorArticle)&&
        latestEvidence&&hash(latestEvidence.plan)===
          originalEvidenceFingerprint&&
        (latestReplay?.id??null)===(priorReplay?.id??null),
        "CONCURRENT_CHANGE_DETECTED");
      const cas=await tx.contentArticle.updateMany({
        where:{id:articleId,briefId:original.briefId,
          status:"IN_REVIEW",updatedAt:original.updatedAt},
        data:{
          title:candidate.title,metaDescription:candidate.metaDescription,
          h1:candidate.h1,bodyMarkdown:candidate.bodyMarkdown,
          publishError:null,
        },
      });
      check(cas.count===1,"ARTICLE_CAS_FAILED");
      await tx.contentEvidenceSnapshot.update({
        where:{briefId:original.briefId},
        data:{plan:serializable(revisedSnapshot)},
      });
      const saved=await tx.serpReplayArtifact.create({
        data:{
          contentArticleId:articleId,
          artifactVersion:"SERP_REPLAY_ARTIFACT_V1",
          replayVersion:"SERP_REPLAY_V1",
          executionStatus:"SUCCEEDED",
          replayStatus:replay.status,
          articleFingerprint:fingerprint,
          articleFingerprintAlgo:"SHA256_V1",
          keyword:replay.keyword,
          serpSnapshotFingerprint:replay.serpSnapshotFingerprint,
          serpCapturedAt:replay.serpCapturedAt,
          comparisons:serializable(replay.comparisons),
          blockers:serializable(replay.blockers),
          warnings:serializable(replay.warnings),
          provenance:serializable({
            ...replay.provenance,
            researchRecovery:{
              version:"EXISTING_ARTICLE_RESEARCH_RECOVERY_V1",
              originalArticle:priorArticle,
              originalArticleUpdatedAt:original.updatedAt.toISOString(),
              originalEvidenceSnapshot:oldSnapshot,
              originalReplayArtifactId:priorReplay?.id??null,
              oldEvidenceHash:originalEvidenceFingerprint,
              updatedEvidenceHash:hash(revisedSnapshot),
              newVerifiedClaimIds:newSupported.map(c=>c.id),
              fallbackSearches,
              sourceCount:graph.sources.length,
              semanticReview:{
                reviewed:semanticReview.reviewedPairs,
                approved:semanticReview.approvedPairs,
                demoted:semanticReview.demotedEvidenceIds,
              },
              finalCriticStatus:repaired.finalCritics.suite.status,
              finalReadinessStatus:readiness.status,
              budget:budget.snapshot(),
            },
          }),
          errorMessage:null,
        },
      });
      return saved.id;
    },{
      isolationLevel:Prisma.TransactionIsolationLevel.Serializable,
      maxWait:10000,timeout:30000,
    });

    return {
      articleId,status:"IN_REVIEW" as const,
      result:"SAME_ARTICLE_RESEARCH_RECOVERY_COMMITTED" as const,
      previousEvidenceHash:originalEvidenceFingerprint,
      currentEvidenceHash:hash(revisedSnapshot),
      addedVerifiedClaimCount:newSupported.length,
      verifiedClaimCount:ledger.verified,
      semanticReviewedExcerpts:semanticReview.reviewedPairs,
      semanticApprovedExcerpts:semanticReview.approvedPairs,
      sourceCount:graph.sources.length,
      fallbackSearches,
      writerBudget:budget.snapshot(),
      plannerCalls:1,
      semanticReviewCalls:semanticReview.calls,
      replayArtifactId:artifactId,
      replayStatus:replay.status,
      criticStatus:repaired.finalCritics.suite.status,
      readinessStatus:readiness.status,
      readerWords:audit.wordCount,
      newFingerprint:fingerprint,
    };
  }finally{
    active.delete(articleId);
  }
}
