import {
  topicAffinity,
} from "@/lib/keywords/topic-authority";

import type {
  QueryGraph,
} from "./query-graph";

import type {
  SearchMission,
} from "./search-mission";

import type {
  QueryIntent,
} from "./intent-boundary";

import type {
  SitePageSignal,
} from "./site-topic-graph";


export type UrlOwnershipStatus =
  | "NO_OWNER"
  | "SINGLE_OWNER"
  | "MULTIPLE_OWNERS"
  | "INTENT_CONFLICT"
  | "UNCERTAIN";


export type CannibalizationStatus =
  | "NONE"
  | "POTENTIAL"
  | "CONFIRMED";


export type OwnershipActionHint =
  | "CREATE_CANDIDATE"
  | "UPDATE_CANDIDATE"
  | "MERGE_INVESTIGATION"
  | "REPOSITION_INVESTIGATION"
  | "REVIEW_EXISTING_PAGE";


export interface UrlOwnershipCandidate {
  pageId:
    string;

  url:
    string;

  intentMatch:
    boolean;

  missionAffinity:
    number;

  matchedQueries:
    readonly string[];

  queryOverlap:
    number;

  matchedImpressions:
    number;

  evidence:
    readonly string[];
}


export interface UrlOwnershipResult {
  version:
    "URL_OWNERSHIP_V1";

  missionId:
    string;

  status:
    UrlOwnershipStatus;

  cannibalization:
    CannibalizationStatus;

  actionHint:
    OwnershipActionHint;

  primaryOwnerUrl:
    string | null;

  candidates:
    readonly UrlOwnershipCandidate[];

  targetQueries:
    readonly string[];

  evidence:
    readonly string[];
}


function normalize(
  value: string
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /[^\p{L}\p{N}]+/gu,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}


function pageAffinity({
  mission,
  page,
}: {
  mission:
    Readonly<SearchMission>;

  page:
    SitePageSignal;
}): number {
  const values = [
    page.cluster,
    page.title ?? "",
    page.h1 ?? "",
    ...page.topics,
  ].filter(
    Boolean
  );

  if (
    values.length ===
    0
  ) {
    return 0;
  }

  return Math.max(
    ...values.map(
      (value) =>
        topicAffinity(
          mission.topic,
          value
        )
    )
  );
}


function targetMissionQueries(
  graph:
    Readonly<QueryGraph>
): string[] {
  const allowed =
    new Set(
      graph.samePageNodeIds
    );

  return graph.nodes
    .filter(
      (node) =>
        allowed.has(
          node.id
        )
    )
    .map(
      (node) =>
        node.query
    );
}


function intersection(
  left:
    readonly string[],

  right:
    readonly string[]
): string[] {
  const rightSet =
    new Set(
      right.map(
        normalize
      )
    );

  return left.filter(
    (item) =>
      rightSet.has(
        normalize(
          item
        )
      )
  );
}


