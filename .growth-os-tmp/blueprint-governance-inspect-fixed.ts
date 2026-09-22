import {
  loadEnvConfig,
} from "@next/env";

loadEnvConfig(
  "/Users/user/growth-os"
);

const BRIEF_ID =
  "cmuaajq730000qgqlg42je4jr9";

const ARTICLE_ID =
  "cmuaanrih0000i2qllph4qxr9";

function record(
  value:
    unknown
): Record<string, unknown> | null {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value
    )
  ) {
    return null;
  }

  return value as
    Record<string, unknown>;
}

async function main() {
  const {
    prisma,
  } = await import(
    "/Users/user/growth-os/src/lib/prisma"
  );

  try {
    const snapshot =
      await prisma.contentEvidenceSnapshot.findUnique({
        where: {
          briefId:
            BRIEF_ID,
        },

        select: {
          id:
            true,

          plan:
            true,

          createdAt:
            true,
        },
      });

    const article =
      await prisma.contentArticle.findUnique({
        where: {
          id:
            ARTICLE_ID,
        },

        select: {
          id:
            true,

          briefId:
            true,

          status:
            true,

          publishedUrl:
            true,

          publishedAt:
            true,
        },
      });

    const brief =
      await prisma.contentBrief.findUnique({
        where: {
          id:
            BRIEF_ID,
        },

        include: {
          outcomeAction:
            true,
        },
      });

    const plan =
      record(
        snapshot?.plan
      );

    const blueprint =
      record(
        plan
          ?.searchBlueprintShadow
      );

    const pageDecision =
      record(
        plan
          ?.pageDecision
      );

    const serpFeasibility =
      record(
        plan
          ?.serpFeasibility
      );

    const analyses =
      brief
        ? await prisma.analysis.findMany({
            where: {
              websiteId:
                brief.websiteId,
            },

            select: {
              id:
                true,

              status:
                true,

              completedAt:
                true,

              createdAt:
                true,

              _count: {
                select: {
                  pages:
                    true,
                },
              },
            },

            orderBy: {
              createdAt:
                "desc",
            },

            take:
              10,
          })
        : [];

    const pages =
      brief
        ? await prisma.page.findMany({
            where: {
              analysis: {
                websiteId:
                  brief.websiteId,
              },
            },

            select: {
              id:
                true,

              url:
                true,

              title:
                true,

              h1:
                true,

              canonical:
                true,

              analysisId:
                true,

              createdAt:
                true,
            },

            orderBy: {
              createdAt:
                "desc",
            },

            take:
              100,
          })
        : [];

    const publishedArticles =
      brief
        ? await prisma.contentArticle.findMany({
            where: {
              brief: {
                websiteId:
                  brief.websiteId,
              },

              publishedUrl: {
                not:
                  null,
              },
            },

            select: {
              id:
                true,

              briefId:
                true,

              title:
                true,

              status:
                true,

              publishedUrl:
                true,

              publishedAt:
                true,

              brief: {
                select: {
                  topic:
                    true,

                  primaryKeyword:
                    true,
                },
              },
            },

            orderBy: {
              publishedAt:
                "desc",
            },

            take:
              100,
          })
        : [];

    console.log(
      JSON.stringify(
        {
          snapshot: {
            id:
              snapshot?.id ??
              null,

            createdAt:
              snapshot?.createdAt ??
              null,
          },

          brief: brief
            ? {
                id:
                  brief.id,

                websiteId:
                  brief.websiteId,

                topic:
                  brief.topic,

                primaryKeyword:
                  brief.primaryKeyword,

                outcomeActionId:
                  brief.outcomeActionId,

                outcomeAction:
                  brief.outcomeAction
                    ? {
                        id:
                          brief
                            .outcomeAction
                            .id,

                        decision:
                          brief
                            .outcomeAction
                            .decision,

                        status:
                          brief
                            .outcomeAction
                            .status,

                        targetPageUrl:
                          brief
                            .outcomeAction
                            .targetPageUrl,

                        contentArticleId:
                          brief
                            .outcomeAction
                            .contentArticleId,
                      }
                    : null,
              }
            : null,

          article,

          pageDecision,

          serpFeasibility,

          blueprint,

          governanceSignals: {
            readiness:
              blueprint
                ?.readiness ??
              null,

            blockers:
              blueprint
                ?.blockers ??
              null,

            reviews:
              blueprint
                ?.reviews ??
              null,

            action:
              blueprint
                ?.action ??
              pageDecision
                ?.type ??
              null,

            existingBriefId:
              pageDecision
                ?.existingBriefId ??
              null,

            requiresNoCompetingUrl:
              Array.isArray(
                serpFeasibility
                  ?.requirements
              )
                ? (
                    serpFeasibility
                      ?.requirements as unknown[]
                  ).includes(
                    "DO_NOT_CREATE_COMPETING_URL"
                  )
                : false,

            resolvedOutcomeTargetPageUrl:
              brief
                ?.outcomeAction
                ?.targetPageUrl ??
              null,
          },

          analyses,

          crawledPages:
            pages,

          publishedArticles,

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
      "BLUEPRINT_GOVERNANCE_FIXED_INSPECT_ERROR",
      error
    );

    process.exitCode =
      1;
  }
);
