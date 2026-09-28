import {
  prisma,
} from "@/lib/prisma";

import type {
  MasterArticleCannibalizationCandidateV1,
} from "./master-article-semantic-critics";


function clean(
  value:
    string | null | undefined
): string | null {
  const normalized =
    value
      ?.replace(
        /\s+/g,
        " "
      )
      .trim();

  return normalized ||
    null;
}


function isIndexableCrawlPage({
  statusCode,
  robots,
}: {
  statusCode:
    number | null;

  robots:
    string | null;
}): boolean {
  if (
    statusCode ===
      null ||
    statusCode <
      200 ||
    statusCode >=
      300
  ) {
    return false;
  }

  if (
    robots &&
    /\bnoindex\b/i.test(
      robots
    )
  ) {
    return false;
  }

  return true;
}


export async function buildCrawlCannibalizationCandidatesV1({
  websiteId,
  limit = 40,
}: {
  websiteId:
    string;

  limit?:
    number;
}): Promise<
  readonly Readonly<
    MasterArticleCannibalizationCandidateV1
  >[]
> {
  /*
   * CRAWL_CANNIBALIZATION_CONTEXT_V1
   *
   * This is REAL existing-site context from the most recent crawl.
   *
   * IMPORTANT:
   * - no invented GSC metrics
   * - no invented query overlap
   * - no invented intent classification
   * - unavailable metrics remain null
   *
   * The semantic critic may compare URL/title/H1/summary only.
   */

  const latestAnalysis =
    await prisma.analysis.findFirst({
      where: {
        websiteId,
      },

      orderBy: [
        {
          completedAt:
            "desc",
        },

        {
          createdAt:
            "desc",
        },
      ],

      select: {
        id:
          true,

        pages: {
          take:
            Math.max(
              1,
              Math.min(
                limit,
                100
              )
            ),

          orderBy: {
            depth:
              "asc",
          },

          select: {
            url:
              true,

            statusCode:
              true,

            title:
              true,

            metaDescription:
              true,

            h1:
              true,

            h2s:
              true,

            canonical:
              true,

            robots:
              true,

            wordCount:
              true,

            incomingLinks:
              true,
          },
        },
      },
    });


  if (!latestAnalysis) {
    return Object.freeze(
      []
    );
  }


  const seen =
    new Set<string>();


  const candidates =
    latestAnalysis.pages
      .filter(
        (
          page
        ) =>
          isIndexableCrawlPage({
            statusCode:
              page.statusCode,

            robots:
              page.robots,
          })
      )
      .filter(
        (
          page
        ) => {
          const key =
            page.url
              .trim()
              .toLowerCase();

          if (
            !key ||
            seen.has(
              key
            )
          ) {
            return false;
          }

          seen.add(
            key
          );

          return true;
        }
      )
      .map(
        (
          page
        ) => {
          const title =
            clean(
              page.title
            );

          const h1 =
            clean(
              page.h1
            );

          const description =
            clean(
              page.metaDescription
            );

          const headings =
            page.h2s
              .map(
                (
                  value
                ) =>
                  clean(
                    value
                  )
              )
              .filter(
                (
                  value
                ): value is string =>
                  Boolean(
                    value
                  )
              )
              .slice(
                0,
                6
              );


          const summaryParts =
            [
              title
                ? `Title: ${title}`
                : null,

              h1
                ? `H1: ${h1}`
                : null,

              description
                ? `Meta description: ${description}`
                : null,

              headings.length >
                0
                ? `Observed H2s: ${headings.join(" | ")}`
                : null,

              page.canonical
                ? `Canonical: ${page.canonical}`
                : null,

              page.wordCount !==
                null
                ? `Observed crawl word count: ${page.wordCount}`
                : null,

              page.incomingLinks !==
                null
                ? `Observed incoming internal links: ${page.incomingLinks}`
                : null,
            ]
              .filter(
                (
                  value
                ): value is string =>
                  Boolean(
                    value
                  )
              );


          return Object.freeze({
            id:
              page.url,

            url:
              page.url,

            title,

            h1,

            /*
             * We do NOT have page-level query ownership here.
             * Unknown stays unknown.
             */
            queryNodeIds:
              Object.freeze(
                []
              ),

            matchedQueries:
              Object.freeze(
                []
              ),

            intentMatch:
              null,

            queryOverlap:
              null,

            matchedImpressions:
              null,

            missionAffinity:
              null,

            summary:
              summaryParts.length >
                0
                ? summaryParts.join(
                    "\n"
                  )
                : null,
          });
        }
      );


  return Object.freeze(
    candidates
  );
}