export function evaluateUrlOwnership({
  mission,
  missionIntent,
  queryGraph,
  pages,
}: {
  mission:
    Readonly<SearchMission>;

  missionIntent:
    QueryIntent;

  queryGraph:
    Readonly<QueryGraph>;

  pages:
    SitePageSignal[];
}): Readonly<UrlOwnershipResult> {
  if (
    queryGraph.missionId !==
    mission.id
  ) {
    throw new Error(
      "URL_OWNERSHIP_MISSION_GRAPH_MISMATCH"
    );
  }

  const targetQueries =
    targetMissionQueries(
      queryGraph
    );

  const targetQuerySet =
    new Set(
      targetQueries.map(
        normalize
      )
    );

  const denominator =
    Math.max(
      1,
      targetQuerySet.size
    );

  const candidates:
    UrlOwnershipCandidate[] =
      pages
        .filter(
          (page) =>
            page.indexed
        )
        .map(
          (page) => {
            const matchedSignals =
              page.queries.filter(
                (signal) =>
                  targetQuerySet.has(
                    normalize(
                      signal.query
                    )
                  )
              );

            const uniqueQueries = [
              ...new Set(
                matchedSignals.map(
                  (signal) =>
                    normalize(
                      signal.query
                    )
                )
              ),
            ];

            const matchedQueries =
              uniqueQueries.map(
                (normalized) =>
                  targetQueries.find(
                    (query) =>
                      normalize(
                        query
                      ) ===
                      normalized
                  ) ??
                  normalized
              );

            const matchedImpressions =
              matchedSignals.reduce(
                (
                  sum,
                  signal
                ) =>
                  sum +
                  Math.max(
                    0,
                    signal.impressions ??
                      0
                  ),
                0
              );

            const affinity =
              pageAffinity({
                mission,
                page,
              });

            const intentMatch =
              page.primaryIntent ===
              missionIntent;

            const evidence =
              new Set<string>();

            if (
              matchedQueries.length >
              0
            ) {
              evidence.add(
                "GSC_QUERY_OVERLAP"
              );
            }

            if (
              matchedImpressions >
              0
            ) {
              evidence.add(
                "GSC_IMPRESSIONS"
              );
            }

            if (
              intentMatch
            ) {
              evidence.add(
                "INTENT_MATCH"
              );
            }

            if (
              affinity >=
              0.6
            ) {
              evidence.add(
                "TOPIC_ALIGNMENT"
              );
            }

            return Object.freeze({
              pageId:
                page.id,

              url:
                page.url,

              intentMatch,

              missionAffinity:
                affinity,

              matchedQueries:
                Object.freeze(
                  matchedQueries
                ),

              queryOverlap:
                Number(
                  (
                    matchedQueries.length /
                    denominator
                  ).toFixed(
                    4
                  )
                ),

              matchedImpressions,

              evidence:
                Object.freeze([
                  ...evidence,
                ]),
            });
          }
        )
        .sort(
          (
            left,
            right
          ) =>
            right.queryOverlap -
              left.queryOverlap ||
            right.matchedImpressions -
              left.matchedImpressions ||
            right.missionAffinity -
              left.missionAffinity ||
            left.url.localeCompare(
              right.url
            )
        );

  const strongOwners =
    candidates.filter(
      (candidate) =>
        candidate.intentMatch &&
        candidate.matchedQueries.length >
          0
    );

  if (
    strongOwners.length >=
    2
  ) {
    let sharedQuery =
      false;

    for (
      let leftIndex =
        0;
      leftIndex <
        strongOwners.length;
      leftIndex +=
        1
    ) {
      for (
        let rightIndex =
          leftIndex +
          1;
        rightIndex <
          strongOwners.length;
        rightIndex +=
          1
      ) {
        const left =
          strongOwners[
            leftIndex
          ];

        const right =
          strongOwners[
            rightIndex
          ];

        if (
          left &&
          right &&
          intersection(
            left.matchedQueries,
            right.matchedQueries
          ).length >
            0
        ) {
          sharedQuery =
            true;
        }
      }
    }

    return Object.freeze({
      version:
        "URL_OWNERSHIP_V1" as const,

      missionId:
        mission.id,

      status:
        "MULTIPLE_OWNERS" as const,

      cannibalization:
        sharedQuery
          ? "CONFIRMED" as const
          : "POTENTIAL" as const,

      actionHint:
        "MERGE_INVESTIGATION" as const,

      primaryOwnerUrl:
        strongOwners[0]
          ?.url ??
        null,

      candidates:
        Object.freeze(
          candidates
        ),

      targetQueries:
        Object.freeze(
          targetQueries
        ),

      evidence:
        Object.freeze([
          "MULTIPLE_INTENT_MATCHED_URLS",
          sharedQuery
            ? "SHARED_GSC_QUERY_OWNERSHIP"
            : "MULTIPLE_MISSION_OWNERS",
        ]),
    });
  }

  if (
    strongOwners.length ===
    1
  ) {
    const owner =
      strongOwners[0];

    return Object.freeze({
      version:
        "URL_OWNERSHIP_V1" as const,

      missionId:
        mission.id,

      status:
        "SINGLE_OWNER" as const,

      cannibalization:
        "NONE" as const,

      actionHint:
        "UPDATE_CANDIDATE" as const,

      primaryOwnerUrl:
        owner?.url ??
        null,

      candidates:
        Object.freeze(
          candidates
        ),

      targetQueries:
        Object.freeze(
          targetQueries
        ),

      evidence:
        Object.freeze([
          "SINGLE_GSC_QUERY_OWNER",
          "INTENT_MATCH",
        ]),
    });
  }

  const intentConflicts =
    candidates.filter(
      (candidate) =>
        !candidate.intentMatch &&
        candidate.matchedQueries.length >
          0
    );

  if (
    intentConflicts.length >
    0
  ) {
    return Object.freeze({
      version:
        "URL_OWNERSHIP_V1" as const,

      missionId:
        mission.id,

      status:
        "INTENT_CONFLICT" as const,

      cannibalization:
        intentConflicts.length >
          1
          ? "POTENTIAL" as const
          : "NONE" as const,

      actionHint:
        "REPOSITION_INVESTIGATION" as const,

      primaryOwnerUrl:
        null,

      candidates:
        Object.freeze(
          candidates
        ),

      targetQueries:
        Object.freeze(
          targetQueries
        ),

      evidence:
        Object.freeze([
          "GSC_QUERY_OWNER_HAS_DIFFERENT_INTENT",
        ]),
    });
  }

  const topicalCandidates =
    candidates.filter(
      (candidate) =>
        candidate.intentMatch &&
        candidate.missionAffinity >=
          0.6
    );

  if (
    topicalCandidates.length >
    0
  ) {
    return Object.freeze({
      version:
        "URL_OWNERSHIP_V1" as const,

      missionId:
        mission.id,

      status:
        "UNCERTAIN" as const,

      cannibalization:
        topicalCandidates.length >
          1
          ? "POTENTIAL" as const
          : "NONE" as const,

      actionHint:
        "REVIEW_EXISTING_PAGE" as const,

      primaryOwnerUrl:
        null,

      candidates:
        Object.freeze(
          candidates
        ),

      targetQueries:
        Object.freeze(
          targetQueries
        ),

      evidence:
        Object.freeze([
          "TOPICAL_PAGE_EXISTS",
          "NO_DIRECT_GSC_QUERY_OWNERSHIP",
          "DO_NOT_INVENT_URL_OWNER",
        ]),
    });
  }

  return Object.freeze({
    version:
      "URL_OWNERSHIP_V1" as const,

    missionId:
      mission.id,

    status:
      "NO_OWNER" as const,

    cannibalization:
      "NONE" as const,

    actionHint:
      "CREATE_CANDIDATE" as const,

    primaryOwnerUrl:
      null,

    candidates:
      Object.freeze(
        candidates
      ),

    targetQueries:
      Object.freeze(
        targetQueries
      ),

    evidence:
      Object.freeze([
        "NO_EXISTING_MISSION_OWNER_FOUND",
      ]),
  });
}
