import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
const read=(path:string)=>readFileSync(new URL(path,import.meta.url),"utf8");
const engine=read("./existing-article-research-recovery-v1.ts");
const endpoint=read("../../app/api/content/articles/[id]/recover-research/route.ts");
const ui=read("../../components/dashboard/article-workspace.tsx");

describe("real research recovery is one CAS-safe existing article lifecycle",()=>{
  it("reuses the actual saved article and brief, never inserting either",()=>{
    expect(engine).toContain('where:{id:articleId}');
    expect(engine).toContain("prisma.contentEvidenceSnapshot.findUnique");
    expect(engine).not.toContain("prisma.contentArticle.create");
    expect(engine).not.toContain("prisma.contentBrief.create");
    expect(engine).not.toContain("generateArticleFromBrief");
  });
  it("refuses rewriting a research snapshot shared with sibling articles",()=>{
    expect(engine).toContain('"SHARED_BRIEF_EVIDENCE_SNAPSHOT"');
    expect(engine).toContain("tx.contentArticle.count");
  });
  it("only conducts new research for missing facts, strictly verifying and reviewing support",()=>{
    const planning=engine.indexOf("callContentAiJson(planPrompt");
    const extraction=engine.indexOf("enrichLiveEvidenceGraphV1({");
    const fallback=engine.indexOf("discoverClaimEvidenceFallbackSourcesV1({");
    const semantic=engine.indexOf("reviewAndConstrainVerifiedEvidenceV1({");
    expect(planning).toBeGreaterThan(0);
    expect(extraction).toBeGreaterThan(planning);
    expect(fallback).toBeGreaterThan(extraction);
    expect(semantic).toBeGreaterThan(fallback);
    expect(engine).toContain("searchRequestsForProbe++>=1");
    expect(engine).toContain("search,");
    expect(engine).toContain("missingBySection.values()].slice(0,6)");
  });
  it("recreates locked section, evidence and writer authority from verified atomic facts",()=>{
    expect(engine).toContain("buildEvidenceGraph({");
    expect(engine).toContain("buildClaimLedger({");
    expect(engine).toContain("buildSectionBlueprintSet({");
    expect(engine).toContain("buildArticleExecutionPlanV1({");
    expect(engine).toContain("bindArticleExecutionPlanToGenerationContractV1({");
    expect(engine).toContain("assertStoredPublicationEvidenceV1(revisedSnapshot)");
    expect(engine).toContain("inspectSectionEvidenceCapacityV1(newPlan.sections)");
  });
  it("uses full Writer, all Master Critics, one section repair and actual SERP Replay",()=>{
    const writer=engine.indexOf("executeMasterWriterV1({");
    const critics=engine.indexOf("executeMasterArticleCriticsV1({");
    const repair=engine.indexOf("executeMasterArticleCriticRepairReplayV1({");
    const serp=engine.indexOf("executeSerpReplayV1({");
    const commit=engine.indexOf("prisma.$transaction(async tx=>");
    expect(writer).toBeGreaterThan(0);
    expect(critics).toBeGreaterThan(writer);
    expect(repair).toBeGreaterThan(critics);
    expect(serp).toBeGreaterThan(repair);
    expect(commit).toBeGreaterThan(serp);
    expect(engine).toContain("buildProductionFinalArticleReadinessV1({");
  });
  it("commits article, plan and append-only replay in same serializable transaction",()=>{
    expect(engine).toContain("TransactionIsolationLevel.Serializable");
    expect(engine).toContain("tx.contentArticle.updateMany({");
    expect(engine).toContain("tx.contentEvidenceSnapshot.update({");
    expect(engine).toContain("tx.serpReplayArtifact.create({");
    expect(engine).toContain("originalEvidenceSnapshot:oldSnapshot");
    expect(engine).toContain("originalArticle:priorArticle");
    expect(engine).not.toContain('status:"PUBLISHED"');
  });
  it("requires explicit paid authorization and exact article version",()=>{
    expect(endpoint).toContain("requireWebsiteAccess(user.id,article.brief.websiteId)");
    expect(endpoint).toContain("authorizePaidResearchRecovery!==true");
    expect(ui).toContain('expectedUpdatedAt:article.updatedAt');
    expect(ui).toContain("window.confirm(");
    expect(ui).toContain("Recover research");
  });
  it("reuses a paid planning response and contracts overcomplete claims before validating",()=>{
    const read=engine.indexOf("readExistingResearchPlanningCheckpointV1(planningScope)");
    const model=engine.indexOf("callContentAiJson(planPrompt");
    const write=engine.indexOf("saveExistingResearchPlanningCheckpointV1(");
    const budget=engine.indexOf("budgetResearchExpansionProposalsV1({");
    const validate=engine.indexOf("validateResearchExpansionProposalsV1({");
    expect(read).toBeGreaterThan(0);
    expect(model).toBeGreaterThan(read);
    expect(write).toBeGreaterThan(model);
    expect(budget).toBeGreaterThan(write);
    expect(validate).toBeGreaterThan(budget);
    expect(engine).toContain("assertResearchPlanningCheckpointWritableV1(planningScope)");
    expect(engine).toContain("resumedPaidPlan:storedPlanningResponse!==null");
  });

  it("validates canonical DataForSEO location and language before paid planning",()=>{
    const market=engine.indexOf("resolveResearchRecoverySerpMarketV1({");
    const planning=engine.indexOf("callContentAiJson(planPrompt");
    const provider=engine.indexOf("buildSerpIntelligence({");
    expect(market).toBeGreaterThan(0);
    expect(market).toBeLessThan(planning);
    expect(provider).toBeGreaterThan(planning);
    expect(engine).toContain("languageName:searchMarket.languageName");
    expect(engine).toContain("locationName:searchMarket.locationName");
    expect(engine).toContain("DATAFORSEO_MARKET_REJECTED");
    expect(engine).toContain("DATAFORSEO_SEARCH_FAILED");
    expect(engine).not.toContain('languageName:typeof mission.language==="string"');
  });

  it("blocks paid semantic review if any section has no strict verified factual quote",()=>{
    const strict=engine.indexOf("SOURCE_GROUNDING_BEFORE_PAID_SEMANTIC_REVIEW_V1");
    const scope=engine.indexOf("strictBySection.every(section=>section.lexicallyVerified>=1)");
    const semantic=engine.indexOf("reviewAndConstrainVerifiedEvidenceV1({");
    expect(strict).toBeGreaterThan(0);
    expect(scope).toBeGreaterThan(strict);
    expect(semantic).toBeGreaterThan(scope);
    expect(engine).toContain("MISSING_STRICT_CLAIM_EVIDENCE_IN_SECTIONS:");
    expect(engine).toContain("strictMatchesFromOriginalSources");
    expect(engine).toContain("strictMatchesAfterDiscovery");
  });

  it("limits multiple model stages before provider calls",()=>{
    expect(engine).toContain("maxModelCalls:30");
    expect(engine).toContain("maxEstimatedInputTokens:125000");
    expect(engine).toContain("maxRepairCalls:8");
    expect(engine).toContain("reasoningEffort:\"low\"");
  });
});
