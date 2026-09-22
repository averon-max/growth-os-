import {
  loadEnvConfig,
} from "@next/env";

loadEnvConfig(
  "/Users/user/growth-os"
);

const ARTICLE_ID =
  "cmuaanrih0000i2qllph4qxr9";

function contexts(
  text:
    string,
  pattern:
    RegExp,
  radius =
    140
) {
  const output:
    {
      index:
        number;
      match:
        string;
      context:
        string;
    }[] =
    [];

  const flags =
    pattern.flags.includes(
      "g"
    )
      ? pattern.flags
      : pattern.flags +
        "g";

  const re =
    new RegExp(
      pattern.source,
      flags
    );

  for (
    const match
    of text.matchAll(
      re
    )
  ) {
    const index =
      match.index ??
      0;

    output.push({
      index,

      match:
        match[0],

      context:
        text.slice(
          Math.max(
            0,
            index -
              radius
          ),
          Math.min(
            text.length,
            index +
              match[0].length +
              radius
          )
        ),
    });
  }

  return output;
}

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

        select: {
          id:
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
        },
      });

    if (!article) {
      console.error(
        "ARTICLE_NOT_FOUND"
      );

      process.exitCode =
        1;

      return;
    }

    const text =
      [
        article.title,
        article.metaDescription,
        article.h1,
        article.bodyMarkdown,
      ].join(
        "\n"
      );

    console.log(
      JSON.stringify(
        {
          id:
            article.id,

          status:
            article.status,

          generatedBy:
            article.generatedBy,

          matches: {
            aChanges:
              contexts(
                text,
                /\ba changes\b/i
              ),

            aLoan:
              contexts(
                text,
                /\baloan\b/i
              ),

            creditorsFrom:
              contexts(
                text,
                /\bcreditorsfrom\b/i
              ),

            yourCredit:
              contexts(
                text,
                /\byourcredit\b/i
              ),
          },

          bodyLinesContainingChange:
            article.bodyMarkdown
              .split(
                "\n"
              )
              .map(
                (
                  line,
                  index
                ) => ({
                  line:
                    index +
                    1,

                  text:
                    line,
                })
              )
              .filter(
                (
                  item
                ) =>
                  /changes?/i.test(
                    item.text
                  )
              ),
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
      error
    );

    process.exitCode =
      1;
  }
);
