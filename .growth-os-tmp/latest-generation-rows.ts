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
    const rows =
      await prisma.contentArticle.findMany({
        where: {
          briefId:
            BRIEF_ID,
        },

        select: {
          id:
            true,

          status:
            true,

          title:
            true,

          h1:
            true,

          generatedBy:
            true,

          publishError:
            true,

          publishedUrl:
            true,

          publishedAt:
            true,

          createdAt:
            true,
        },

        orderBy: {
          createdAt:
            "desc",
        },

        take:
          5,
      });

    console.log(
      JSON.stringify(
        rows,
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
