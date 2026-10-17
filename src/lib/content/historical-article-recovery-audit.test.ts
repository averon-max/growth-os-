import { it, expect } from "vitest";
import { prisma } from "../prisma";
import { readFileSync, existsSync } from "node:fs";
import {
  inspectMasterRuntimeSnapshot,
} from "./master-runtime-adapter";
import {
  buildArticleGenerationContractV1,
} from "./article-generation-contract";
import {
  parsePersistedArticleExecutionPlanV1,
  bindArticleExecutionPlanToGenerationContractV1,
} from "./article-execution-plan-binding-v1";

const ARTICLE_ID = "cmv1hjtyv06s7oaql3hgxdkxz";

it("audits historical article recovery from real persisted evidence", async () => {
  const article = await prisma.contentArticle.findUnique({
    where: { id: ARTICLE_ID },
    include: {
      brief: {
        include: { evidenceSnapshot: true },
      },
    },
  });

  expect(article).not.toBeNull();
  if (!article) return;

  const stored = article.brief.evidenceSnapshot?.plan;

  if (!stored || typeof stored !== "object" ||
      Array.isArray(stored)) {
    throw new Error("HISTORICAL_SNAPSHOT_MISSING");
  }

  const plan = stored as Record<string, unknown>;
  const inspection = inspectMasterRuntimeSnapshot(plan);

  if (!inspection.runtime || inspection.readiness !== "READY") {
    throw new Error(
      `HISTORICAL_RUNTIME_INVALID:${inspection.blockers.join(",")}`
    );
  }

  const executionPlan =
    parsePersistedArticleExecutionPlanV1(
      plan.articleExecutionPlan
    );

  const contract =
    bindArticleExecutionPlanToGenerationContractV1({
      plan: executionPlan,
      contract: buildArticleGenerationContractV1(
        inspection.runtime
      ),
    });

  const candidatePath =
    ".growth-os-tmp/article-recovery/repaired-article.md";

  expect(existsSync(candidatePath)).toBe(true);

  const candidate = readFileSync(candidatePath, "utf8");

  const keywords = [
    article.brief.primaryKeyword,
    ...article.brief.secondaryKeywords,
  ];

  const prose = candidate
    .split(/\r?\n/)
    .filter(line => !/^#{1,6}\s+/.test(line.trim()))
    .join("\n")
    .toLowerCase();

  const missingKeywords = keywords.filter(
    keyword => !prose.includes(keyword.toLowerCase())
  );

  const runtime = inspection.runtime;

  const report = {
    articleId: article.id,
    status: article.status,
    contractVersion: contract.version,
    contractSections: contract.sectionContracts.length,
    evidenceSources: runtime.evidenceGraph.sources.length,
    claimEvidenceLinks: runtime.evidenceGraph.claimEvidence.length,
    ledgerClaims: runtime.claimLedger.claims.length,
    verifiedClaims: runtime.claimLedger.claims.filter(
      claim => claim.status === "VERIFIED"
    ).length,
    missingKeywords,
    candidateWords: candidate.trim().split(/\s+/).length,
    historicalWriterRunAvailable: false,
    fullSemanticReplayPerformed: false,
    finalReadinessAuthorized: false,
    databaseModified: false,
  };

  console.log("=== REAL HISTORICAL RECOVERY AUTHORITY ===");
  console.log(JSON.stringify(report, null, 2));

  expect(report.contractSections).toBeGreaterThan(0);
  expect(report.evidenceSources).toBeGreaterThan(0);
  expect(report.ledgerClaims).toBeGreaterThan(0);
  expect(missingKeywords).toEqual([]);
}, 15000);
