import {
  loadEnvConfig,
} from "@next/env";

loadEnvConfig(
  "/Users/user/growth-os"
);

const ARTICLE_ID =
  "cmuaanrih0000i2qllph4qxr9";

async function main() {
  const {
    prisma,
  } = await import(
    "/Users/user/growth-os/src/lib/prisma"
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

  try {
    const article =
      await prisma.contentArticle.findUnique({
        where: {
          id:
            ARTICLE_ID,
        },

        include: {
          brief: {
            include: {
              evidenceSnapshot:
                true,
            },
          },
        },
      });

    if (!article) {
      console.log(
        "ARTICLE_NOT_FOUND"
      );

      process.exitCode =
        2;

      return;
    }

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
          article
            .brief
            .primaryKeyword,

        secondaryKeywords:
          article
            .brief
            .secondaryKeywords,

        plan:
          article
            .brief
            .evidenceSnapshot
            ?.plan ??
          null,
      });

    const policy =
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

    const suspiciousPatterns = [
      /\ba changes\b/gi,
      /\bcollectorreports\b/gi,
      /\bpayingfor\b/gi,
      /\balertsacross\b/gi,
      /\ballowingyou\b/gi,
      /\bservices\.Removing\b/g,
      /\baccessingyour\b/gi,
    ];

    console.log(
      JSON.stringify(
        {
          articleId:
            article.id,

          status:
            article.status,

          generatedBy:
            article.generatedBy,

          topic:
            article
              .brief
              .topic,

          primaryKeyword:
            article
              .brief
              .primaryKeyword,

          planAvailable:
            intelligence
              .planAvailable,

          topicCoverage:
            intelligence
              .topics,

          questionCoverage:
            intelligence
              .questions,

          analyzerWarnings:
            intelligence
              .warnings,

          publicationPolicy: {
            pass:
              policy.pass,

            blockingIssues:
              policy
                .blockingIssues,

            planWarnings:
              policy
                .planWarnings,

            evidenceFindings:
              policy
                .evidenceFindings,
          },

          existingEditorialDefects:
            suspiciousPatterns.map(
              (pattern) => ({
                pattern:
                  pattern.toString(),

                matches:
                  article
                    .bodyMarkdown
                    .match(
                      pattern
                    )
                    ?.length ??
                  0,
              })
            ),

          publishedUrl:
            article.publishedUrl,

          publishedAt:
            article.publishedAt,

          databaseMutated:
            false,
        },
        null,
        2
      )
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(
  (
    error
  ) => {
    console.error(
      "ARTICLE_V2_RECHECK_ERROR",
      error
    );

    process.exitCode =
      1;
  }
);
