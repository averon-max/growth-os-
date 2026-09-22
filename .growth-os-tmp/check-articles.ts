import {
  loadEnvConfig,
} from "@next/env";

loadEnvConfig(
  "/Users/user/growth-os"
);

const WEBSITE_ID =
  "cmtjl7vdm00010eqlnt1xbkhd";

function wordCount(
  value: string
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

function countMatches(
  value: string,
  pattern: RegExp
): number {
  return (
    value.match(
      pattern
    ) ??
    []
  ).length;
}

function excerpt(
  value: string,
  max =
    420
): string {
  const clean =
    value
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  return clean.length >
    max
    ? clean.slice(
        0,
        max
      ) + "..."
    : clean;
}

async function main() {
  console.log(
    "DATABASE_URL_LOADED=" +
      Boolean(
        process.env
          .DATABASE_URL
      )
  );

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
        },
      });

    console.log(
      "WEBSITE=" +
        JSON.stringify(
          website
        )
    );

    const articles =
      await prisma.contentArticle.findMany({
        where: {
          brief: {
            websiteId:
              WEBSITE_ID,
          },
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

          brief: {
            select: {
              id:
                true,

              topic:
                true,

              primaryKeyword:
                true,

              secondaryKeywords:
                true,

              searchIntent:
                true,

              status:
                true,

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
          },
        },
      });

    console.log();
    console.log(
      `ARTICLE_COUNT=${articles.length}`
    );

    const statusCounts =
      new Map<
        string,
        number
      >();

    for (
      const article
      of articles
    ) {
      statusCounts.set(
        article.status,
        (
          statusCounts.get(
            article.status
          ) ??
          0
        ) +
          1
      );
    }

    console.log(
      "STATUS_COUNTS=" +
        JSON.stringify(
          Object.fromEntries(
            statusCounts
          )
        )
    );

    const generating =
      articles.filter(
        (
          article
        ) =>
          article.status ===
          "GENERATING"
      );

    console.log(
      `STUCK_GENERATING_COUNT=${generating.length}`
    );

    if (
      generating.length >
      0
    ) {
      console.log(
        "STUCK_GENERATING_IDS=" +
          JSON.stringify(
            generating.map(
              (
                article
              ) =>
                article.id
            )
          )
      );
    }

    console.log();
    console.log(
      "============================================================"
    );
    console.log(
      " ARTICLES"
    );
    console.log(
      "============================================================"
    );

    for (
      const [
        index,
        article,
      ] of articles.entries()
    ) {
      const body =
        article.bodyMarkdown ??
        "";

      const h1InBody =
        /^#\s+/m.test(
          body
        );

      const h2 =
        countMatches(
          body,
          /^##\s+/gm
        );

      const h3 =
        countMatches(
          body,
          /^###\s+/gm
        );

      const plan =
        article
          .brief
          .evidenceSnapshot
          ?.plan as
          | Record<
              string,
              unknown
            >
          | null
          | undefined;

      const blueprint =
        plan &&
        typeof plan ===
          "object"
          ? (
              plan[
                "searchBlueprintShadow"
              ] as
                | Record<
                    string,
                    unknown
                  >
                | undefined
            )
          : undefined;

      console.log();
      console.log(
        `ARTICLE_${index + 1}`
      );

      console.log(
        JSON.stringify(
          {
            id:
              article.id,

            briefId:
              article.briefId,

            topic:
              article
                .brief
                .topic,

            primaryKeyword:
              article
                .brief
                .primaryKeyword,

            searchIntent:
              article
                .brief
                .searchIntent,

            articleStatus:
              article.status,

            briefStatus:
              article
                .brief
                .status,

            generatedBy:
              article.generatedBy,

            snapshotGeneratorModel:
              article
                .brief
                .evidenceSnapshot
                ?.generatorModel ??
              null,

            plannerVersion:
              article
                .brief
                .evidenceSnapshot
                ?.plannerVersion ??
              null,

            gateVersion:
              article
                .brief
                .evidenceSnapshot
                ?.gateVersion ??
              null,

            blueprintReadiness:
              blueprint?.[
                "readiness"
              ] ??
              null,

            blueprintProductionPrimary:
              blueprint?.[
                "productionPrimary"
              ] ??
              null,

            blueprintRecommendedPrimary:
              blueprint?.[
                "recommendedPrimary"
              ] ??
              null,

            title:
              article.title,

            h1:
              article.h1,

            metaDescription:
              article
                .metaDescription,

            words:
              wordCount(
                body
              ),

            h2,

            h3,

            bodyContainsH1:
              h1InBody,

            secondaryKeywords:
              article
                .brief
                .secondaryKeywords,

            excerpt:
              excerpt(
                body
              ),
          },
          null,
          2
        )
      );
    }

    console.log();
    console.log(
      "============================================================"
    );
    console.log(
      " DUPLICATE / CANNIBALIZATION CHECK"
    );
    console.log(
      "============================================================"
    );

    const byPrimary =
      new Map<
        string,
        typeof articles
      >();

    for (
      const article
      of articles
    ) {
      const key =
        article
          .brief
          .primaryKeyword
          .trim()
          .toLowerCase();

      const existing =
        byPrimary.get(
          key
        ) ??
        [];

      existing.push(
        article
      );

      byPrimary.set(
        key,
        existing
      );
    }

    let duplicateGroups =
      0;

    for (
      const [
        keyword,
        group,
      ] of byPrimary
    ) {
      if (
        group.length <=
        1
      ) {
        continue;
      }

      duplicateGroups++;

      console.log(
        JSON.stringify(
          {
            primaryKeyword:
              keyword,

            articleCount:
              group.length,

            articles:
              group.map(
                (
                  article
                ) => ({
                  id:
                    article.id,

                  briefId:
                    article.briefId,

                  status:
                    article.status,

                  title:
                    article.title,
                })
              ),
          },
          null,
          2
        )
      );
    }

    if (
      duplicateGroups ===
      0
    ) {
      console.log(
        "DUPLICATE_PRIMARY_GROUPS=0"
      );
    } else {
      console.log(
        `DUPLICATE_PRIMARY_GROUPS=${duplicateGroups}`
      );
    }

    console.log();
    console.log(
      "============================================================"
    );
    console.log(
      " ARTICLE AUDIT SUMMARY"
    );
    console.log(
      "============================================================"
    );

    console.log(
      `TOTAL=${articles.length}`
    );

    console.log(
      `GENERATING=${generating.length}`
    );

    console.log(
      `DRAFT=${
        articles.filter(
          (
            article
          ) =>
            article.status ===
            "DRAFT"
        ).length
      }`
    );

    console.log(
      `REJECTED=${
        articles.filter(
          (
            article
          ) =>
            article.status ===
            "REJECTED"
        ).length
      }`
    );

    console.log(
      `PUBLISHED=${
        articles.filter(
          (
            article
          ) =>
            article.status ===
            "PUBLISHED"
        ).length
      }`
    );

    console.log(
      `BODY_H1_VIOLATIONS=${
        articles.filter(
          (
            article
          ) =>
            /^#\s+/m.test(
              article
                .bodyMarkdown ??
                ""
            )
        ).length
      }`
    );

    console.log(
      `DUPLICATE_PRIMARY_GROUPS=${duplicateGroups}`
    );

    console.log(
      "READ_ONLY_CHECK=YES"
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
      "ARTICLE_AUDIT_ERROR",
      error
    );

    process.exitCode =
      1;
  }
);
