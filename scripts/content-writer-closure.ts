/**
 * Content Writer v1 closure: READ-ONLY preflight, then at most one budgeted
 * production generation. Explicit --run and GROWTH_OS_LIVE_WRITER=1 required.
 *
 * Usage:
 *   npx tsx scripts/content-writer-closure.ts --list
 *   npx tsx scripts/content-writer-closure.ts --brief=BRIEF_ID
 *   GROWTH_OS_LIVE_WRITER=1 npx tsx scripts/content-writer-closure.ts --brief=BRIEF_ID --run
 *
 * No approval or CMS publication is performed.
 */
import { loadEnvConfig } from "@next/env";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
loadEnvConfig(process.env.GROWTH_OS_ENV_DIR?.trim() || process.cwd());

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function main(): Promise<void> {
  const { prisma } = await import("../src/lib/prisma");
  try {
    const args = process.argv.slice(2);
    const list = args.includes("--list");
    const live = args.includes("--run");
    const briefId = args.find((arg) => arg.startsWith("--brief="))?.slice(8);

    if (list && !live) {
      const briefs = await prisma.contentBrief.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          topic: true,
          primaryKeyword: true,
          status: true,
          website: { select: { url: true } },
          evidenceSnapshot: { select: { id: true } },
        },
      });
      console.log(JSON.stringify({
        mode: "READ_ONLY_LIST",
        briefs: briefs.map((brief) => ({
          briefId: brief.id,
          topic: brief.topic,
          primaryKeyword: brief.primaryKeyword,
          status: brief.status,
          website: brief.website.url,
          hasSnapshot: Boolean(brief.evidenceSnapshot),
        })),
      }, null, 2));
      return;
    }
    if (!briefId || !/^[a-zA-Z0-9_-]{1,100}$/.test(briefId)) {
      throw new Error("Pass --list or --brief=EXISTING_BRIEF_ID");
    }

    const brief = await prisma.contentBrief.findUnique({
      where: { id: briefId },
      include: {
        website: { select: { url: true } },
        evidenceSnapshot: true,
      },
    });
    if (!brief) throw new Error("BRIEF_NOT_FOUND:" + briefId);

    const { inspectProductionMasterRuntimePlan } =
      await import("../src/lib/content/production-master-runtime-readiness");
    const { inspectMasterRuntimeSnapshot } =
      await import("../src/lib/content/master-runtime-adapter");
    const { parsePersistedArticleExecutionPlanV1 } =
      await import("../src/lib/content/article-execution-plan-binding-v1");
    const {
      assertArticlePreWriterEvidenceReadyV1,
      assertArticlePreWriterRequiredCoverageV1,
      assertArticlePreWriterAnswerSupportV2,
    } = await import("../src/lib/content/article-prewriter-evidence-gate-v1");

    const persisted = brief.evidenceSnapshot?.plan ?? null;
    const runtime = inspectProductionMasterRuntimePlan(persisted);
    const inspected = inspectMasterRuntimeSnapshot(persisted);
    const record = persisted && typeof persisted === "object" && !Array.isArray(persisted)
      ? persisted as Record<string, unknown>
      : null;

    const blockers: string[] = [
      ...runtime.blockers,
      ...runtime.adapterBlockers,
      ...(inspected.runtime ? [] : inspected.blockers),
    ];
    let plan: ReturnType<typeof parsePersistedArticleExecutionPlanV1> | null = null;
    try {
      plan = parsePersistedArticleExecutionPlanV1(record?.articleExecutionPlan);
      assertArticlePreWriterEvidenceReadyV1(plan);
      assertArticlePreWriterRequiredCoverageV1(plan);
      assertArticlePreWriterAnswerSupportV2(plan);
    } catch (error) {
      blockers.push(errorMessage(error));
    }

    const existing = await prisma.contentArticle.findMany({
      where: { briefId },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        title: true,
        publishError: true,
        createdAt: true,
      },
    });
    const hasReadyArticle = existing.some(
      (a) => a.status === "IN_REVIEW" || a.status === "APPROVED" || a.status === "PUBLISHED"
    );
    const hasActiveGeneration = existing.some((a) => a.status === "GENERATING");
    const writable = plan?.sections.filter((s) => s.state === "WRITABLE") ?? [];
    const deferred = plan?.sections.filter((s) => s.state === "DEFERRED_NO_EVIDENCE") ?? [];
    const ready = runtime.readiness === "READY" && inspected.runtime !== null &&
      blockers.length === 0 && writable.length > 0;

    console.log(JSON.stringify({
      mode: live ? "CONTROLLED_LIVE" : "READ_ONLY_PREFLIGHT",
      briefId: brief.id,
      topic: brief.topic,
      primaryKeyword: brief.primaryKeyword,
      website: brief.website.url,
      readiness: runtime.readiness,
      writableSections: writable.length,
      deferredSections: deferred.length,
      verifiedEvidenceIds: plan?.verifiedEvidenceIds.length ?? 0,
      requiredClaims: [...new Set(writable.flatMap((s) => s.requiredClaimIds))].length,
      blockers,
      readyToAttemptGeneration: ready && !hasReadyArticle && !hasActiveGeneration,
      existingArticles: existing.map((a) => ({
        id: a.id,
        status: a.status,
        title: a.title,
        failure: a.publishError?.slice(0, 800) ?? null,
        createdAt: a.createdAt,
      })),
    }, null, 2));

    if (!live) {
      console.log("NO_MODEL_CALLS=YES; DATABASE_UNCHANGED=YES");
      if (!ready) process.exitCode = 2;
      return;
    }

    if (process.env.GROWTH_OS_LIVE_WRITER !== "1") {
      throw new Error("LIVE_RUN_REQUIRES_GROWTH_OS_LIVE_WRITER=1");
    }
    if (!ready) throw new Error("PREWRITER_NOT_READY: see blockers above");
    if (hasReadyArticle) throw new Error("ALREADY_HAS_REVIEW_OR_PUBLISHED_ARTICLE");
    if (hasActiveGeneration) throw new Error("EXISTING_GENERATING_ARTICLE: do not overlap");

    // Preserve each verified section across a failed local CLI attempt.
    if (!process.env.GROWTH_OS_ARTICLE_CHECKPOINT_DIR) {
      process.env.GROWTH_OS_ARTICLE_CHECKPOINT_DIR =
        join(process.cwd(), ".growth-os-tmp", "master-writer-section-checkpoints");
    }

    // The production service reuses the latest rejected article row. Back
    // up its current contents locally before invoking that mutating service.
    const priorRejected = await prisma.contentArticle.findFirst({
      where: { briefId, status: { in: ["REJECTED", "BLOCKED_EXTERNAL"] } },
      orderBy: { createdAt: "desc" },
    });
    if (priorRejected) {
      const backupDir = join(process.cwd(), ".growth-os-tmp");
      await mkdir(backupDir, { recursive: true });
      const backup = join(backupDir, "writer-before-retry-" + priorRejected.id + "-" +
        Date.now() + ".json");
      await writeFile(backup, JSON.stringify(priorRejected, null, 2), {
        flag: "wx",
        mode: 0o600,
      });
      console.log("PRIOR_REJECTED_ARTICLE_BACKED_UP=" + backup);
    }

    const { geminiGenerator } = await import("../src/lib/content/gemini-generator");
    const { generateArticleFromBrief } = await import("../src/lib/content/service");
    const {
      ARTICLE_GENERATION_BUDGET_V1,
      createContentRunBudgetV1,
      withContentRunBudgetV1,
    } = await import("../src/lib/content/content-run-budget-v1");

    // Smaller ceiling than the normal web UI, to prevent an expensive
    // terminal smoke test from consuming the full production allowance.
    const budget = createContentRunBudgetV1({
      maxModelCalls: Math.min(24, ARTICLE_GENERATION_BUDGET_V1.maxModelCalls),
      maxEstimatedInputTokens: Math.min(65000, ARTICLE_GENERATION_BUDGET_V1.maxEstimatedInputTokens),
      maxRepairCalls: Math.min(8, ARTICLE_GENERATION_BUDGET_V1.maxRepairCalls),
    });
    const generator = withContentRunBudgetV1({ generator: geminiGenerator, budget });

    console.log("LIVE_GENERATION_START: one attempt; no approval; no publication");
    try {
      const article = await generateArticleFromBrief(generator, briefId);
      const body = article.bodyMarkdown ?? "";
      const headings = body.split("\n").filter((line) => /^#{1,6}\s/.test(line));
      const wordCount = (body.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) ?? []).length;
      console.log(JSON.stringify({
        result: article.status === "IN_REVIEW" ? "ARTICLE_READY_FOR_HUMAN_REVIEW" : "ARTICLE_NOT_READY",
        articleId: article.id,
        status: article.status,
        title: article.title,
        metaDescription: article.metaDescription,
        h1: article.h1,
        words: wordCount,
        headings,
        publishError: article.publishError,
        budget: budget.snapshot(),
        preview: body.slice(0, 1300),
        approvalCalled: false,
        publishCalled: false,
      }, null, 2));
      if (article.status !== "IN_REVIEW") process.exitCode = 3;
    } catch (error) {
      console.error("LIVE_GENERATION_ERROR=" + errorMessage(error));
      console.log("BUDGET=" + JSON.stringify(budget.snapshot()));
      const latest = await prisma.contentArticle.findFirst({
        where: { briefId },
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, publishError: true },
      });
      console.log("LATEST_ARTICLE=" + JSON.stringify(latest));
      process.exitCode = 4;
    }
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((error) => {
  console.error("CONTENT_WRITER_CLOSURE_FAILED=" + errorMessage(error));
  process.exitCode = 1;
});
