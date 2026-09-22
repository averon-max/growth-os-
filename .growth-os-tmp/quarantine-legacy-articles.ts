import {
  loadEnvConfig,
} from "@next/env";

loadEnvConfig(
  "/Users/user/growth-os"
);

const IDS = [
  "cmu27mr610041amql1mm74eah",
  "cmu8zd1it0007mpql4hxse56z",
];

async function main() {
  const {
    prisma,
  } = await import(
    "/Users/user/growth-os/src/lib/prisma"
  );

  try {
    const before =
      await prisma.contentArticle.findMany({
        where: {
          id: {
            in:
              IDS,
          },
        },

        select: {
          id:
            true,

          status:
            true,

          title:
            true,

          publishError:
            true,

          brief: {
            select: {
              topic:
                true,

              primaryKeyword:
                true,

              evidenceSnapshot: {
                select: {
                  plan:
                    true,
                },
              },
            },
          },
        },
      });

    console.log(
      "BEFORE="
    );

    console.log(
      JSON.stringify(
        before,
        null,
        2
      )
    );

    if (
      before.length !==
      IDS.length
    ) {
      throw new Error(
        `Expected ${IDS.length} articles, found ${before.length}`
      );
    }

    for (
      const article
      of before
    ) {
      const rawPlan =
        article
          .brief
          .evidenceSnapshot
          ?.plan;

      const plan =
        rawPlan &&
        typeof rawPlan ===
          "object" &&
        !Array.isArray(
          rawPlan
        )
          ? rawPlan as Record<
              string,
              unknown
            >
          : null;

      if (
        plan?.[
          "searchBlueprintShadow"
        ]
      ) {
        throw new Error(
          `Refusing to quarantine current Blueprint article ${article.id}`
        );
      }
    }

    await prisma.$transaction([
      prisma.contentArticle.update({
        where: {
          id:
            "cmu27mr610041amql1mm74eah",
        },

        data: {
          status:
            "REJECTED",

          publishError:
            "LEGACY_ARTICLE_REJECTED: Generated before Search Blueprint / current evidence governance and fails the current Content Gate due to unverified product claims.",
        },
      }),

      prisma.contentArticle.update({
        where: {
          id:
            "cmu8zd1it0007mpql4hxse56z",
        },

        data: {
          status:
            "REJECTED",

          publishError:
            "LEGACY_ARTICLE_REJECTED: Generated before Search Blueprint. Brief topic is 'what is credit monitoring' but legacy primary keyword was incorrectly selected as 'experian credit monitoring'.",
        },
      }),
    ]);

    const after =
      await prisma.contentArticle.findMany({
        where: {
          id: {
            in:
              IDS,
          },
        },

        select: {
          id:
            true,

          title:
            true,

          status:
            true,

          publishError:
            true,
        },

        orderBy: {
          id:
            "asc",
        },
      });

    console.log();
    console.log(
      "AFTER="
    );

    console.log(
      JSON.stringify(
        after,
        null,
        2
      )
    );

    const valid =
      after.length ===
        IDS.length &&
      after.every(
        (
          article
        ) =>
          article.status ===
          "REJECTED"
      );

    console.log();
    console.log(
      "QUARANTINE_VERIFIED=" +
        valid
    );

    if (!valid) {
      process.exitCode =
        1;
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
      "QUARANTINE_ERROR",
      error
    );

    process.exitCode =
      1;
  }
);
