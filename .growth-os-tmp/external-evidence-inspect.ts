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
    const snapshot =
      await prisma.contentEvidenceSnapshot.findUnique({
        where: {
          briefId:
            BRIEF_ID,
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

          plannerVersion:
            true,

          gateVersion:
            true,

          generatorModel:
            true,

          plan:
            true,

          businessFacts:
            true,

          keywordContext:
            true,

          createdAt:
            true,
        },
      });

    if (!snapshot) {
      console.log(
        "SNAPSHOT_NOT_FOUND"
      );

      process.exitCode =
        2;

      return;
    }

    const plan =
      snapshot.plan as Record<
        string,
        unknown
      >;

    const serpSnapshot =
      plan.serpSnapshot;

    const searchFeatures =
      plan.searchFeatures;

    console.log(
      JSON.stringify(
        {
          id:
            snapshot.id,

          topic:
            snapshot.topic,

          primaryKeyword:
            snapshot.primaryKeyword,

          searchIntent:
            snapshot.searchIntent,

          plannerVersion:
            snapshot.plannerVersion,

          gateVersion:
            snapshot.gateVersion,

          generatorModel:
            snapshot.generatorModel,

          createdAt:
            snapshot.createdAt,

          planKeys:
            Object.keys(
              plan
            ),

          serpSnapshot,

          searchFeatures,

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
      "EXTERNAL_EVIDENCE_INSPECT_ERROR",
      error
    );

    process.exitCode =
      1;
  }
);
