import {
  loadEnvConfig,
} from "@next/env";

loadEnvConfig(
  "/Users/user/growth-os"
);

const WEBSITE_ID =
  "cmtjl7vdm00010eqlnt1xbkhd";

const TOPIC =
  "what is credit monitoring";

const REQUIRED_PRIMARY =
  "what is credit monitoring";

type BlueprintShape = {
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
    status?:
      string;

    evidenceCandidates?:
      string[];
  };
};

function blueprintFromPlan(
  plan:
    unknown
): BlueprintShape | null {
  if (
    !plan ||
    typeof plan !==
      "object" ||
    Array.isArray(
      plan
    )
  ) {
    return null;
  }

  const candidate =
    (
      plan as {
        searchBlueprintShadow?:
          unknown;
      }
    )
      .searchBlueprintShadow;

  if (
    !candidate ||
    typeof candidate !==
      "object" ||
    Array.isArray(
      candidate
    )
  ) {
    return null;
  }

  return candidate as
    BlueprintShape;
}

async function main() {
  console.log(
    "DATABASE_URL_LOADED=" +
      Boolean(
        process.env
          .DATABASE_URL
      )
  );

  console.log(
    "GEMINI_KEY_LOADED=" +
      Boolean(
        process.env
          .GEMINI_API_KEY
      )
  );

  if (
    !process.env.DATABASE_URL
  ) {
    throw new Error(
      "DATABASE_URL_NOT_LOADED"
    );
  }

  const [
    prismaModule,
    serviceModule,
    generatorModule,
  ] =
    await Promise.all([
      import(
        "/Users/user/growth-os/src/lib/prisma"
      ),

      import(
        "/Users/user/growth-os/src/lib/content/service"
      ),

      import(
        "/Users/user/growth-os/src/lib/content/gemini-generator"
      ),
    ]);

  const {
    prisma,
  } =
    prismaModule;

  const {
    createContentBrief,
  } =
    serviceModule;

  const {
    geminiGenerator,
  } =
    generatorModule;

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
            where: {
              topic:
                TOPIC,
            },

            orderBy: {
              createdAt:
                "desc",
            },

            take:
              10,

            select: {
              id:
                true,

              topic:
                true,

              primaryKeyword:
                true,

              searchIntent:
                true,

              createdAt:
                true,

              evidenceSnapshot: {
                select: {
                  plan:
                    true,

                  plannerVersion:
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
      throw new Error(
        "WEBSITE_NOT_FOUND"
      );
    }

    let selected:
      {
        id:
          string;

        topic:
          string;

        primaryKeyword:
          string;

        searchIntent:
          string;

        evidenceSnapshot:
          {
            plan:
              unknown;

            plannerVersion:
              string;

            createdAt:
              Date;
          } | null;
      } | null =
        null;

    let mode =
      "CREATE";

    for (
      const existing
      of website
        .contentBriefs
    ) {
      const blueprint =
        blueprintFromPlan(
          existing
            .evidenceSnapshot
            ?.plan
        );

      if (
        blueprint &&
        blueprint.readiness !==
          "BLOCKED"
      ) {
        selected =
          existing;

        mode =
          "REUSE";

        break;
      }
    }

    if (!selected) {
      console.log(
        "NO_CURRENT_BLUEPRINT_BRIEF_FOUND"
      );

      console.log(
        "CREATING_FRESH_BRIEF=YES"
      );

      const created =
        await createContentBrief(
          geminiGenerator,
          {
            websiteId:
              website.id,

            topic:
              TOPIC,

            reason:
              "Create or improve the strongest single page for the informational search intent while avoiding cannibalization and using current Search Blueprint evidence.",

            recommendation:
              "Use Growth OS search intelligence, SERP evidence, verified business facts, information-gain requirements, and the current content governance pipeline.",

            businessName:
              website
                .business
                .name,

            websiteUrl:
              website.url,

            requiredPrimaryKeyword:
              REQUIRED_PRIMARY,
          }
        );

      selected =
        await prisma.contentBrief.findUnique({
          where: {
            id:
              created.id,
          },

          select: {
            id:
              true,

            topic:
              true,

            primaryKeyword:
              true,

            searchIntent:
              true,

            evidenceSnapshot: {
              select: {
                plan:
                  true,

                plannerVersion:
                  true,

                createdAt:
                  true,
              },
            },
          },
        });

      mode =
        "CREATED";
    }

    if (!selected) {
      throw new Error(
        "BRIEF_NOT_AVAILABLE_AFTER_CREATION"
      );
    }

    const plan =
      selected
        .evidenceSnapshot
        ?.plan;

    const blueprint =
      blueprintFromPlan(
        plan
      );

    console.log();
    console.log(
      "============================================================"
    );

    console.log(
      `MODE=${mode}`
    );

    console.log(
      `CURRENT_BRIEF_ID=${selected.id}`
    );

    console.log(
      `TOPIC=${selected.topic}`
    );

    console.log(
      `PRIMARY=${selected.primaryKeyword}`
    );

    console.log(
      `INTENT=${selected.searchIntent}`
    );

    console.log(
      `PLANNER_VERSION=${selected.evidenceSnapshot?.plannerVersion ?? "NONE"}`
    );

    console.log(
      `SEARCH_BLUEPRINT_PRESENT=${Boolean(
        blueprint
      )}`
    );

    console.log(
      `BLUEPRINT_READINESS=${blueprint?.readiness ?? "NONE"}`
    );

    console.log(
      `PAGE_ACTION=${blueprint?.decision?.action ?? "NONE"}`
    );

    console.log(
      `KEYWORD_DECISION=${blueprint?.decision?.keywordDecisionStatus ?? "NONE"}`
    );

    console.log(
      `KEYWORD_CONFIDENCE=${blueprint?.decision?.keywordDecisionConfidence ?? "NONE"}`
    );

    console.log(
      `SERP_FEASIBILITY=${blueprint?.decision?.serpFeasibility ?? "NONE"}`
    );

    console.log(
      `SERP_CONFIDENCE=${blueprint?.decision?.serpConfidence ?? "NONE"}`
    );

    console.log(
      `PRODUCTION_PRIMARY=${blueprint?.decision?.productionPrimaryKeyword ?? "NONE"}`
    );

    console.log(
      `RECOMMENDED_PRIMARY=${blueprint?.decision?.recommendedPrimaryKeyword ?? "NONE"}`
    );

    console.log(
      `PRIMARY_CHANGED=${blueprint?.decision?.primaryChanged ?? "NONE"}`
    );

    console.log(
      "BLOCKERS=" +
        JSON.stringify(
          blueprint
            ?.governance
            ?.blockers ??
          []
        )
    );

    console.log(
      "REVIEWS=" +
        JSON.stringify(
          blueprint
            ?.governance
            ?.reviews ??
          []
        )
    );

    console.log(
      "INFORMATION_GAIN=" +
        JSON.stringify(
          blueprint
            ?.informationGain
            ?.evidenceCandidates ??
          []
        )
    );

    if (
      !blueprint
    ) {
      console.log(
        "SAFE_FOR_FULL_PIPELINE=NO"
      );

      process.exitCode =
        2;

      return;
    }

    if (
      blueprint.readiness ===
      "BLOCKED"
    ) {
      console.log(
        "SAFE_FOR_FULL_PIPELINE=NO"
      );

      console.log(
        "REASON=SEARCH_BLUEPRINT_BLOCKED"
      );

      process.exitCode =
        3;

      return;
    }

    if (
      selected
        .primaryKeyword !==
      REQUIRED_PRIMARY
    ) {
      console.log(
        "SAFE_FOR_FULL_PIPELINE=NO"
      );

      console.log(
        "REASON=PRIMARY_KEYWORD_CONTRACT_MISMATCH"
      );

      process.exitCode =
        4;

      return;
    }

    console.log(
      "SAFE_FOR_FULL_PIPELINE=YES"
    );

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
      "CURRENT_BRIEF_ERROR",
      error
    );

    process.exitCode =
      1;
  }
);
