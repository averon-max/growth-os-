import {
  prisma,
} from "@/lib/prisma";

import {
  inspectMasterRuntimeSnapshot,
} from "@/lib/content/master-runtime-adapter";

import {
  buildQueryGroupOutcomeSeriesV1,
  type QueryGroupObservedSignalV1,
} from "./outcome-query-groups";

import {
  buildQueryOutcomeDiagnosisV1,
} from "./outcome-query-diagnosis";

import {
  buildQueryOutcomeCheckpointFromGraphV1,
  type ObservedGscQueryRowV1,
  type QueryOutcomeSectionV1,
} from "./outcome-query-graph-adapter";

import type {
  OutcomeCheckpoint,
} from "./outcome-service";


export const ARTICLE_QUERY_OUTCOME_SERIES_VERSION =
  "ARTICLE_QUERY_OUTCOME_SERIES_V1" as const;


export interface QueryOutcomeCheckpointRowsV1 {
  checkpoint:
    OutcomeCheckpoint;

  gscSnapshotDate:
    string;

  rows:
    readonly Readonly<
      ObservedGscQueryRowV1
    >[];
}


function numberOrNull(
  value:
    unknown
): number | null {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return null;
  }

  const result =
    Number(
      value
    );

  return Number.isFinite(
    result
  )
    ? result
    : null;
}


function urlVariants(
  raw:
    string
): readonly string[] {
  try {
    const parsed =
      new URL(
        raw
      );

    parsed.hash =
      "";

    const exact =
      parsed.toString();

    const withoutSlash =
      exact.endsWith("/")
        ? exact.slice(
            0,
            -1
          )
        : exact;

    return Object.freeze(
      Array.from(
        new Set([
          exact,
          withoutSlash,
          `${withoutSlash}/`,
        ])
      )
    );
  } catch {
    return Object.freeze([
      raw,
    ]);
  }
}


function postActionCheckpoint(
  value:
    string
): OutcomeCheckpoint | null {
  switch (
    value
  ) {
    case "DAY_7":
    case "DAY_14":
    case "DAY_28":
    case "DAY_60":
    case "DAY_90":
      return value;

    default:
      return null;
  }
}


export function buildQueryOutcomeSeriesFromCheckpointRowsV1({
  queryGraph,
  sections,
  checkpoints,
}: {
  queryGraph:
    Parameters<
      typeof buildQueryOutcomeCheckpointFromGraphV1
    >[0]["queryGraph"];

  sections:
    readonly Readonly<
      QueryOutcomeSectionV1
    >[];

  checkpoints:
    readonly Readonly<
      QueryOutcomeCheckpointRowsV1
    >[];
}) {
  const mappedSignals:
    QueryGroupObservedSignalV1[] =
      [];

  const checkpointResults =
    checkpoints.map(
      (
        checkpoint
      ) => {
        const result =
          buildQueryOutcomeCheckpointFromGraphV1({
            checkpoint:
              checkpoint.checkpoint,

            queryGraph,

            sections,

            rows:
              checkpoint.rows,
          });

        mappedSignals.push(
          ...result.mappedSignals
        );

        return Object.freeze({
          checkpoint:
            checkpoint.checkpoint,

          gscSnapshotDate:
            checkpoint
              .gscSnapshotDate,

          mappedQueryCount:
            result.mappedQueryCount,

          unmappedQueryCount:
            result.unmappedQueryCount,

          unmappedQueries:
            result.unmappedQueries,

          ambiguousSectionQueryNodeIds:
            result
              .ambiguousSectionQueryNodeIds,

          outcome:
            result.outcome,
        });
      }
    );


  const series =
    buildQueryGroupOutcomeSeriesV1(
      mappedSignals
    );


  return Object.freeze({
    version:
      ARTICLE_QUERY_OUTCOME_SERIES_VERSION,

    checkpoints:
      Object.freeze(
        checkpointResults
      ),

    series,

    diagnosis:
      buildQueryOutcomeDiagnosisV1(
        series
      ),

    provenance:
      Object.freeze({
        checkpointDateSource:
          "KEYWORD_OUTCOME_OBSERVATION_GSC_SNAPSHOT_DATE" as const,

        queryMetricsSource:
          "KEYWORD_SNAPSHOT_GOOGLE_SEARCH_CONSOLE" as const,

        queryGraphSource:
          "CONTENT_EVIDENCE_SNAPSHOT_MASTER_RUNTIME" as const,

        pageScope:
          "PUBLISHED_ARTICLE_URL" as const,

        exactSnapshotDateOnly:
          true as const,

        rollingWindowUsed:
          false as const,

        fuzzyMatching:
          false as const,

        semanticInference:
          false as const,

        inventedQueryNodeIds:
          false as const,

        inventedSectionIds:
          false as const,
      }),
  });
}


