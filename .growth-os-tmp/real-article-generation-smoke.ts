import {
  loadEnvConfig,
} from "@next/env";

loadEnvConfig(
  "/Users/user/growth-os"
);

const BRIEF_ID =
  "cmuaajq730000qgqlg42je4jr";

function countWords(
  value:
    string
): number {
  return (
    value
      .trim()
      .match(
        /\S+/g
      ) ??
    []
  ).length;
}

function headings(
  markdown:
    string
): string[] {
  return markdown
    .split(
      "\n"
    )
    .map(
      (line) =>
        line.trim()
    )
    .filter(
      (line) =>
        /^#{1,6}\s+/.test(
          line
        )
    );
}

function suspiciousText(
  value:
    string
): string[] {
  const checks: Array<
    [
      string,
      RegExp
    ]
  > = [
    [
      "KNOWN_A_CHANGES",
      /\ba changes\b/i,
    ],

    [
      "KNOWN_A_LOAN_JOIN",
      /\baloan\b/i,
    ],

    [
      "KNOWN_CREDITORS_FROM_JOIN",
      /\bcreditorsfrom\b/i,
    ],

    [
      "MARKDOWN_H1_IN_BODY",
      /^#\s+/m,
    ],

    [
      "TRIPLE_SPACE",
      / {3,}/,
    ],

    [
      "BROKEN_DOUBLE_COMMA",
      /,,/,
    ],

    [
      "EMPTY_MARKDOWN_LINK",
      /\[\s*\]\([^)]*\)/,
    ],
  ];

  return checks
    .filter(
      (
        [
          ,
          pattern,
        ]
      ) =>
        pattern.test(
          value
        )
    )
    .map(
      (
        [
          code,
        ]
      ) =>
        code
    );
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
    geminiGenerator,
  } = await import(
    "/Users/user/growth-os/src/lib/content/gemini-generator"
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

  const {
    extractExternalEvidenceSources,
  } = await import(
    "/Users/user/growth-os/src/lib/content/external-evidence-sources"
  );

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

          website: {
            include: {
              business:
                true,
            },
          },
        },
      });

    if (!brief) {
      console.error(
        "SMOKE_FAIL: BRIEF_NOT_FOUND"
      );

      process.exitCode =
        2;

      return;
    }

    const before =
      await prisma.contentArticle.count({
        where: {
          briefId:
            BRIEF_ID,
        },
      });

    console.log(
      "============================================================"
    );

    console.log(
      " GENERATION INPUT"
    );

    console.log(
      "============================================================"
    );

    console.log(
      JSON.stringify(
        {
          briefId:
            brief.id,

          topic:
            brief.topic,

          primaryKeyword:
            brief.primaryKeyword,

          searchIntent:
            brief.searchIntent,

          website:
            brief.website.url,

          business:
            brief.website
              .business
              .name,

          generator:
            geminiGenerator.modelName,

          articlesBefore:
            before,

          snapshotAvailable:
            Boolean(
              brief.evidenceSnapshot
            ),
        },
        null,
        2
      )
    );

    console.log();
    console.log(
      "============================================================"
    );

    console.log(
      " RUNNING REAL PRODUCTION GENERATION"
    );

    console.log(
      "============================================================"
    );

    let generated:
      Awaited<
        ReturnType<
          typeof generateArticleFromBrief
        >
      >;

    try {
      generated =
        await generateArticleFromBrief(
          geminiGenerator,
          BRIEF_ID
        );
    } catch (
      error
    ) {
      const afterFailure =
        await prisma.contentArticle.findFirst({
          where: {
            briefId:
              BRIEF_ID,
          },

          orderBy: {
            createdAt:
              "desc",
          },
        });

      console.error(
        "REAL_GENERATION_ERROR",
        error
      );

      console.log(
        "LATEST_ARTICLE_AFTER_FAILURE="
      );

      console.log(
        JSON.stringify(
          afterFailure
            ? {
                id:
                  afterFailure.id,

                status:
                  afterFailure.status,

                title:
                  afterFailure.title,

                publishError:
                  afterFailure.publishError,

                generatedBy:
                  afterFailure.generatedBy,

                createdAt:
                  afterFailure.createdAt,
              }
            : null,
          null,
          2
        )
      );

      process.exitCode =
        3;

      return;
    }

    const article =
      await prisma.contentArticle.findUnique({
        where: {
          id:
            generated.id,
        },
      });

    if (!article) {
      console.error(
        "SMOKE_FAIL: GENERATED_ARTICLE_NOT_FOUND"
      );

      process.exitCode =
        4;

      return;
    }

    const after =
      await prisma.contentArticle.count({
        where: {
          briefId:
            BRIEF_ID,
        },
      });

    const audit =
      auditArticle({
        article: {
          title:
            article.title,

          metaDescription:
            article.metaDescription,

          h1:
            article.h1,

          bodyMarkdown:
            article.bodyMarkdown,
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
            article.title,

          metaDescription:
            article.metaDescription,

          h1:
            article.h1,

          bodyMarkdown:
            article.bodyMarkdown,
        },

        primaryKeyword:
          brief.primaryKeyword,

        audit,

        registry,
      });

    const intelligence =
      analyzeArticleAgainstPlan({
        title:
          article.title,

        metaDescription:
          article.metaDescription,

        h1:
          article.h1,

        bodyMarkdown:
          article.bodyMarkdown,

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

    const publicationPolicy =
      evaluateArticlePublicationPolicy({
        article: {
          title:
            article.title,

          metaDescription:
            article.metaDescription,

          h1:
            article.h1,

          bodyMarkdown:
            article.bodyMarkdown,
        },

        intelligence,
      });

    const sourceRecords =
      extractExternalEvidenceSources(
        brief
          .evidenceSnapshot
          ?.plan ??
        null
      );

    const articleHeadings =
      headings(
        article.bodyMarkdown
      );

    const suspicious =
      suspiciousText(
        [
          article.title,
          article.metaDescription,
          article.h1,
          article.bodyMarkdown,
        ].join(
          "\n"
        )
      );

    const firstParagraph =
      article.bodyMarkdown
        .split(
          /\n\s*\n/
        )
        .map(
          (part) =>
            part.trim()
        )
        .find(
          (part) =>
            Boolean(
              part
            ) &&
            !part.startsWith(
              "#"
            )
        ) ??
      "";

    const basicChecks = {
      titlePresent:
        article.title
          .trim()
          .length >
        0,

      metaPresent:
        article.metaDescription
          .trim()
          .length >
        0,

      h1Present:
        article.h1
          .trim()
          .length >
        0,

      bodyPresent:
        article.bodyMarkdown
          .trim()
          .length >
        0,

      bodyHasNoH1:
        !/^#\s+/m.test(
          article.bodyMarkdown
        ),

      hasH2:
        articleHeadings.some(
          (heading) =>
            /^##\s+/.test(
              heading
            ) &&
            !/^###\s+/.test(
              heading
            )
        ),

      firstParagraphPresent:
        firstParagraph.length >
        0,

      noKnownBrokenText:
        suspicious.length ===
        0,

      generatedRowCreated:
        after ===
        before +
        1,

      notPublished:
        article.status !==
          "PUBLISHED" &&
        article.publishedUrl ===
          null &&
        article.publishedAt ===
          null,
    };

    const basicPass =
      Object.values(
        basicChecks
      ).every(
        Boolean
      );

    console.log();
    console.log(
      "============================================================"
    );

    console.log(
      " GENERATED ARTICLE — QA"
    );

    console.log(
      "============================================================"
    );

    console.log(
      JSON.stringify(
        {
          id:
            article.id,

          status:
            article.status,

          generatedBy:
            article.generatedBy,

          createdAt:
            article.createdAt,

          title:
            article.title,

          titleChars:
            article.title.length,

          metaDescription:
            article.metaDescription,

          metaChars:
            article.metaDescription.length,

          h1:
            article.h1,

          h1Chars:
            article.h1.length,

          wordCount:
            countWords(
              article.bodyMarkdown
            ),

          analyzerWordCount:
            audit.wordCount,

          h2Count:
            audit.h2Count,

          h3Count:
            audit.h3Count,

          primaryKeywordDensityPct:
            audit.primaryKeywordDensityPct,

          analyzerIssues:
            audit.issues,

          headings:
            articleHeadings,

          firstParagraph,

          suspiciousText:
            suspicious,

          basicChecks,

          contentGate: {
            pass:
              gate.pass,

            blockingIssues:
              gate.blockingIssues,

            warnings:
              gate.warnings,

            claimFindings:
              gate.claimFindings,

            topicAlignment:
              gate.topicAlignment,
          },

          planAnalysis: {
            planAvailable:
              intelligence.planAvailable,

            confidence:
              intelligence.confidence,

            topicCoverage:
              intelligence.topics,

            questionCoverage:
              intelligence.questions,

            warnings:
              intelligence.warnings,
          },

          externalEvidence: {
            sourceCount:
              sourceRecords.length,

            verifiedExcerptCount:
              sourceRecords.filter(
                (
                  source
                ) =>
                  source.evidenceLevel ===
                  "VERIFIED_EXCERPT"
              ).length,

            searchSnippetCount:
              sourceRecords.filter(
                (
                  source
                ) =>
                  source.evidenceLevel ===
                  "SEARCH_SNIPPET"
              ).length,

            referenceOnlyCount:
              sourceRecords.filter(
                (
                  source
                ) =>
                  source.evidenceLevel ===
                  "REFERENCE_ONLY"
              ).length,
          },

          publicationPolicy: {
            pass:
              publicationPolicy.pass,

            blockingIssues:
              publicationPolicy.blockingIssues,

            planWarnings:
              publicationPolicy.planWarnings,

            evidenceFindings:
              publicationPolicy.evidenceFindings,
          },

          articlesBefore:
            before,

          articlesAfter:
            after,

          publishedUrl:
            article.publishedUrl,

          publishedAt:
            article.publishedAt,
        },
        null,
        2
      )
    );

    console.log();
    console.log(
      "============================================================"
    );

    console.log(
      " ARTICLE PREVIEW — FIRST 2500 CHARS"
    );

    console.log(
      "============================================================"
    );

    console.log(
      article.bodyMarkdown.slice(
        0,
        2500
      )
    );

    console.log();
    console.log(
      "============================================================"
    );

    console.log(
      " ARTICLE PREVIEW — LAST 1500 CHARS"
    );

    console.log(
      "============================================================"
    );

    console.log(
      article.bodyMarkdown.slice(
        -1500
      )
    );

    console.log();
    console.log(
      "============================================================"
    );

    console.log(
      " SMOKE ASSERTIONS"
    );

    console.log(
      "============================================================"
    );

    console.log(
      `BASIC_ARTICLE_STRUCTURE=${basicPass ? "PASS" : "FAIL"}`
    );

    console.log(
      `CONTENT_GATE=${gate.pass ? "PASS" : "BLOCKED"}`
    );

    console.log(
      `PUBLICATION_POLICY=${publicationPolicy.pass ? "PASS" : "BLOCKED"}`
    );

    console.log(
      `STATUS=${article.status}`
    );

    console.log(
      `ARTICLE_ID=${article.id}`
    );

    console.log(
      "APPROVE_CALLED=NO"
    );

    console.log(
      "PUBLISH_CALLED=NO"
    );

    if (
      !basicPass
    ) {
      process.exitCode =
        5;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(
  (
    error
  ) => {
    console.error(
      "REAL_ARTICLE_SMOKE_FATAL",
      error
    );

    process.exitCode =
      1;
  }
);
