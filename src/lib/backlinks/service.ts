import {
  createHash,
} from "node:crypto";

import type {
  Prisma,
} from "@prisma/client";

import {
  prisma,
} from "@/lib/prisma";

import {
  backlinkIdentityKey,
  deriveBacklinkStateV1,
  normalizeBacklinkUrl,
} from "./backlink-state";

import {
  fetchDataForSEOBacklinks,
  type DataForSEOBacklinkObservation,
} from "./dataforseo-backlink-provider";


export class BacklinkServiceError
  extends Error {
  constructor(
    message:
      string
  ) {
    super(message);

    this.name =
      "BacklinkServiceError";
  }
}


function snapshotFingerprint({
  targetId,
  capturedAt,
  executionStatus,
  links,
  errorMessage =
    null,
}: {
  targetId:
    string;

  capturedAt:
    Date;

  executionStatus:
    "SUCCEEDED" |
    "PARTIAL" |
    "FAILED";

  links:
    readonly Readonly<DataForSEOBacklinkObservation>[];

  errorMessage?:
    string | null;
}) {
  const canonicalLinks =
    links
      .map(
        (
          link
        ) => ({
          key:
            backlinkIdentityKey({
              sourceUrl:
                link.sourceUrl,

              targetUrl:
                link.targetUrl,
            }),

          anchorText:
            link.anchorText,

          nofollow:
            link.nofollow,

          sponsored:
            link.sponsored,

          ugc:
            link.ugc,

          firstSeen:
            link
              .providerFirstSeenAt
              ?.toISOString() ??
            null,

          lastSeen:
            link
              .providerLastSeenAt
              ?.toISOString() ??
            null,
        })
      )
      .sort(
        (
          a,
          b
        ) =>
          a.key.localeCompare(
            b.key
          )
      );


  return createHash(
    "sha256"
  )
    .update(
      JSON.stringify({
        version:
          "BACKLINK_SNAPSHOT_FINGERPRINT_V1",

        targetId,

        capturedAt:
          capturedAt
            .toISOString(),

        executionStatus,

        links:
          canonicalLinks,

        errorMessage,
      })
    )
    .digest(
      "hex"
    );
}


async function getOrCreatePublishedTarget(
  contentArticleId:
    string
) {
  const article =
    await prisma
      .contentArticle
      .findUnique({
        where: {
          id:
            contentArticleId,
        },

        include: {
          brief: {
            select: {
              websiteId:
                true,
            },
          },
        },
      });


  if (
    !article
  ) {
    throw new BacklinkServiceError(
      "BACKLINK_ARTICLE_NOT_FOUND"
    );
  }


  if (
    article.status !==
      "PUBLISHED" ||
    !article.publishedUrl
      ?.trim()
  ) {
    throw new BacklinkServiceError(
      "BACKLINK_ARTICLE_NOT_PUBLISHED"
    );
  }


  const normalizedPublishedUrl =
    normalizeBacklinkUrl(
      article.publishedUrl
    );


  const existing =
    await prisma
      .backlinkTarget
      .findUnique({
        where: {
          contentArticleId:
            article.id,
        },
      });


  if (
    existing
  ) {
    if (
      existing
        .normalizedPublishedUrl !==
      normalizedPublishedUrl
    ) {
      throw new BacklinkServiceError(
        "BACKLINK_TARGET_URL_CHANGED_REQUIRES_REVIEW"
      );
    }


    return existing;
  }


  return prisma
    .backlinkTarget
    .create({
      data: {
        websiteId:
          article
            .brief
            .websiteId,

        contentArticleId:
          article.id,

        publishedUrl:
          article
            .publishedUrl,

        normalizedPublishedUrl,
      },
    });
}


