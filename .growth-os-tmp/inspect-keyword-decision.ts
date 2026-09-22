import {
  loadEnvConfig,
} from "@next/env";

loadEnvConfig(
  "/Users/user/growth-os"
);

const BRIEF_ID =
  "cmua8hzql0000qkqljokjs1il";

function record(
  value: unknown
): Record<
  string,
  unknown
> | null {
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

  return value as Record<
    string,
    unknown
  >;
}

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

        select: {
          id:
            true,

          topic:
            true,

          primaryKeyword:
            true,

          searchIntent:
            true,

          status:
            true,

          evidenceSnapshot: {
            select: {
              plannerVersion:
                true,

              plan:
                true,
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
      record(
        brief
          .evidenceSnapshot
          ?.plan
      );

    const strategy =
      record(
        plan?.strategy
      );

    const decision =
      record(
        strategy
          ?.decisionIntelligence
      );

    const blueprint =
      record(
        plan
          ?.searchBlueprintShadow
      );

    console.log(
      "BRIEF=" +
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
          },
          null,
          2
        )
    );

    console.log();
    console.log(
      "DECISION_INTELLIGENCE="
    );

    console.log(
      JSON.stringify(
        decision,
        null,
        2
      )
    );

    console.log();
    console.log(
      "SEARCH_BLUEPRINT="
    );

    console.log(
      JSON.stringify(
        blueprint,
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
      "INSPECT_ERROR",
      error
    );

    process.exitCode =
      1;
  }
);
