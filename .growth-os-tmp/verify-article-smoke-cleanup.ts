import {
  loadEnvConfig,
} from "@next/env";

loadEnvConfig(
  "/Users/user/growth-os"
);

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
          generatedBy: {
            in: [
              "pipeline-smoke-healthy-v1",
              "pipeline-smoke-transient-v1",
            ],
          },
        },

        select: {
          id:
            true,

          status:
            true,

          generatedBy:
            true,
        },
      });

    console.log(
      JSON.stringify(
        rows,
        null,
        2
      )
    );

    if (
      rows.length !==
      0
    ) {
      process.exitCode =
        1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
