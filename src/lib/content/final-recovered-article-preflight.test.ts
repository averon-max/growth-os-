import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { prisma } from "../prisma";
import { inspectMasterRuntimeSnapshot } from "./master-runtime-adapter";
import { buildArticleGenerationContractV1 } from "./article-generation-contract";
import {
  bindArticleExecutionPlanToGenerationContractV1,
  parsePersistedArticleExecutionPlanV1,
} from "./article-execution-plan-binding-v1";
import { assertStoredPublicationEvidenceV1 } from "./stored-publication-evidence-gate-v1";
import { runDeterministicCoverageCriticV1 } from "./master-article-deterministic-critics";
import type { MasterWriterRunV1 } from "./master-writer-orchestrator";

it("validates recovered article without changing database", async () => {
  const article = await prisma.contentArticle.findUnique({
    where: { id: "cmv1hjtyv06s7oaql3hgxdkxz" },
    include: { brief: { include: { evidenceSnapshot: true } } },
  });

  expect(article).not.toBeNull();
  if (!article) return;

  const stored = article.brief.evidenceSnapshot?.plan;

  if (
    !stored ||
    typeof stored !== "object" ||
    Array.isArray(stored)
  ) {
    throw new Error("PERSISTED_PLAN_MISSING_OR_INVALID");
  }

  const plan = structuredClone(stored) as Record<string, any>;
  const runtime = plan.masterRuntime;
  const badId = "claim-score-impact";
  const goodId = "claim-alerts";

  const goodClaim = runtime.claimLedger.claims.find(
    (claim: any) => claim.id === goodId
  );
  expect(goodClaim?.status).toBe("VERIFIED");

  const goodEvidenceId = goodClaim.evidenceIds[0];

  runtime.claimLedger.claims = runtime.claimLedger.claims.filter(
    (claim: any) => claim.id !== badId
  );
  runtime.evidenceGraph.claimEvidence =
    runtime.evidenceGraph.claimEvidence.filter(
      (e: any) => e.claimId !== badId
    );

  const blueprint = runtime.sectionBlueprints.sections[2];
  const execution = plan.articleExecutionPlan.sections[2];

  blueprint.requiredClaims = [goodId];
  blueprint.evidenceIds = [goodEvidenceId];
  execution.requiredClaimIds = [goodId];
  execution.evidenceIds = [goodEvidenceId];

  assertStoredPublicationEvidenceV1(plan);

  const inspection = inspectMasterRuntimeSnapshot(plan);
  expect(inspection.readiness).toBe("READY");
  expect(inspection.runtime).toBeTruthy();

  const executionPlan = parsePersistedArticleExecutionPlanV1(
    plan.articleExecutionPlan
  );

  const contract = bindArticleExecutionPlanToGenerationContractV1({
    plan: executionPlan,
    contract: buildArticleGenerationContractV1(inspection.runtime!),
  });

  const body = readFileSync(
    ".growth-os-tmp/article-recovery/credit-monitoring-safe-candidate.md",
    "utf8"
  );

  expect(body).not.toContain(
    "Using a credit-monitoring service does not itself change"
  );

  const keywords = [
    article.brief.primaryKeyword,
    ...article.brief.secondaryKeywords,
  ];

  const run = {
    article: { bodyMarkdown: body },
    sections: contract.sectionContracts.map(section => ({
      coveredQueryNodeIds: section.blueprint.queryNodeIds ?? [],
    })),
  } as unknown as MasterWriterRunV1;

  const findings = runDeterministicCoverageCriticV1({
    contract,
    run,
    rankReadyKeywords: keywords,
  }).findings;

  const keywordBlockers = findings.filter(
    finding => finding.code === "RANK_READY_PLANNED_KEYWORD_MISSING"
  );

  console.log("=== RECOVERED ARTICLE PREFLIGHT ===");
  console.log(JSON.stringify({
    articleId: article.id,
    runtime: inspection.readiness,
    sections: contract.sectionContracts.length,
    words: body.trim().split(/\s+/).length,
    keywords,
    keywordBlockers,
    allFindings: findings,
    databaseModified: false,
  }, null, 2));

  expect(keywordBlockers).toHaveLength(0);
  expect(contract.sectionContracts.length).toBe(4);
}, 15000);
