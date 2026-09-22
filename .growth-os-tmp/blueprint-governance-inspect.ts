import {
  loadEnvConfig,
} from "@next/env";

loadEnvConfig(
  "/Users/user/growth-os"
);

const BRIEF_ID =
  "cmuaajq730000qgqlg42je4jr";

const ARTICLE_ID =
  "cmuaanrih0000i2qllph4qxr9";

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
          plan:
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

        select: {
          id:
            true,

          topic:
            true,

          primaryKeyword:
            true,

          websiteId:
            true,
        },
      });

    const plan =
      (
        snapshot?.plan &&
        typeof snapshot.plan ===
          "object" &&
        !Array.isArray(
          snapshot.plan
        )
      )
        ? snapshot.plan as Record<
            string,
            unknown
          >
        : null;

    const blueprint =
      (
        plan?.searchBlueprintShadow &&
        typeof plan.searchBlueprintShadow ===
          "object" &&
        !Array.isArray(
          plan.searchBlueprintShadow
        )
      )
        ? plan.searchBlueprintShadow as Record<
            string,
            unknown
          >
        : null;

    const pages =
      brief
        ? await prisma.page.findMany({
            where: {
              websiteId:
                brief.websiteId,
            },

            select: {
              id:
                true,

              url:
                true,

              title:
                true,

              canonicalUrl:
                true,
            },

            orderBy: {
              createdAt:
                "asc",
            },

            take:
              100,
          })
        : [];

    console.log(
      JSON.stringify(
        {
          brief,

          article,

          blueprint,

          blueprintKeys:
            blueprint
              ? Object.keys(
                  blueprint
                )
              : [],

          websitePages:
            pages,

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
      "BLUEPRINT_GOVERNANCE_INSPECT_ERROR",
      error
    );

    process.exitCode =
      1;
  }
);