function observationData(
  link:
    Readonly<DataForSEOBacklinkObservation>
) {
  return {
    sourceUrl:
      link.sourceUrl,

    normalizedSourceUrl:
      normalizeBacklinkUrl(
        link.sourceUrl
      ),

    sourceDomain:
      link.sourceDomain,

    targetUrl:
      link.targetUrl,

    normalizedTargetUrl:
      normalizeBacklinkUrl(
        link.targetUrl
      ),

    anchorText:
      link.anchorText,

    nofollow:
      link.nofollow,

    sponsored:
      link.sponsored,

    ugc:
      link.ugc,

    providerFirstSeenAt:
      link.providerFirstSeenAt,

    providerLastSeenAt:
      link.providerLastSeenAt,

    providerRef:
      link.providerRef,

    providerData:
      link.providerData as
        Prisma.InputJsonValue,
  };
}


export async function getArticleBacklinkState(
  contentArticleId:
    string
) {
  const target =
    await prisma
      .backlinkTarget
      .findUnique({
        where: {
          contentArticleId,
        },
      });


  if (
    !target
  ) {
    return null;
  }


  const latestScan =
    await prisma
      .backlinkSnapshot
      .findFirst({
        where: {
          targetId:
            target.id,
        },

        orderBy: {
          capturedAt:
            "desc",
        },

        select: {
          id:
            true,

          executionStatus:
            true,

          capturedAt:
            true,

          providerTotalCount:
            true,

          itemsFetched:
            true,

          scanComplete:
            true,

          errorMessage:
            true,
        },
      });


  /*
   * ONLY complete successful snapshots may participate
   * in NEW / ACTIVE / LOST / RESTORED inference.
   *
   * PARTIAL and FAILED scans remain audit artifacts only.
   */
  const snapshots =
    await prisma
      .backlinkSnapshot
      .findMany({
        where: {
          targetId:
            target.id,

          executionStatus:
            "SUCCEEDED",

          scanComplete:
            true,
        },

        orderBy: {
          capturedAt:
            "asc",
        },

        include: {
          observations:
            true,
        },
      });


  if (
    snapshots.length ===
    0
  ) {
    return {
      target: {
        id:
          target.id,

        publishedUrl:
          target.publishedUrl,
      },

      latestScan,

      lifecycle:
        null,

      current: {
        observedBacklinks:
          0,

        referringDomains:
          0,

        capturedAt:
          null,
      },
    };
  }


  const current =
    snapshots[
      snapshots.length -
      1
    ]!;


  const previous =
    snapshots.length >
      1
      ? snapshots[
          snapshots.length -
          2
        ]!
      : null;


  const historic =
    previous
      ? snapshots.slice(
          0,
          -2
        )
      : [];


  const historicalKeys =
    historic.flatMap(
      (
        snapshot
      ) =>
        snapshot
          .observations
          .map(
            (
              observation
            ) =>
              backlinkIdentityKey({
                sourceUrl:
                  observation
                    .normalizedSourceUrl,

                targetUrl:
                  observation
                    .normalizedTargetUrl,
              })
          )
    );


  const lifecycle =
    deriveBacklinkStateV1({
      previous:
        previous
          ? {
              executionStatus:
                "SUCCEEDED",

              links:
                previous
                  .observations
                  .map(
                    (
                      observation
                    ) => ({
                      sourceUrl:
                        observation
                          .sourceUrl,

                      targetUrl:
                        observation
                          .targetUrl,

                      anchorText:
                        observation
                          .anchorText,
                    })
                  ),
            }
          : null,

      current: {
        executionStatus:
          "SUCCEEDED",

        links:
          current
            .observations
            .map(
              (
                observation
              ) => ({
                sourceUrl:
                  observation
                    .sourceUrl,

                targetUrl:
                  observation
                    .targetUrl,

                anchorText:
                  observation
                    .anchorText,
              })
            ),
      },

      historicallySeenKeys:
        historicalKeys,
    });


  const details =
    new Map(
      [
        ...(
          previous
            ?.observations ??
          []
        ),

        ...current
          .observations,
      ].map(
        (
          observation
        ) => [
          backlinkIdentityKey({
            sourceUrl:
              observation
                .normalizedSourceUrl,

            targetUrl:
              observation
                .normalizedTargetUrl,
          }),

          observation,
        ] as const
      )
    );


  const lifecycleLinks =
    lifecycle
      .links
      .map(
        (
          link
        ) => {
          const detail =
            details.get(
              link.key
            );


          return {
            ...link,

            sourceDomain:
              detail
                ?.sourceDomain ??
              new URL(
                link.sourceUrl
              ).hostname,

            nofollow:
              detail
                ?.nofollow ??
              null,

            sponsored:
              detail
                ?.sponsored ??
              null,

            ugc:
              detail
                ?.ugc ??
              null,

            providerFirstSeenAt:
              detail
                ?.providerFirstSeenAt ??
              null,

            providerLastSeenAt:
              detail
                ?.providerLastSeenAt ??
              null,

            providerData:
              detail
                ?.providerData ??
              null,
          };
        }
      );


  const referringDomains =
    new Set(
      current
        .observations
        .map(
          (
            observation
          ) =>
            observation
              .sourceDomain
              .toLowerCase()
        )
    ).size;


  return {
    target: {
      id:
        target.id,

      publishedUrl:
        target.publishedUrl,
    },

    latestScan,

    lifecycle: {
      ...lifecycle,

      links:
        lifecycleLinks,
    },

    current: {
      observedBacklinks:
        current
          .observations
          .length,

      referringDomains,

      capturedAt:
        current
          .capturedAt,
    },
  };
}


