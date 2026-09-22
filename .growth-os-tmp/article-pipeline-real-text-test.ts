import {
  loadEnvConfig,
} from "@next/env";

loadEnvConfig(
  "/Users/user/growth-os"
);

const BRIEF_ID =
  "cmuaajq730000qgqlg42je4jr";

const SOURCE_ARTICLE_ID =
  "cmuaanrih0000i2qllph4qxr9";

const TEST_MODELS = [
  "pipeline-smoke-healthy-v1",
  "pipeline-smoke-transient-v1",
];

function words(
  text:
    string
): number {
  return (
    text
      .trim()
      .match(
        /\S+/g
      ) ??
    []
  ).length;
}

function headingCount(
  text:
    string,
  level:
    2 | 3
): number {
  const marker =
    level === 2
      ? /^##\s+/gm
      : /^###\s+/gm;

  return (
    text.match(
      marker
    ) ??
    []
  ).length;
}

async function main() {
  const {
    prisma,
  } = await import(
    "/Users/user/growth-os/src/lib/prisma"
  );

  const {
    generateArticleFromBrief,
  } = await import(
    "/Users/user/growth-os/src/lib/content/service"
  );

  const {
    ContentGenerationError,
  } = await import(
    "/Users/user/growth-os/src/lib/content/generator"
  );

  const {
    auditArticle,
  } = await import(
    "/Users/user/growth-os/src/lib/content/content-quality"
  );

  const {
    evaluateContentGate,
  } = await import(
    "/Users/user/growth-os/src/lib/content/content-gate"
  );

  const {
    analyzeArticleAgainstPlan,
  } = await import(
    "/Users/user/growth-os/src/lib/content/content-plan-analysis"
  );

  const {
    evaluateArticlePublicationPolicy,
  } = await import(
    "/Users/user/growth-os/src/lib/content/article-publication-policy"
  );

  const {
    getBusinessFactRegistryForWebsite,
  } = await import(
    "/Users/user/growth-os/src/lib/content/business-fact-repository"
  );

  const createdIds:
    string[] =
    [];

  try {
    const brief =
      await prisma.contentBrief.findUnique({
        where: {
          id:
            BRIEF_ID,
        },

        include: {
          evidenceSnapshot:
            true,
        },
      });

    const source =
      await prisma.contentArticle.findUnique({
        where: {
          id:
            SOURCE_ARTICLE_ID,
        },
      });

    if (
      !brief ||
      !source
    ) {
      console.error(
        "FATAL: BRIEF_OR_SOURCE_ARTICLE_MISSING"
      );

      process.exitCode =
        2;

      return;
    }

    console.log(
      "=== SOURCE REAL GEMINI ARTICLE ==="
    );

    console.log(
      JSON.stringify(
        {
          id:
            source.id,

          status:
            source.status,

          title:
            source.title,

          h1:
            source.h1,

          generatedBy:
            source.generatedBy,

          words:
            words(
              source.bodyMarkdown
            ),

          h2:
            headingCount(
              source.bodyMarkdown,
              2
            ),

          h3:
            headingCount(
              source.bodyMarkdown,
              3
            ),
        },
        null,
        2
      )
    );


    const makeGenerator = (
      mode:
        "HEALTHY" |
        "TRANSIENT"
    ) => {
      const criticCalls:
        string[] =
        [];

      const modelName =
        mode ===
          "HEALTHY"
          ? TEST_MODELS[0]
          : TEST_MODELS[1];

      return {
        criticCalls,

        generator: {
          modelName,

          async generateBrief() {
            throw new Error(
              "generateBrief must not be called by article smoke"
            );
          },

          async generateArticle() {
            return {
              title:
                source.title,

              metaDescription:
                source.metaDescription,

              h1:
                source.h1,

              bodyMarkdown:
                source.bodyMarkdown,
            };
          },

          async critiqueArticle(
            input:
              any
          ) {
            criticCalls.push(
              input.role
            );

            if (
              mode ===
                "TRANSIENT" &&
              input.role ===
                "FACT_CLAIM"
            ) {
              throw new ContentGenerationError(
                "Gemini API error 503: deterministic transient critic failure"
              );
            }

            return {
              role:
                input.role,

              pass:
                true,

              findings:
                [],
            };
          },

          async rewriteArticle(
            input:
              any
          ) {
            return input.article;
          },
        },
      };
    };


    console.log();
    console.log(
      "=== SCENARIO A — HEALTHY CRITICS ==="
    );

    const healthy =
      makeGenerator(
        "HEALTHY"
      );

    const healthyArticle =
      await generateArticleFromBrief(
        healthy.generator,
        BRIEF_ID
      );

    createdIds.push(
      healthyArticle.id
    );

    console.log(
      JSON.stringify(
        {
          id:
            healthyArticle.id,

          status:
            healthyArticle.status,

          generatedBy:
            healthyArticle.generatedBy,

          title:
            healthyArticle.title,

          words:
            words(
              healthyArticle.bodyMarkdown
            ),

          critics:
            healthy.criticCalls,

          publishError:
            healthyArticle.publishError,

          publishedUrl:
            healthyArticle.publishedUrl,

          publishedAt:
            healthyArticle.publishedAt,
        },
        null,
        2
      )
    );


    console.log();
    console.log(
      "=== SCENARIO B — TRANSIENT FACT CRITIC 503 ==="
    );

    const transient =
      makeGenerator(
        "TRANSIENT"
      );

    const transientArticle =
      await generateArticleFromBrief(
        transient.generator,
        BRIEF_ID
      );

    createdIds.push(
      transientArticle.id
    );

    console.log(
      JSON.stringify(
        {
          id:
            transientArticle.id,

          status:
            transientArticle.status,

          generatedBy:
            transientArticle.generatedBy,

          title:
            transientArticle.title,

          words:
            words(
              transientArticle.bodyMarkdown
            ),

          critics:
            transient.criticCalls,

          publishError:
            transientArticle.publishError,

          publishedUrl:
            transientArticle.publishedUrl,

          publishedAt:
            transientArticle.publishedAt,
        },
        null,
        2
      )
    );


    console.log();
    console.log(
      "=== REAL ARTICLE QUALITY RECHECK ==="
    );

    const audit =
      auditArticle({
        article: {
          title:
            source.title,

          metaDescription:
            source.metaDescription,

          h1:
            source.h1,

          bodyMarkdown:
            source.bodyMarkdown,
        },

        primaryKeyword:
          brief.primaryKeyword,
      });

    const registry =
      await getBusinessFactRegistryForWebsite(
        brief.websiteId
      );

    const gate =
      evaluateContentGate({
        article: {
          title:
            source.title,

          metaDescription:
            source.metaDescription,

          h1:
            source.h1,

          bodyMarkdown:
            source.bodyMarkdown,
        },

        primaryKeyword:
          brief.primaryKeyword,

        audit,

        registry,
      });

    const intelligence =
      analyzeArticleAgainstPlan({
        title:
          source.title,

        metaDescription:
          source.metaDescription,

        h1:
          source.h1,

        bodyMarkdown:
          source.bodyMarkdown,

        primaryKeyword:
          brief.primaryKeyword,

        secondaryKeywords:
          brief.secondaryKeywords,

        plan:
          brief
            .evidenceSnapshot
            ?.plan ??
          null,
      });

    const publication =
      evaluateArticlePublicationPolicy({
        article: {
          title:
            source.title,

          metaDescription:
            source.metaDescription,

          h1:
            source.h1,

          bodyMarkdown:
            source.bodyMarkdown,
        },

        intelligence,
      });

    const suspicious = {
      aChanges:
        /\ba changes\b/i.test(
          source.bodyMarkdown
        ),

      aLoanJoined:
        /\baloan\b/i.test(
          source.bodyMarkdown
        ),

      creditorsFromJoined:
        /\bcreditorsfrom\b/i.test(
          source.bodyMarkdown
        ),

      bodyContainsH1:
        /^#\s+/m.test(
          source.bodyMarkdown
        ),

      doubleComma:
        /,,/.test(
          source.bodyMarkdown
        ),

      tripleSpace:
        / {3,}/.test(
          source.bodyMarkdown
        ),
    };

    console.log(
      JSON.stringify(
        {
          words:
            audit.wordCount,

          h2:
            audit.h2Count,

          h3:
            audit.h3Count,

          primaryKeywordDensityPct:
            audit.primaryKeywordDensityPct,

          auditIssues:
            audit.issues,

          contentGate: {
            pass:
              gate.pass,

            blockingIssues:
              gate.blockingIssues,

            warnings:
              gate.warnings,

            claims:
              gate.claimFindings,
          },

          coverage: {
            topics:
              intelligence.topics,

            questions:
              intelligence.questions,

            warnings:
              intelligence.warnings,
          },

          publicationPolicy: {
            pass:
              publication.pass,

            blockingIssues:
              publication.blockingIssues,

            evidenceFindings:
              publication.evidenceFindings,
          },

          suspicious,
        },
        null,
        2
      )
    );


    const healthyPass =
      healthy.criticCalls.join(
        ","
      ) ===
        "SEARCH_INTENT,FACT_CLAIM,EDITORIAL" &&
      healthyArticle.status !==
        "GENERATING" &&
      healthyArticle.status !==
        "PUBLISHED" &&
      healthyArticle.bodyMarkdown
        .trim()
        .length >
        0 &&
      healthyArticle.publishedUrl ===
        null &&
      healthyArticle.publishedAt ===
        null;

    const transientPass =
      transient.criticCalls.join(
        ","
      ) ===
        "SEARCH_INTENT,FACT_CLAIM" &&
      transientArticle.status ===
        "IN_REVIEW" &&
      transientArticle.bodyMarkdown
        .trim()
        .length >
        0 &&
      transientArticle.publishedUrl ===
        null &&
      transientArticle.publishedAt ===
        null;

    console.log();
    console.log(
      "============================================================"
    );

    console.log(
      " INTEGRATION ASSERTIONS"
    );

    console.log(
      "============================================================"
    );

    console.log(
      `HEALTHY_PIPELINE=${healthyPass ? "PASS" : "FAIL"}`
    );

    console.log(
      `CRITIC_ORDER=${healthy.criticCalls.join(" > ")}`
    );

    console.log(
      `TRANSIENT_REVIEW_RETENTION=${transientPass ? "PASS" : "FAIL"}`
    );

    console.log(
      `TRANSIENT_CRITIC_ORDER=${transient.criticCalls.join(" > ")}`
    );

    console.log(
      `REAL_CONTENT_GATE=${gate.pass ? "PASS" : "BLOCKED"}`
    );

    console.log(
      `REAL_PUBLICATION_POLICY=${publication.pass ? "PASS" : "BLOCKED"}`
    );

    console.log(
      `KNOWN_A_CHANGES=${suspicious.aChanges ? "FOUND" : "NOT_FOUND"}`
    );

    console.log(
      "APPROVE_CALLED=NO"
    );

    console.log(
      "PUBLISH_CALLED=NO"
    );

    if (
      !healthyPass ||
      !transientPass
    ) {
      process.exitCode =
        3;
    }
  } finally {
    if (
      createdIds.length >
      0
    ) {
      const removable =
        await prisma.contentArticle.findMany({
          where: {
            id: {
              in:
                createdIds,
            },

            generatedBy: {
              in:
                TEST_MODELS,
            },

            publishedAt:
              null,

            publishedUrl:
              null,
          },

          select: {
            id:
              true,
          },
        });

      const removableIds =
        removable.map(
          (
            row
          ) =>
            row.id
        );

      if (
        removableIds.length >
        0
      ) {
        await prisma.contentArticle.deleteMany({
          where: {
            id: {
              in:
                removableIds,
            },
          },
        });
      }

      console.log();
      console.log(
        "SMOKE_ROWS_CLEANED=",
        removableIds.length
      );
    }

    await prisma.$disconnect();
  }
}

main().catch(
  (
    error
  ) => {
    console.error(
      "ARTICLE_PIPELINE_TEST_FATAL",
      error
    );

    process.exitCode =
      1;
  }
);
