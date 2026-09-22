import {
  loadEnvConfig,
} from "@next/env";

loadEnvConfig(
  "/Users/user/growth-os"
);

const WEBSITE_ID =
  "cmtjl7vdm00010eqlnt1xbkhd";

async function main() {
  const {
    prisma,
  } = await import(
    "/Users/user/growth-os/src/lib/prisma"
  );

  const {
    auditArticle,
  } = await import(
    "/Users/user/growth-os/src/lib/content/content-quality"
  );

  const {
    evaluateContentGate,
  } = await import(
    "/Users/user/growth-os/src/lib/content/content-gate"
  );

  const {
    getBusinessFactRegistryForWebsite,
  } = await import(
    "/Users/user/growth-os/src/lib/content/business-fact-repository"
  );

  try {
    const registry =
      await getBusinessFactRegistryForWebsite(
        WEBSITE_ID
      );

    console.log(
      "BUSINESS_FACT_REGISTRY=" +
        JSON.stringify(
          {
            version:
              registry.version,

            verifiedClaimCount:
              registry
                .verifiedClaims
                .length,

            verifiedClaims:
              registry
                .verifiedClaims,
          },
          null,
          2
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

        include: {
          brief: {
            include: {
              evidenceSnapshot:
                true,
            },
          },
        },

        orderBy: {
          id:
            "asc",
        },
      });

    console.log();
    console.log(
      `ARTICLE_COUNT=${articles.length}`
    );

    let passed =
      0;

    let blocked =
      0;

    let legacy =
      0;

    for (
      const [
        index,
        article,
      ] of articles.entries()
    ) {
      const generated = {
        title:
          article.title,

        metaDescription:
          article.metaDescription,

        h1:
          article.h1,

        bodyMarkdown:
          article.bodyMarkdown,
      };

      const audit =
        auditArticle({
          article:
            generated,

          primaryKeyword:
            article
              .brief
              .primaryKeyword,
        });

      const gate =
        evaluateContentGate({
          article:
            generated,

          primaryKeyword:
            article
              .brief
              .primaryKeyword,

          audit,

          registry,
        });

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

      const blueprint =
        plan?.[
          "searchBlueprintShadow"
        ];

      const hasBlueprint =
        Boolean(
          blueprint &&
          typeof blueprint ===
            "object"
        );

      if (
        hasBlueprint
      ) {
      } else {
        legacy++;
      }

      if (
        gate.pass
      ) {
        passed++;
      } else {
        blocked++;
      }

      console.log();
      console.log(
        "============================================================"
      );

      console.log(
        `ARTICLE_${index + 1}`
      );

      console.log(
        "============================================================"
      );

      console.log(
        JSON.stringify(
          {
            id:
              article.id,

            briefId:
              article.briefId,

            status:
              article.status,

            topic:
              article
                .brief
                .topic,

            primaryKeyword:
              article
                .brief
                .primaryKeyword,

            title:
              article.title,

            generatedBy:
              article.generatedBy,

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

            hasSearchBlueprint:
              hasBlueprint,

            quality: {
              score:
                audit.score,

              wordCount:
                audit.wordCount,

              h2Count:
                audit.h2Count,

              h3Count:
                audit.h3Count,

              primaryKeywordDensityPct:
                audit
                  .primaryKeywordDensityPct,

              issues:
                audit.issues,
            },

            contentGate: {
              pass:
                gate.pass,

              topicAlignment:
                gate
                  .topicAlignment,

              blockingIssues:
                gate
                  .blockingIssues,

              warnings:
                gate.warnings,

              claimFindings:
                gate
                  .claimFindings
                  .map(
                    (
                      finding
                    ) => ({
                      code:
                        finding.code,

                      sentence:
                        finding.sentence,

                      message:
                        finding.message,
                    })
                  ),
            },
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
      " CURRENT-GATE AUDIT SUMMARY"
    );
    console.log(
      "============================================================"
    );

    console.log(
      `TOTAL=${articles.length}`
    );

    console.log(
      `CURRENT_GATE_PASS=${passed}`
    );

    console.log(
      `CURRENT_GATE_BLOCKED=${blocked}`
    );

    console.log(
      `LEGACY_WITHOUT_BLUEPRINT=${legacy}`
    );

    console.log(
      `CURRENT_BLUEPRINT_ARTICLES=${
        articles.length -
        legacy
      }`
    );

    console.log(
      "DATABASE_MUTATED=NO"
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
      "ARTICLE_GATE_AUDIT_ERROR",
      error
    );

    process.exitCode =
      1;
  }
);
