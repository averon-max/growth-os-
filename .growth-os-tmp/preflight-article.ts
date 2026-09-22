import {
  loadEnvConfig,
} from "@next/env";

loadEnvConfig(
  "/Users/user/growth-os"
);

const BRIEF_ID =
  "cmuaajq730000qgqlg42je4jr";

async function main() {
  const {
    prisma,
  } = await import(
    "/Users/user/growth-os/src/lib/prisma"
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

            orderBy: {
              id:
                "asc",
            },
          },
        },
      });

    if (!brief) {
      console.log(
        "BRIEF_NOT_FOUND"
      );

      process.exitCode =
        2;

      return;
    }

    const plan =
      brief
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
      JSON.stringify(
        {
          id:
            brief.id,

          topic:
            brief.topic,

          primaryKeyword:
            brief.primaryKeyword,

          searchIntent:
            brief.searchIntent,

          status:
            brief.status,

          plannerVersion:
            brief
              .evidenceSnapshot
              ?.plannerVersion ??
            null,

          gateVersion:
            brief
              .evidenceSnapshot
              ?.gateVersion ??
            null,

          generatorModel:
            brief
              .evidenceSnapshot
              ?.generatorModel ??
            null,

          hasBlueprint:
            Boolean(
              blueprint
            ),

          blueprint:
            blueprint,

          existingArticleCount:
            brief
              .articles
              .length,

          articles:
            brief.articles,
        },
        null,
        2
      )
    );

    console.log();

    console.log(
      "SAFE_TO_ATTEMPT_GENERATION=" +
        (
          Boolean(
            blueprint
          ) &&
          brief
            .articles
            .length ===
            0
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
      "PREFLIGHT_ERROR",
      error
    );

    process.exitCode =
      1;
  }
);
