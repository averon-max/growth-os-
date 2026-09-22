import {
  loadEnvConfig,
} from "@next/env";

loadEnvConfig(
  "/Users/user/growth-os"
);

const WEBSITE_ID =
  "cmtjl7vdm00010eqlnt1xbkhd";

async function main() {
  console.log(
    "ENV_DATABASE_URL_LOADED=" +
      Boolean(
        process.env.DATABASE_URL
      )
  );

  if (
    !process.env.DATABASE_URL
  ) {
    throw new Error(
      "DATABASE_URL was not loaded from project env"
    );
  }

  const {
    prisma,
  } = await import(
    "/Users/user/growth-os/src/lib/prisma"
  );

  try {
    const website =
      await prisma.website.findUnique({
        where: {
          id:
            WEBSITE_ID,
        },

        select: {
          id:
            true,

          url:
            true,

          business: {
            select: {
              name:
                true,

              industry:
                true,
            },
          },

          contentBriefs: {
            orderBy: {
              createdAt:
                "desc",
            },

            take:
              15,

            select: {
              id:
                true,

              topic:
                true,

              searchIntent:
                true,

              primaryKeyword:
                true,

              secondaryKeywords:
                true,

              status:
                true,

              createdAt:
                true,

              opportunityId:
                true,

              outcomeActionId:
                true,

              evidenceSnapshot: {
                select: {
                  id:
                    true,

                  plannerVersion:
                    true,

                  gateVersion:
                    true,

                  generatorModel:
                    true,

                  plan:
                    true,

                  createdAt:
                    true,
                },
              },

              articles: {
                orderBy: {
                  createdAt:
                    "desc",
                },

                take:
                  3,

                select: {
                  id:
                    true,

                  title:
                    true,

                  status:
                    true,

                  generatedBy:
                    true,

                  publishError:
                    true,

                  createdAt:
                    true,
                },
              },
            },
          },
        },
      });

    if (!website) {
      console.log(
        "WEBSITE_NOT_FOUND"
      );

      return;
    }

    console.log(
      "WEBSITE=" +
        JSON.stringify({
          id:
            website.id,

          url:
            website.url,

          business:
            website.business.name,

          industry:
            website.business.industry,
        })
    );

    console.log(
      "BRIEF_COUNT=" +
        website.contentBriefs.length
    );

    for (
      const [
        index,
        brief,
      ] of website
        .contentBriefs
        .entries()
    ) {
      const rawPlan =
        brief
          .evidenceSnapshot
          ?.plan as
            | {
                searchBlueprintShadow?: {
                  readiness?:
                    string;

                  decision?: {
                    action?:
                      string;

                    keywordDecisionStatus?:
                      string;

                    keywordDecisionConfidence?:
                      string;

                    serpFeasibility?:
                      string;

                    serpConfidence?:
                      string;

                    productionPrimaryKeyword?:
                      string;

                    recommendedPrimaryKeyword?:
                      string | null;

                    primaryChanged?:
                      boolean;
                  };

                  governance?: {
                    blockers?:
                      string[];

                    reviews?:
                      string[];
                  };

                  informationGain?: {
                    evidenceCandidates?:
                      string[];
                  };
                };
              }
            | null
            | undefined;

      const blueprint =
        rawPlan
          ?.searchBlueprintShadow;

      console.log();
      console.log(
        `=== BRIEF ${index + 1} ===`
      );

      console.log(
        JSON.stringify(
          {
            id:
              brief.id,

            topic:
              brief.topic,

            status:
              brief.status,

            searchIntent:
              brief.searchIntent,

            primaryKeyword:
              brief.primaryKeyword,

            secondaryKeywords:
              brief.secondaryKeywords,

            createdAt:
              brief.createdAt,

            opportunityId:
              brief.opportunityId,

            outcomeActionId:
              brief.outcomeActionId,

            evidenceSnapshot:
              Boolean(
                brief
                  .evidenceSnapshot
              ),

            plannerVersion:
              brief
                .evidenceSnapshot
                ?.plannerVersion ??
              null,

            blueprintReadiness:
              blueprint
                ?.readiness ??
              null,

            blueprintAction:
              blueprint
                ?.decision
                ?.action ??
              null,

            keywordDecision:
              blueprint
                ?.decision
                ?.keywordDecisionStatus ??
              null,

            keywordConfidence:
              blueprint
                ?.decision
                ?.keywordDecisionConfidence ??
              null,

            serpFeasibility:
              blueprint
                ?.decision
                ?.serpFeasibility ??
              null,

            serpConfidence:
              blueprint
                ?.decision
                ?.serpConfidence ??
              null,

            productionPrimary:
              blueprint
                ?.decision
                ?.productionPrimaryKeyword ??
              null,

            recommendedPrimary:
              blueprint
                ?.decision
                ?.recommendedPrimaryKeyword ??
              null,

            primaryChanged:
              blueprint
                ?.decision
                ?.primaryChanged ??
              null,

            blockers:
              blueprint
                ?.governance
                ?.blockers ??
              [],

            reviews:
              blueprint
                ?.governance
                ?.reviews ??
              [],

            informationGainCandidates:
              blueprint
                ?.informationGain
                ?.evidenceCandidates ??
              [],

            recentArticles:
              brief.articles,
          },
          null,
          2
        )
      );
    }

    const candidate =
      website.contentBriefs.find(
        (
          brief
        ) => {
          const latest =
            brief.articles[0];

          const rawPlan =
            brief
              .evidenceSnapshot
              ?.plan as
                | {
                    searchBlueprintShadow?: {
                      readiness?:
                        string;
                    };
                  }
                | null
                | undefined;

          const readiness =
            rawPlan
              ?.searchBlueprintShadow
              ?.readiness;

          return (
            Boolean(
              brief
                .evidenceSnapshot
            ) &&
            readiness !==
              "BLOCKED" &&
            (
              !latest ||
              latest.status ===
                "REJECTED"
            )
          );
        }
      );

    console.log();
    console.log(
      "============================================================"
    );

    if (!candidate) {
      console.log(
        "AUTO_CANDIDATE=NONE"
      );

      console.log(
        "SAFE_TO_PREPARE_REAL_RUN=NO"
      );
    } else {
      console.log(
        `AUTO_CANDIDATE=${candidate.id}`
      );

      console.log(
        `TOPIC=${candidate.topic}`
      );

      console.log(
        `PRIMARY=${candidate.primaryKeyword}`
      );

      console.log(
        `INTENT=${candidate.searchIntent}`
      );

      console.log(
        "SAFE_TO_PREPARE_REAL_RUN=YES"
      );
    }

    console.log(
      "============================================================"
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
      "INSPECTION_ERROR",
      error
    );

    process.exitCode =
      1;
  }
);
