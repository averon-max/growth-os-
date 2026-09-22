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

  const {
    extractExternalEvidenceSources,
  } = await import(
    "/Users/user/growth-os/src/lib/content/external-evidence-sources"
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
      console.error(
        "ARTICLE_NOT_FOUND"
      );

      process.exitCode =
        2;

      return;
    }

    const plan =
      article
        .brief
        .evidenceSnapshot
        ?.plan ??
      null;

    const sources =
      extractExternalEvidenceSources(
        plan
      );

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

        plan,
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

    const counts =
      sources.reduce(
        (
          acc,
          source
        ) => {
          acc[
            source.evidenceLevel
          ] =
            (
              acc[
                source.evidenceLevel
              ] ??
              0
            ) +
            1;

          return acc;
        },
        {} as Record<
          string,
          number
        >
      );

    const verifiedExcerptCount =
      sources.filter(
        (source) =>
          source.evidenceLevel ===
          "VERIFIED_EXCERPT"
      ).length;

    console.log(
      JSON.stringify(
        {
          articleId:
            article.id,

          briefId:
            article.briefId,

          status:
            article.status,

          generatedBy:
            article.generatedBy,

          sourceCount:
            sources.length,

          evidenceLevels:
            counts,

          verifiedExcerptCount,

          sources:
            sources.map(
              (source) => ({
                id:
                  source.id,

                domain:
                  source.domain,

                evidenceLevel:
                  source.evidenceLevel,

                authority:
                  source.authority,

                discoveredBy:
                  source.discoveredBy,
              })
            ),

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

          expectedFailClosed: {
            noVerifiedExcerpts:
              verifiedExcerptCount ===
              0,

            publicationStillBlocked:
              policy.pass ===
              false,

            sensitiveClaimsStillBlocked:
              policy
                .evidenceFindings
                .length >
              0,
          },

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

    if (
      verifiedExcerptCount !==
      0
    ) {
      console.error(
        "FAIL_CLOSED_ASSERTION_FAILED: old snapshot unexpectedly contains VERIFIED_EXCERPT"
      );

      process.exitCode =
        3;

      return;
    }

    if (
      policy.pass
    ) {
      console.error(
        "FAIL_CLOSED_ASSERTION_FAILED: old article unexpectedly passed publication policy"
      );

      process.exitCode =
        4;

      return;
    }

    if (
      policy
        .evidenceFindings
        .length ===
      0
    ) {
      console.error(
        "FAIL_CLOSED_ASSERTION_FAILED: sensitive claims unexpectedly have no evidence findings"
      );

      process.exitCode =
        5;

      return;
    }

    console.log(
      "FAIL_CLOSED_ASSERTIONS=PASS"
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
      "EXTERNAL_EVIDENCE_V1_FINAL_RECHECK_ERROR",
      error
    );

    process.exitCode =
      1;
  }
);
