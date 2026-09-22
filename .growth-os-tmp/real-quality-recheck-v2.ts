import {
  loadEnvConfig,
} from "@next/env";

loadEnvConfig(
  "/Users/user/growth-os"
);

const ARTICLE_ID =
  "cmuaanrih0000i2qllph4qxr9";

async function main() {
  const {
    prisma,
  } = await import(
    "/Users/user/growth-os/src/lib/prisma"
  );

  const {
    auditArticle,
    repairGeneratedArticle,
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
    const article =
      await prisma.contentArticle.findUnique({
        where: {
          id:
            ARTICLE_ID,
        },

        include: {
          brief:
            true,
        },
      });

    if (!article) {
      throw new Error(
        "ARTICLE_NOT_FOUND"
      );
    }

    const raw = {
      title:
        article.title,

      metaDescription:
        article.metaDescription,

      h1:
        article.h1,

      bodyMarkdown:
        article.bodyMarkdown,
    };

    const repaired =
      repairGeneratedArticle(
        raw
      );

    const before =
      auditArticle({
        article:
          raw,

        primaryKeyword:
          article.brief
            .primaryKeyword,
      });

    const after =
      auditArticle({
        article:
          repaired,

        primaryKeyword:
          article.brief
            .primaryKeyword,
      });

    const registry =
      await getBusinessFactRegistryForWebsite(
        article.brief.websiteId
      );

    const beforeGate =
      evaluateContentGate({
        article:
          raw,

        primaryKeyword:
          article.brief
            .primaryKeyword,

        audit:
          before,

        registry,
      });

    const afterGate =
      evaluateContentGate({
        article:
          repaired,

        primaryKeyword:
          article.brief
            .primaryKeyword,

        audit:
          after,

        registry,
      });

    console.log(
      JSON.stringify(
        {
          databaseMutated:
            false,

          raw: {
            containsAChanges:
              /\ba\s+changes\b/i.test(
                raw.bodyMarkdown
              ),

            score:
              before.score,

            issues:
              before.issues,

            gatePass:
              beforeGate.pass,

            blockingIssues:
              beforeGate.blockingIssues,
          },

          repaired: {
            containsAChanges:
              /\ba\s+changes\b/i.test(
                repaired.bodyMarkdown
              ),

            score:
              after.score,

            issues:
              after.issues,

            gatePass:
              afterGate.pass,

            blockingIssues:
              afterGate.blockingIssues,
          },
        },
        null,
        2
      )
    );

    if (
      !before.issues.includes(
        "BROKEN_ARTICLE_AGREEMENT"
      )
    ) {
      process.exitCode =
        2;
      return;
    }

    if (
      beforeGate.pass
    ) {
      process.exitCode =
        3;
      return;
    }

    if (
      /\ba\s+changes\b/i.test(
        repaired.bodyMarkdown
      )
    ) {
      process.exitCode =
        4;
      return;
    }

    if (
      after.issues.includes(
        "BROKEN_ARTICLE_AGREEMENT"
      )
    ) {
      process.exitCode =
        5;
      return;
    }

    console.log(
      "REAL_DEFECT_DETECTION=PASS"
    );

    console.log(
      "REAL_DEFECT_GATE_BLOCK=PASS"
    );

    console.log(
      "REAL_DEFECT_REPAIR=PASS"
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
      error
    );

    process.exitCode =
      1;
  }
);
