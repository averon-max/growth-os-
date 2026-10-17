import {
  runDeterministicCoverageCriticV1,
} from "./master-article-deterministic-critics";
import { readFileSync } from "node:fs";
import type { MasterWriterRunV1 } from "./master-writer-orchestrator";
import { it, expect } from "vitest";
import { prisma } from "../prisma";
import {
  inspectMasterRuntimeSnapshot,
} from "./master-runtime-adapter";
import {
  buildArticleGenerationContractV1,
} from "./article-generation-contract";
import {
  bindArticleExecutionPlanToGenerationContractV1,
  parsePersistedArticleExecutionPlanV1,
} from "./article-execution-plan-binding-v1";

it("reconstructs the real persisted article contract", async () => {
  const article = await prisma.contentArticle.findUnique({
    where: {
      id: "cmv1hjtyv06s7oaql3hgxdkxz",
    },
    include: {
      brief: {
        include: {
          evidenceSnapshot: true,
        },
      },
    },
  });

  expect(article).not.toBeNull();
  expect(article?.brief.evidenceSnapshot).not.toBeNull();

  const stored = article?.brief.evidenceSnapshot?.plan;

  if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
    throw new Error("PERSISTED_PLAN_MISSING");
  }

  const plan = stored as Record<string, unknown>;

  const inspection = inspectMasterRuntimeSnapshot(
    plan
  );

  if (!inspection.runtime || inspection.readiness !== "READY") {
    console.log("RUNTIME_BLOCKERS:", inspection.blockers);
    throw new Error("MASTER_RUNTIME_NOT_READY");
  }

  const executionPlan =
    parsePersistedArticleExecutionPlanV1(
      plan.articleExecutionPlan
    );

  const baseContract =
    buildArticleGenerationContractV1(
      inspection.runtime
    );

  const contract =
    bindArticleExecutionPlanToGenerationContractV1({
      plan: executionPlan,
      contract: baseContract,
    });

  console.log("=== REAL CONTRACT RECONSTRUCTION ===");
  console.log(JSON.stringify({
    articleId: article?.id,
    runtimeReadiness: inspection.readiness,
    contractVersion: contract.version,
    sectionCount: contract.sectionContracts.length,
    plannedKeywordCount:
      1 + (article?.brief.secondaryKeywords.length ?? 0),
    sectionHeadings: contract.sectionContracts.map(
      section => section.blueprint.heading
    ),
    databaseModified: false,
  }, null, 2));


  // REAL_SAVED_KEYWORD_CRITIC_REPLAY
  const fsRoot = ".growth-os-tmp/article-recovery";

  const original = readFileSync(
    `${fsRoot}/original-article.md`, "utf8"
  );
  const repaired = readFileSync(
    `${fsRoot}/repaired-article.md`, "utf8"
  );

  const keywords = [
    article!.brief.primaryKeyword,
    ...article!.brief.secondaryKeywords,
  ];

  const makeRun = (bodyMarkdown: string) => ({
    article: { bodyMarkdown },
    sections: contract.sectionContracts.map(section => ({
      coveredQueryNodeIds:
        section.blueprint.queryNodeIds ?? [],
    })),
  } as unknown as MasterWriterRunV1);

  const report = (name: string, markdown: string) => {
    const result = runDeterministicCoverageCriticV1({
      contract,
      run: makeRun(markdown),
      rankReadyKeywords: keywords,
    });

    const keywordFindings = result.findings.filter(
      finding =>
        finding.code === "RANK_READY_PLANNED_KEYWORD_MISSING"
    );

    console.log(name, JSON.stringify({
      keywordBlockCount: keywordFindings.length,
      keywordCodes: keywordFindings.map(f => f.code),
    }));

    return keywordFindings.length;
  };


  console.log("=== EXACT KEYWORD COUNTS ===");
  for (const keyword of keywords) {
    const count = (body: string) =>
      body.toLowerCase().split(keyword.toLowerCase()).length - 1;
    console.log(JSON.stringify({
      keyword,
      original: count(original),
      repaired: count(repaired),
    }));
  }

  const originalMissing = report("ORIGINAL", original);
  const repairedMissing = report("REPAIRED", repaired);

  expect(originalMissing).toBe(0);
  expect(repairedMissing).toBe(0);

  expect(contract.sectionContracts.length).toBeGreaterThan(0);
}, 15000);