export async function buildArticleQueryOutcomeSeriesV1({
  briefId,
  publishedUrl,
}: {
  briefId:
    string;

  publishedUrl:
    string | null;
}) {
  if (
    !publishedUrl
  ) {
    return Object.freeze({
      version:
        ARTICLE_QUERY_OUTCOME_SERIES_VERSION,

      status:
        "NOT_PUBLISHED" as const,

      reason:
        "ARTICLE_PUBLISHED_URL_REQUIRED",

      result:
        null,
    });
  }


  const brief =
    await prisma.contentBrief.findUnique({
      where: {
        id:
          briefId,
      },

      select: {
        outcomeActionId:
          true,

        evidenceSnapshot: {
          select: {
            plan:
              true,
          },
        },

        website: {
          select: {
            business: {
              select: {
                workspaceId:
                  true,
              },
            },
          },
        },
      },
    });


  if (
    !brief
  ) {
    return Object.freeze({
      version:
        ARTICLE_QUERY_OUTCOME_SERIES_VERSION,

      status:
        "UNAVAILABLE" as const,

      reason:
        "CONTENT_BRIEF_NOT_FOUND",

      result:
        null,
    });
  }


  if (
    !brief.outcomeActionId
  ) {
    return Object.freeze({
      version:
        ARTICLE_QUERY_OUTCOME_SERIES_VERSION,

      status:
        "UNAVAILABLE" as const,

      reason:
        "OUTCOME_ACTION_NOT_LINKED",

      result:
        null,
    });
  }


  const runtimeInspection =
    inspectMasterRuntimeSnapshot(
      brief
        .evidenceSnapshot
        ?.plan ??
      null
    );


  if (
    runtimeInspection.readiness !==
      "READY" ||
    !runtimeInspection.runtime
  ) {
    return Object.freeze({
      version:
        ARTICLE_QUERY_OUTCOME_SERIES_VERSION,

      status:
        "UNAVAILABLE" as const,

      reason:
        "MASTER_RUNTIME_NOT_AVAILABLE",

      result:
        null,

      blockers:
        runtimeInspection.blockers,
    });
  }


  const runtime =
    runtimeInspection.runtime;


  const observations =
    await prisma
      .keywordOutcomeObservation
      .findMany({
        where: {
          actionId:
            brief.outcomeActionId,
        },

        orderBy: {
          observedAt:
            "asc",
        },

        select: {
          checkpoint:
            true,

          gscSnapshotDate:
            true,
        },
      });


  const variants =
    urlVariants(
      publishedUrl
    );

  const checkpoints:
    QueryOutcomeCheckpointRowsV1[] =
      [];

  const skipped:
    Array<{
      checkpoint:
        string;

      reason:
        string;
    }> =
      [];


  for (
    const observation
    of observations
  ) {
    const checkpoint =
      postActionCheckpoint(
        observation.checkpoint
      );

    if (
      !checkpoint
    ) {
      continue;
    }


    if (
      !observation
        .gscSnapshotDate
    ) {
      skipped.push({
        checkpoint,

        reason:
          "GSC_SNAPSHOT_DATE_MISSING",
      });

      continue;
    }


    /*
     * Exact historical checkpoint date only.
     *
     * No rolling 7/28-day window.
     * No replacement with latest data.
     */
    const snapshots =
      await prisma
        .keywordSnapshot
        .findMany({
          where: {
            date:
              observation
                .gscSnapshotDate,

            source:
              "GOOGLE_SEARCH_CONSOLE",

            pageUrl: {
              in:
                [...variants],
            },

            keyword: {
              workspaceId:
                brief
                  .website
                  .business
                  .workspaceId,
            },
          },

          select: {
            impressions:
              true,

            clicks:
              true,

            ctr:
              true,

            position:
              true,

            pageUrl:
              true,

            keyword: {
              select: {
                text:
                  true,
              },
            },
          },
        });


    if (
      snapshots.length ===
      0
    ) {
      skipped.push({
        checkpoint,

        reason:
          "NO_PAGE_LEVEL_GSC_ROWS_ON_CHECKPOINT_DATE",
      });

      continue;
    }


    checkpoints.push({
      checkpoint,

      gscSnapshotDate:
        observation
          .gscSnapshotDate
          .toISOString()
          .slice(
            0,
            10
          ),

      rows:
        snapshots.map(
          (
            snapshot
          ) => ({
            query:
              snapshot
                .keyword
                .text,

            pageUrl:
              snapshot.pageUrl,

            impressions:
              snapshot
                .impressions,

            clicks:
              snapshot.clicks,

            ctr:
              numberOrNull(
                snapshot.ctr
              ),

            position:
              numberOrNull(
                snapshot.position
              ),
          })
        ),
    });
  }


  const sections:
    QueryOutcomeSectionV1[] =
      runtime
        .sectionBlueprints
        .sections
        .map(
          (
            section
          ) => ({
            heading:
              section.heading,

            queryNodeIds:
              section
                .queryNodeIds,
          })
        );


  return Object.freeze({
    version:
      ARTICLE_QUERY_OUTCOME_SERIES_VERSION,

    status:
      "READY" as const,

    reason:
      null,

    skippedCheckpoints:
      Object.freeze(
        skipped
      ),

    result:
      buildQueryOutcomeSeriesFromCheckpointRowsV1({
        queryGraph:
          runtime.queryGraph,

        sections,

        checkpoints,
      }),
  });
}
