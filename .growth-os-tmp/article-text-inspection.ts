import {
  loadEnvConfig,
} from "@next/env";

loadEnvConfig(
  "/Users/user/growth-os"
);

const ARTICLE_ID =
  "cmuaanrih0000i2qllph4qxr9";

const suspiciousPatterns = [
  /\ba changes\b/gi,
  /\bcollectorreports\b/gi,
  /\bpayingfor\b/gi,
  /\balertsacross\b/gi,
  /\ballowingyou\b/gi,
  /\bservices\.Removing\b/g,
  /\baccessingyour\b/gi,
];

async function main() {
  const {
    prisma,
  } = await import(
    "/Users/user/growth-os/src/lib/prisma"
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
      console.log(
        "ARTICLE_NOT_FOUND"
      );

      process.exitCode =
        1;

      return;
    }

    const body =
      article.bodyMarkdown;

    console.log(
      "ARTICLE_ID=" +
        article.id
    );

    console.log(
      "STATUS=" +
        article.status
    );

    console.log(
      "PRIMARY=" +
        article
          .brief
          .primaryKeyword
    );

    console.log();

    for (
      const pattern
      of suspiciousPatterns
    ) {
      const matches =
        body.match(
          pattern
        ) ?? [];

      console.log(
        `${pattern} => ${matches.length}`
      );
    }

    console.log();
    console.log(
      "=== EXACT PRIMARY BODY ==="
    );

    console.log(
      body
        .toLowerCase()
        .includes(
          article
            .brief
            .primaryKeyword
            .toLowerCase()
        )
    );

    console.log();
    console.log(
      "=== SENTENCES WITH NUMBERS / LEGAL / GUARANTEE-LIKE LANGUAGE ==="
    );

    const sentences =
      body
        .replace(
          /\n+/g,
          " "
        )
        .split(
          /(?<=[.!?])\s+/
        )
        .map(
          (
            sentence
          ) =>
            sentence.trim()
        )
        .filter(
          Boolean
        );

    const risky =
      sentences.filter(
        (
          sentence
        ) =>
          /\$|\b\d+\b|FCRA|federal law|permissible purpose|prevents|immediate alert|daily|simultaneously|identity theft|fraud|credit freeze/i.test(
            sentence
          )
      );

    for (
      const sentence
      of risky
    ) {
      console.log(
        "- " +
          sentence
      );
    }

    console.log();
    console.log(
      `RISKY_SENTENCE_COUNT=${risky.length}`
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
      "ARTICLE_TEXT_INSPECTION_ERROR",
      error
    );

    process.exitCode =
      1;
  }
);
