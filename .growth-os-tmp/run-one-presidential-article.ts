import {
  loadEnvConfig,
} from "@next/env";

loadEnvConfig(
  "/Users/user/growth-os"
);

const BRIEF_ID =
  "cmuaajq730000qgqlg42je4jr";

function wordCount(
  value:
    string
): number {
  return value
    .trim()
    .split(
      /\s+/
    )
    .filter(
      Boolean
    ).length;
}

async function main() {
  const {
    prisma,
  } = await import(
    "/Users/user/growth-os/src/lib/prisma"
  );

  try {
    const before =
      await prisma.contentBrief.findUnique({
        where: {
          id:
            BRIEF_ID,
        },

        include: {
          articles: {
            select: {
              id:
                true,

              status:
                true,

              title:
                true,

              generatedBy:
                true,

              publishError:
                true,
            },
          },

          evidenceSnapshot: {
            select: {
              plannerVersion:
                true,

              gateVersion:
                true,

              generatorModel:
                true,

              plan:
                true,
            },
          },
        },
      });

    if (!before) {
      console.log(
        "BRIEF_NOT_FOUND"
      );

      process.exitCode =
        2;

      return;
    }

    const plan =
      before
        .evidenceSnapshot
        ?.plan;

    const blueprint =
      plan &&
      typeof plan ===
        "object" &&
      !Array.isArray(
        plan
      )
        ? (
            plan as Record<
              string,
              unknown
            >
          )[
            "searchBlueprintShadow"
          ]
        : null;

    console.log(
      "PRE_GENERATION=" +
        JSON.stringify(
          {
            briefId:
              before.id,

            topic:
              before.topic,

            primaryKeyword:
              before.primaryKeyword,

            searchIntent:
              before.searchIntent,

            briefStatus:
              before.status,

            plannerVersion:
              before
                .evidenceSnapshot
                ?.plannerVersion ??
              null,

            gateVersion:
              before
                .evidenceSnapshot
                ?.gateVersion ??
              null,

            generatorModel:
              before
                .evidenceSnapshot
                ?.generatorModel ??
              null,

            hasBlueprint:
              Boolean(
                blueprint
              ),

            existingArticleCount:
              before
                .articles
                .length,
          },
          null,
          2
        )
    );

    if (
      !blueprint
    ) {
      console.log(
        "GENERATION_REFUSED=NO_BLUEPRINT"
      );

      process.exitCode =
        3;

      return;
    }

    if (
      before
        .articles
        .length !==
      0
    ) {
      console.log(
        "GENERATION_REFUSED=ARTICLE_ALREADY_EXISTS"
      );

      console.log(
        JSON.stringify(
          before.articles,
          null,
          2
        )
      );

      process.exitCode =
        4;

      return;
    }

    console.log();
    console.log(
      "============================================================"
    );
    console.log(
      " REAL GENERATION START"
    );
    console.log(
      " EXACTLY_ONE_GENERATION_CALL=YES"
    );
    console.log(
      " PUBLISH=NO"
    );
    console.log(
      "============================================================"
    );
    console.log();

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

    let returnedArticle:
      Awaited<
        ReturnType<
          typeof generateArticleFromBrief
        >
      > |
      null =
        null;

    try {
      returnedArticle =
        await generateArticleFromBrief(
          geminiGenerator,
          BRIEF_ID
        );

      console.log();
      console.log(
        "GENERATION_CALL_RETURNED=YES"
      );

      console.log(
        "RETURNED_ARTICLE=" +
          JSON.stringify(
            {
              id:
                returnedArticle.id,

              status:
                returnedArticle.status,

              title:
                returnedArticle.title,

              generatedBy:
                returnedArticle.generatedBy,

              publishError:
                returnedArticle.publishError,
            },
            null,
            2
          )
      );
    } catch (
      error
    ) {
      console.error();
      console.error(
        "GENERATION_CALL_THROWN",
        error
      );
    }

    const after =
      await prisma.contentArticle.findMany({
        where: {
          briefId:
            BRIEF_ID,
        },

        select: {
          id:
            true,

          briefId:
            true,

          title:
            true,

          metaDescription:
            true,

          h1:
            true,

          bodyMarkdown:
            true,

          status:
            true,

          generatedBy:
            true,

          publishError:
            true,

          publishedUrl:
            true,

          publishedAt:
            true,
        },

        orderBy: {
          id:
            "asc",
        },
      });

    console.log();
    console.log(
      "============================================================"
    );
    console.log(
      " POST-GENERATION DATABASE STATE"
    );
    console.log(
      "============================================================"
    );

    console.log(
      `ARTICLE_COUNT=${after.length}`
    );

    for (
      const article
      of after
    ) {
      console.log();

      console.log(
        JSON.stringify(
          {
            id:
              article.id,

            briefId:
              article.briefId,

            status:
              article.status,

            title:
              article.title,

            metaDescription:
              article.metaDescription,

            h1:
              article.h1,

            generatedBy:
              article.generatedBy,

            words:
              wordCount(
                article.bodyMarkdown
              ),

            bodyLength:
              article
                .bodyMarkdown
                .length,

            bodyContainsH1:
              /^#\s+/m.test(
                article.bodyMarkdown
              ),

            publishError:
              article.publishError,

            publishedUrl:
              article.publishedUrl,

            publishedAt:
              article.publishedAt,

            excerpt:
              article
                .bodyMarkdown
                .replace(
                  /\s+/g,
                  " "
                )
                .trim()
                .slice(
                  0,
                  700
                ),
          },
          null,
          2
        )
      );
    }

    const generating =
      after.filter(
        (
          article
        ) =>
          article.status ===
          "GENERATING"
      );

    const drafts =
      after.filter(
        (
          article
        ) =>
          article.status ===
          "DRAFT"
      );

    const rejected =
      after.filter(
        (
          article
        ) =>
          article.status ===
          "REJECTED"
      );

    const published =
      after.filter(
        (
          article
        ) =>
          article.status ===
          "PUBLISHED"
      );

    console.log();
    console.log(
      "============================================================"
    );
    console.log(
      " PRESIDENTIAL SMOKE SUMMARY"
    );
    console.log(
      "============================================================"
    );

    console.log(
      `TOTAL_ARTICLES_FOR_BRIEF=${after.length}`
    );

    console.log(
      `GENERATING=${generating.length}`
    );

    console.log(
      `DRAFT=${drafts.length}`
    );

    console.log(
      `REJECTED=${rejected.length}`
    );

    console.log(
      `PUBLISHED=${published.length}`
    );

    console.log(
      "GENERATION_CALLS=1"
    );

    console.log(
      "PUBLISH_CALLS=0"
    );

    console.log(
      "APPROVE_CALLS=0"
    );

    if (
      after.length !==
      1
    ) {
      console.log(
        "SMOKE_RESULT=UNEXPECTED_ARTICLE_COUNT"
      );

      process.exitCode =
        5;

      return;
    }

    if (
      generating.length >
      0
    ) {
      console.log(
        "SMOKE_RESULT=STUCK_GENERATING"
      );

      process.exitCode =
        6;

      return;
    }

    if (
      published.length >
      0
    ) {
      console.log(
        "SMOKE_RESULT=UNEXPECTED_PUBLISH"
      );

      process.exitCode =
        7;

      return;
    }

    if (
      drafts.length ===
      1
    ) {
      console.log(
        "SMOKE_RESULT=DRAFT_SUCCESS"
      );

      return;
    }

    if (
      rejected.length ===
      1
    ) {
      console.log(
        "SMOKE_RESULT=REJECTED_BY_PIPELINE"
      );

      return;
    }

    console.log(
      "SMOKE_RESULT=UNKNOWN"
    );

    process.exitCode =
      8;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(
  (
    error
  ) => {
    console.error(
      "PRESIDENTIAL_SMOKE_FATAL",
      error
    );

    process.exitCode =
      1;
  }
);
