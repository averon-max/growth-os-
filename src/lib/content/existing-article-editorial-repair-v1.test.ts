import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
import fixture from "./__fixtures__/repetitive-credit-monitoring-reader-v1.json";
import {detectHighConfidenceEditorialRepetitionV1} from "./editorial-repetition-guard-v1";
import {normalizeMasterArticleProseSpacesV1} from "./article-prose-whitespace-v1";

const service=readFileSync(
  new URL("./existing-article-editorial-repair-v1.ts",import.meta.url),"utf8");
const endpoint=readFileSync(
  new URL("../../app/api/content/articles/[id]/repair-editorial/route.ts",
    import.meta.url),"utf8");
const workspace=readFileSync(
  new URL("../../components/dashboard/article-workspace.tsx",
    import.meta.url),"utf8");

describe("saved article editorial recovery production closure",()=>{
  it("detects the real low-value article even when keywords and technical audit passed",()=>{
    const findings=detectHighConfidenceEditorialRepetitionV1(fixture.sections);
    expect(findings).toHaveLength(1);
    expect(findings[0].affectedSections.length).toBeGreaterThan(2);
  });

  it("reuses saved verified material rather than creating new brief or Writer run",()=>{
    expect(service).toContain("POST_FINAL_REPLAY.json");
    expect(service).toContain("assertStoredPublicationEvidenceV1(snap.plan)");
    expect(service).toContain("buildArticleGenerationContractV1(runtime)");
    expect(service).toContain("executeMasterArticleCriticRepairReplayV1");
    expect(service).not.toContain("generateArticleFromBrief");
    expect(service).not.toContain("createContentBrief");
  });

  it("caps paid provider requests and limits model repairs",()=>{
    expect(service).toContain("maxModelCalls:10");
    expect(service).toContain("maxRepairCalls:1");
    expect(service).toContain("withContentRunBudgetV1");
    expect(service).toContain("SAVED_EDITORIAL_BOUNDED_REPAIR_FAILED");
  });

  it("revalidates real full critics, content gates and SERP on the changed version",()=>{
    const first=service.indexOf("executeMasterArticleCriticsV1({");
    const second=service.indexOf("executeMasterArticleCriticRepairReplayV1({");
    const third=service.indexOf("executeSerpReplayV1({");
    const fourth=service.indexOf("prisma.$transaction(async tx=>");
    expect(first).toBeGreaterThan(-1);
    expect(second).toBeGreaterThan(first);
    expect(third).toBeGreaterThan(second);
    expect(fourth).toBeGreaterThan(third);
    expect(service).toContain("buildProductionFinalArticleReadinessV1");
    expect(service).toContain("assertMasterArticleCriticExecutionPassed");
  });

  it("does not silently edit, publish, or accept stale article versions",()=>{
    expect(service).toContain("expectedUpdatedAt");
    expect(service).toContain("actual.updatedAt.getTime()===original.updatedAt.getTime()");
    expect(service).toContain("SAVED_EDITORIAL_CONCURRENT_ARTICLE_OR_EVIDENCE_CHANGE");
    expect(service).toContain("TransactionIsolationLevel.Serializable");
    expect(service).toContain("previousArticle:initial");
    expect(service).toContain("replayArtifactId:committed");
    expect(service).not.toContain('status:"PUBLISHED"');
  });

  it("requires authenticated explicit paid consent from a direct user action",()=>{
    expect(endpoint).toContain("requireWebsiteAccess(user.id,article.brief.websiteId)");
    expect(endpoint).toContain("authorizeBoundedPaidRepair!==true");
    expect(workspace).toContain("window.confirm(");
    expect(workspace).toContain('expectedUpdatedAt:article.updatedAt');
    expect(workspace).toContain("Repair article");
  });

  it("normalizes old checkpoint whitespace without accepting changed content",()=>{
    const original="Monitoring   alerts can help you check a report.";
    const expected=normalizeMasterArticleProseSpacesV1(original);
    expect(expected).not.toEqual(original);
    expect(expected).toEqual("Monitoring alerts can help you check a report.");
    expect(service).toContain(
      "normalizeMasterArticleProseSpacesV1(fromCheckpoint.bodyMarkdown)");
  });
});
