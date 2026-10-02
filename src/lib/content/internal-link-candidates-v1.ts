import {
  prisma,
} from "@/lib/prisma";


export interface InternalLinkCandidateV1 {
  readonly url:
    string;

  readonly title:
    string | null;

  readonly h1:
    string | null;

  readonly h2s:
    readonly string[];

  readonly canonical:
    string | null;

  readonly robots:
    string | null;

  readonly statusCode:
    number | null;

  readonly depth:
    number | null;

  readonly incomingLinks:
    number | null;
}


export async function getInternalLinkCandidatesForWebsiteV1(
  websiteId:
    string
): Promise<
  readonly Readonly<InternalLinkCandidateV1>[]
> {
  const analysis =
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
      },
    });


  if (!analysis) {
    return Object.freeze(
      []
    );
  }


  const pages =
    await prisma.page.findMany({
      where: {
        analysisId:
          analysis.id,

        statusCode: {
          gte:
            200,

          lt:
            400,
        },
      },

      select: {
        url:
          true,

        title:
          true,

        h1:
          true,

        h2s:
          true,

        canonical:
          true,

        robots:
          true,

        statusCode:
          true,

        depth:
          true,

        incomingLinks:
          true,
      },

      orderBy: [
        {
          depth:
            "asc",
        },
        {
          incomingLinks:
            "desc",
        },
        {
          createdAt:
            "asc",
        },
      ],
    });


  return Object.freeze(
    pages.map(
      (
        page
      ) =>
        Object.freeze({
          ...page,

          h2s:
            Object.freeze([
              ...page.h2s,
            ]),
        })
    )
  );
}
