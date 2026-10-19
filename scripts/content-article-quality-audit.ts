/**
 * Read-only inspection of one persisted content article.
 *
 * npx tsx scripts/content-article-quality-audit.ts --article=ID
 *
 * Does not generate, approve, publish, write database records or call AI.
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function firstString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function headingKey(value: string): string {
  return value.normalize("NFKC").toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const id = args.find((arg) => arg.startsWith("--article="))?.slice(10);
  if (!id || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
    throw new Error("USAGE: --article=EXISTING_ARTICLE_ID");
  }

  const { prisma } = await import("../src/lib/prisma");
  try {
    const article = await prisma.contentArticle.findUnique({
      where: { id },
      include: {
        brief: {
          include: {
            evidenceSnapshot: true,
            website: { select: { url: true } },
          },
        },
      },
    });
    if (!article) throw new Error("ARTICLE_NOT_FOUND:" + id);

    const { auditArticle } = await import("../src/lib/content/content-quality");
    const { analyzeArticleAgainstPlan } = await import("../src/lib/content/content-plan-analysis");
    const { evaluateContentGate } = await import("../src/lib/content/content-gate");
    const { evaluateArticlePublicationPolicy } =
      await import("../src/lib/content/article-publication-policy");
    const { getBusinessFactRegistryForBrief } =
      await import("../src/lib/content/evidence-snapshot");
    const { assertStoredPublicationEvidenceV1 } =
      await import("../src/lib/content/stored-publication-evidence-gate-v1");
    const { parsePersistedArticleExecutionPlanV1 } =
      await import("../src/lib/content/article-execution-plan-binding-v1");
    const { inspectMasterRuntimeSnapshot } =
      await import("../src/lib/content/master-runtime-adapter");
    const { evaluateArticleSearchReadinessV2 } =
      await import("../src/lib/content/article-search-readiness-v2");

    const sourcePlan = article.brief.evidenceSnapshot?.plan ?? null;
    const sourceRecord = record(sourcePlan);
    const runtime = record(sourceRecord?.masterRuntime);
    const graph = record(runtime?.evidenceGraph);
    const ledger = record(runtime?.claimLedger);
    const brief = article.brief;

    const generated = {
      title: article.title,
      metaDescription: article.metaDescription,
      h1: article.h1,
      bodyMarkdown: article.bodyMarkdown,
    };
    const audit = auditArticle({
      article: generated,
      primaryKeyword: brief.primaryKeyword,
    });
    const intelligence = analyzeArticleAgainstPlan({
      ...generated,
      primaryKeyword: brief.primaryKeyword,
      secondaryKeywords: brief.secondaryKeywords,
      plan: sourcePlan,
    });
    const registry = await getBusinessFactRegistryForBrief({
      briefId: brief.id, websiteId: brief.websiteId,
    });
    const gate = evaluateContentGate({
      article: generated,
      primaryKeyword: brief.primaryKeyword,
      audit, registry,
    });
    const policy = evaluateArticlePublicationPolicy({
      article: generated, intelligence,
    });

    let publicationEvidence: string = "PASS";
    try {
      assertStoredPublicationEvidenceV1(sourcePlan);
    } catch (error) {
      publicationEvidence = error instanceof Error ? error.message : String(error);
    }

    let executionPlan: ReturnType<typeof parsePersistedArticleExecutionPlanV1> | null = null;
    let executionPlanError: string | null = null;
    try {
      executionPlan = parsePersistedArticleExecutionPlanV1(sourceRecord?.articleExecutionPlan);
    } catch (error) {
      executionPlanError = error instanceof Error ? error.message : String(error);
    }

    // Keep the legacy 0-100 technical score unchanged, but surface the
    // independent search/editorial verdict from the existing shared engine.
    // The persisted SERP fingerprint is read, never regenerated.
    const latestReplay = await prisma.serpReplayArtifact.findFirst({
      where: { contentArticleId: article.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    const editorialAndSearch = evaluateArticleSearchReadinessV2({
      article: generated,
      runtime: inspectMasterRuntimeSnapshot(sourcePlan).runtime,
      plan: executionPlan,
      primaryKeyword: brief.primaryKeyword,
      secondaryKeywords: brief.secondaryKeywords,
      replay: latestReplay,
    });

    const lines = article.bodyMarkdown.split(/\r?\n/);
    const allHeadings = lines.filter((line) => /^#{1,6}\s+/.test(line));
    const h2 = allHeadings.filter((line) => /^##\s+/.test(line) && !/^###\s+/.test(line));
    const h3 = allHeadings.filter((line) => /^###\s+/.test(line));
    const duplicateHeadings: string[] = [];
    const known = new Set<string>();
    for (const heading of [article.h1, ...allHeadings.map((s) => s.replace(/^#{1,6}\s+/, ""))]) {
      const key = headingKey(heading);
      if (key && known.has(key)) duplicateHeadings.push(heading);
      known.add(key);
    }

    const sections = executionPlan?.sections ?? [];
    const writable = sections.filter((s) => s.state === "WRITABLE");
    const evidence = array(graph?.claimEvidence).map(record).filter(
      (x): x is Record<string, unknown> => x !== null
    );
    const storedClaims = array(ledger?.claims).map(record).filter(
      (x): x is Record<string, unknown> => x !== null
    );
    const countByStatus: Record<string, number> = {};
    for (const claim of storedClaims) {
      const status = firstString(claim.status) || "UNKNOWN";
      countByStatus[status] = (countByStatus[status] ?? 0) + 1;
    }
    const verifiedExcerptCount = evidence.filter(
      (e) => e.kind === "VERIFIED_EXCERPT" && e.relation === "SUPPORTS"
    ).length;

    const report = {
      mode: "READ_ONLY_ARTICLE_QA",
      databaseUnchanged: true,
      aiCalls: 0,
      article: {
        id: article.id,
        status: article.status,
        title: article.title,
        metaDescription: article.metaDescription,
        h1: article.h1,
        primaryKeyword: brief.primaryKeyword,
        secondaryKeywords: brief.secondaryKeywords,
        website: brief.website.url,
        publishedUrl: article.publishedUrl,
        publishError: article.publishError,
      },
      structure: {
        wordCount: audit.wordCount,
        plannedLength: executionPlan?.lengthPlan ?? null,
        h2Count: h2.length,
        h3Count: h3.length,
        headings: allHeadings,
        h1HeadingsInsideBody: allHeadings.filter((line) => /^#\s+/.test(line)),
        duplicateHeadings,
        firstParagraph: article.bodyMarkdown.split(/\n\s*\n/).map((s) => s.trim())
          .find((s) => s.length > 0 && !s.startsWith("#"))?.slice(0, 600) ?? "",
        articleBodyCharacterCount: article.bodyMarkdown.length,
      },
      executionPlan: {
        parseError: executionPlanError,
        writableSections: writable.length,
        deferredSections: sections.filter((s) => s.state === "DEFERRED_NO_EVIDENCE").length,
        requiredQuestions: executionPlan?.requiredQuestions ?? [],
        writableHeadings: writable.map((s) => ({
          heading: s.heading, minWords: s.targetWords.min,
          preferredWords: s.targetWords.preferred, maxWords: s.targetWords.max,
          claimCount: s.requiredClaimIds.length,
          verifiedEvidenceCount: s.evidenceIds.length,
        })),
      },
      evidence: {
        publicationGate: publicationEvidence,
        sourceCount: array(graph?.sources).length,
        totalClaimCount: storedClaims.length,
        claimsByStatus: countByStatus,
        verifiedExcerptCount,
      },
      quality: {
        score: audit.score,
        scoreScope: "TECHNICAL_RULES_ONLY_NOT_EDITORIAL_OR_SEARCH_READINESS",
        issues: audit.issues,
        keywordDensityPercent: audit.primaryKeywordDensityPct,
        contentGatePass: gate.pass,
        contentGateBlockers: gate.blockingIssues,
        contentGateWarnings: gate.warnings,
        topicAlignment: gate.topicAlignment,
        publicationPolicyPass: policy.pass,
        publicationPolicyBlockers: policy.blockingIssues,
        planWarnings: policy.planWarnings,
        planConfidence: intelligence.confidence,
        planAvailable: intelligence.planAvailable,
        lexicalTopics: intelligence.topics,
        lexicalQuestions: intelligence.questions,
        benchmarkObservation: intelligence.benchmarkObservation,
      },
      editorialAndSearchReadiness: {
        source: editorialAndSearch.version,
        status: editorialAndSearch.status,
        canClaimSeoReady: editorialAndSearch.canClaimSeoReady,
        publishRecommendation: editorialAndSearch.publishRecommendation,
        findings: editorialAndSearch.findings,
        strictSpacingIssues: editorialAndSearch.article.probableSpacingIssues,
        possibleWordJoins: editorialAndSearch.article.possibleWordJoins,
        replay: editorialAndSearch.replay,
        observedSupportingQueries: editorialAndSearch.observedSupportingQueries,
        assignedSupportingQueries: editorialAndSearch.assignedSupportingQueries,
      },
      plainText: article.bodyMarkdown,
    };

    console.log(JSON.stringify(report, null, 2));
    if (!article.bodyMarkdown.trim()) process.exitCode = 2;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("ARTICLE_QA_FAILED=" + (error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});
