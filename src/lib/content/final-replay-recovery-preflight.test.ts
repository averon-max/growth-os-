import { it, expect } from "vitest";
import { prisma } from "../prisma";
import { resolve } from "node:path";
import {
  readArticleRecoveryCheckpointV1,
} from "./article-recovery-checkpoint-reader-v1";
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

const ARTICLE_ID =
  "cmv1hjtyv06s7oaql3hgxdkxz";

it("validates real POST_FINAL_REPLAY recovery authority", async () => {
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

  const rawPlan = article.brief.evidenceSnapshot?.plan;

  if (!rawPlan || typeof rawPlan !== "object" ||
      Array.isArray(rawPlan)) {
    throw new Error("RECOVERY_PLAN_MISSING");
  }

  const plan = rawPlan as Record<string, unknown>;

  const inspection = inspectMasterRuntimeSnapshot(plan);

  if (!inspection.runtime || inspection.readiness !== "READY") {
    throw new Error(
      `RECOVERY_RUNTIME_INVALID:${inspection.blockers.join(",")}`
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

  const directory = process.env.GROWTH_OS_ARTICLE_CHECKPOINT_DIR;

  if (!directory) {
    console.log(JSON.stringify({
      result: "CHECKPOINT_NOT_CONFIGURED",
      articleId: article.id,
      contractSections: contract.sectionContracts.length,
      status: article.status,
      databaseModified: false,
    }, null, 2));
    return;
  }

  let checkpoint;

  try {
    checkpoint = await readArticleRecoveryCheckpointV1({
      articleId: article.id,
      briefId: article.brief.id,
      stage: "POST_FINAL_REPLAY",
      directory: resolve(directory),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      console.log(JSON.stringify({
        result: "CHECKPOINT_NOT_AVAILABLE",
        articleId: article.id,
        note: "Historical article has no final replay checkpoint",
        databaseModified: false,
      }, null, 2));
      return;
    }

    throw error;
  }

  const run = checkpoint.writerRun;

  const blockers: string[] = [];

  if (run.article.bodyMarkdown !== article.bodyMarkdown) {
    blockers.push("STORED_MARKDOWN_MISMATCH");
  }

  if (run.sections.length !== contract.sectionContracts.length) {
    blockers.push("SECTION_COUNT_MISMATCH");
  }

  for (let i = 0; i < contract.sectionContracts.length; i++) {
    const expected = contract.sectionContracts[i].blueprint.heading;
    const actual = run.sections[i]?.heading;

    if (actual !== expected) {
      blockers.push(`SECTION_HEADING_MISMATCH:${i}`);
    }
  }

  if (
    run.reconciliations.length !== run.sections.length
  ) {
    blockers.push("RECONCILIATION_COUNT_MISMATCH");
  }

  if (
    run.semanticVerifications.length !== run.sections.length
  ) {
    blockers.push("SEMANTIC_VERIFICATION_COUNT_MISMATCH");
  }

  const keywords = [
    article.brief.primaryKeyword,
    ...article.brief.secondaryKeywords,
  ];

  const prose = run.article.bodyMarkdown
    .split(/\r?\n/)
    .filter(line => !/^#{1,6}\s+/.test(line.trim()))
    .join("\n")
    .toLowerCase();

  for (const keyword of keywords) {
    if (!prose.includes(keyword.toLowerCase())) {
      blockers.push(`KEYWORD_MISSING:${keyword}`);
    }
  }

  console.log("=== REAL FINAL REPLAY PREFLIGHT ===");
  console.log(JSON.stringify({
    articleId: article.id,
    status: article.status,
    checkpointStage: checkpoint.stage,
    checkpointSections: run.sections.length,
    contractSections: contract.sectionContracts.length,
    keywords: keywords.length,
    result: blockers.length
      ? "BLOCKED"
      : "READY_FOR_REVALIDATION",
    blockers,
    databaseModified: false,
  }, null, 2));

  expect(blockers).toEqual([]);
}, 15000);