export async function scanPublishedArticleBacklinks({
  contentArticleId,
  maxPages =
    3,
}: {
  contentArticleId:
    string;

  maxPages?:
    number;
}) {
  const target =
    await getOrCreatePublishedTarget(
      contentArticleId
    );


  const capturedAt =
    new Date();


  try {
    const scan =
      await fetchDataForSEOBacklinks({
        targetUrl:
          target
            .publishedUrl,

        maxPages,
      });


    const executionStatus =
      scan.complete
        ? "SUCCEEDED" as const
        : "PARTIAL" as const;


    const snapshot =
      await prisma
        .$transaction(
          async (
            tx
          ) => {
            return tx
              .backlinkSnapshot
              .create({
                data: {
                  targetId:
                    target.id,

                  source:
                    "DATAFORSEO",

                  executionStatus,

                  capturedAt,

                  snapshotFingerprint:
                    snapshotFingerprint({
                      targetId:
                        target.id,

                      capturedAt,

                      executionStatus,

                      links:
                        scan.links,
                    }),

                  providerTotalCount:
                    scan
                      .totalCount,

                  itemsFetched:
                    scan
                      .itemsFetched,

                  scanComplete:
                    scan
                      .complete,

                  observations: {
                    create:
                      scan
                        .links
                        .map(
                          observationData
                        ),
                  },
                },
              });
          }
        );


    return {
      snapshot: {
        id:
          snapshot.id,

        executionStatus:
          snapshot
            .executionStatus,

        capturedAt:
          snapshot
            .capturedAt,

        providerTotalCount:
          scan
            .totalCount,

        itemsFetched:
          scan
            .itemsFetched,

        pagesFetched:
          scan
            .pagesFetched,

        complete:
          scan
            .complete,

        apiCostUsd:
          scan
            .apiCostUsd,
      },

      lifecycleUpdated:
        scan.complete,

      state:
        await getArticleBacklinkState(
          contentArticleId
        ),
    };
  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);


    await prisma
      .backlinkSnapshot
      .create({
        data: {
          targetId:
            target.id,

          source:
            "DATAFORSEO",

          executionStatus:
            "FAILED",

          capturedAt,

          snapshotFingerprint:
            snapshotFingerprint({
              targetId:
                target.id,

              capturedAt,

              executionStatus:
                "FAILED",

              links:
                [],

              errorMessage:
                message,
            }),

          providerTotalCount:
            null,

          itemsFetched:
            0,

          scanComplete:
            false,

          errorMessage:
            message.slice(
              0,
              1000
            ),
        },
      });


    throw error;
  }
}
