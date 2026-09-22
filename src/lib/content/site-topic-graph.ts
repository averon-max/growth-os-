import {
  topicAffinity,
} from "@/lib/keywords/topic-authority";

import type {
  QueryIntent,
} from "./intent-boundary";


export type SiteContentCoverage =
  | "NONE"
  | "WEAK"
  | "STRONG";


export interface SitePageQuerySignal {
  query:
    string;

  impressions?:
    number | null;

  clicks?:
    number | null;

  position?:
    number | null;

  branded?:
    boolean | null;
}


export interface SitePageSignal {
  id:
    string;

  url:
    string;

  title?:
    string | null;

  h1?:
    string | null;

  cluster:
    string;

  topics:
    string[];

  primaryIntent:
    QueryIntent;

  indexed:
    boolean;

  queries:
    SitePageQuerySignal[];

  internalLinksIn?:
    number | null;

  internalLinksOut?:
    number | null;

  lastModifiedAt?:
    Date | null;

  contentCoverage?:
    SiteContentCoverage | null;

  serpFootprint?:
    number | null;
}


export interface SiteTopicQueryEvidence {
  query:
    string;

  impressions:
    number;

  clicks:
    number;

  bestPosition:
    number | null;

  branded:
    boolean | null;
}


export interface SiteTopicNode {
  id:
    string;

  websiteId:
    string;

  cluster:
    string;

  pageIds:
    readonly string[];

  urls:
    readonly string[];

  existingPages:
    number;

  indexedPages:
    number;

  gscQueries:
    readonly SiteTopicQueryEvidence[];

  queryBreadth:
    number;

  nonBrandImpressions:
    number;

  clicks:
    number;

  top3Queries:
    number;

  top10Queries:
    number;

  top20Queries:
    number;

  internalLinksIn:
    number | null;

  internalLinksOut:
    number | null;

  newestModifiedAt:
    Date | null;

  freshnessAgeDays:
    number | null;

  contentCoverage: {
    none:
      number;

    weak:
      number;

    strong:
      number;

    unknown:
      number;
  };

  serpFootprint:
    number | null;

  missionAffinity:
    number | null;

  evidence:
    readonly string[];
}


export interface SiteTopicGraph {
  version:
    "SITE_TOPIC_GRAPH_V1";

  websiteId:
    string;

  observedAt:
    Date;

  missionTopic:
    string | null;

  nodes:
    readonly SiteTopicNode[];

  pageCount:
    number;

  indexedPageCount:
    number;
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


function stableHash(
  value: string
): string {
  let hash =
    2166136261;

  for (
    let index =
      0;
    index <
      value.length;
    index +=
      1
  ) {
    hash ^=
      value.charCodeAt(
        index
      );

    hash =
      Math.imul(
        hash,
        16777619
      );
  }

  return (
    hash >>>
    0
  )
    .toString(
      36
    );
}


function finiteOrNull(
  value:
    number |
    null |
    undefined
): number | null {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(
      value
    )
  )
    ? value
    : null;
}


function sumKnown(
  values:
    Array<
      number |
      null |
      undefined
    >
): number | null {
  const known =
    values.filter(
      (
        value
      ): value is number =>
        typeof value ===
          "number" &&
        Number.isFinite(
          value
        )
    );

  if (
    known.length ===
    0
  ) {
    return null;
  }

  return known.reduce(
    (
      sum,
      value
    ) =>
      sum +
      value,
    0
  );
}


function daysBetween({
  later,
  earlier,
}: {
  later: Date;
  earlier: Date;
}): number {
  return Math.max(
    0,
    Math.floor(
      (
        later.getTime() -
        earlier.getTime()
      ) /
        86_400_000
    )
  );
}


function pageMissionAffinity({
  missionTopic,
  page,
}: {
  missionTopic: string;
  page: SitePageSignal;
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
          missionTopic,
          value
        )
    )
  );
}


interface MutableQueryEvidence {
  query:
    string;

  impressions:
    number;

  clicks:
    number;

  bestPosition:
    number | null;

  branded:
    boolean | null;
}


export function buildSiteTopicGraph({
  websiteId,
  pages,
  observedAt,
  missionTopic,
}: {
  websiteId: string;

  pages:
    SitePageSignal[];

  observedAt:
    Date;

  missionTopic?:
    string | null;
}): Readonly<SiteTopicGraph> {
  const cleanWebsiteId =
    websiteId.trim();

  if (
    !cleanWebsiteId
  ) {
    throw new Error(
      "SITE_TOPIC_GRAPH_WEBSITE_ID_REQUIRED"
    );
  }

  if (
    Number.isNaN(
      observedAt.getTime()
    )
  ) {
    throw new Error(
      "SITE_TOPIC_GRAPH_OBSERVED_AT_INVALID"
    );
  }

  const groups =
    new Map<
      string,
      SitePageSignal[]
    >();

  for (
    const page
    of pages
  ) {
    const cluster =
      page.cluster.trim();

    if (
      !cluster
    ) {
      throw new Error(
        "SITE_TOPIC_GRAPH_CLUSTER_REQUIRED"
      );
    }

    const key =
      normalize(
        cluster
      );

    const existing =
      groups.get(
        key
      ) ??
      [];

    existing.push(
      page
    );

    groups.set(
      key,
      existing
    );
  }

  const nodes:
    SiteTopicNode[] =
      [];

  for (
    const [
      clusterKey,
      clusterPages,
    ]
    of groups.entries()
  ) {
    const cluster =
      clusterPages[0]
        ?.cluster
        .trim() ??
      clusterKey;

    const queryMap =
      new Map<
        string,
        MutableQueryEvidence
      >();

    for (
      const page
      of clusterPages
    ) {
      for (
        const signal
        of page.queries
      ) {
        const query =
          signal.query.trim();

        if (
          !query
        ) {
          continue;
        }

        const key =
          normalize(
            query
          );

        const current =
          queryMap.get(
            key
          ) ?? {
            query,
            impressions:
              0,
            clicks:
              0,
            bestPosition:
              null,
            branded:
              signal.branded ??
              null,
          };

        current.impressions +=
          Math.max(
            0,
            finiteOrNull(
              signal.impressions
            ) ??
              0
          );

        current.clicks +=
          Math.max(
            0,
            finiteOrNull(
              signal.clicks
            ) ??
              0
          );

        const position =
          finiteOrNull(
            signal.position
          );

        if (
          position !==
            null &&
          position >
            0 &&
          (
            current.bestPosition ===
              null ||
            position <
              current.bestPosition
          )
        ) {
          current.bestPosition =
            position;
        }

        if (
          current.branded ===
            null &&
          signal.branded !==
            undefined
        ) {
          current.branded =
            signal.branded ??
            null;
        }

        queryMap.set(
          key,
          current
        );
      }
    }

    const queryEvidence =
      [
        ...queryMap.values(),
      ].sort(
        (
          left,
          right
        ) =>
          right.impressions -
            left.impressions ||
          right.clicks -
            left.clicks ||
          left.query.localeCompare(
            right.query
          )
      );

    const nonBrandImpressions =
      queryEvidence
        .filter(
          (item) =>
            item.branded ===
            false
        )
        .reduce(
          (
            sum,
            item
          ) =>
            sum +
            item.impressions,
          0
        );

    const clicks =
      queryEvidence.reduce(
        (
          sum,
          item
        ) =>
          sum +
          item.clicks,
        0
      );

    const top3 =
      queryEvidence.filter(
        (item) =>
          item.bestPosition !==
            null &&
          item.bestPosition <=
            3
      ).length;

    const top10 =
      queryEvidence.filter(
        (item) =>
          item.bestPosition !==
            null &&
          item.bestPosition <=
            10
      ).length;

    const top20 =
      queryEvidence.filter(
        (item) =>
          item.bestPosition !==
            null &&
          item.bestPosition <=
            20
      ).length;

    const modifiedDates =
      clusterPages
        .map(
          (page) =>
            page.lastModifiedAt
        )
        .filter(
          (
            value
          ): value is Date =>
            value instanceof
              Date &&
            !Number.isNaN(
              value.getTime()
            )
        );

    const newestModifiedAt =
      modifiedDates.length >
      0
        ? new Date(
            Math.max(
              ...modifiedDates.map(
                (value) =>
                  value.getTime()
              )
            )
          )
        : null;

    const coverage = {
      none:
        0,

      weak:
        0,

      strong:
        0,

      unknown:
        0,
    };

    for (
      const page
      of clusterPages
    ) {
      if (
        page.contentCoverage ===
        "NONE"
      ) {
        coverage.none +=
          1;
      } else if (
        page.contentCoverage ===
        "WEAK"
      ) {
        coverage.weak +=
          1;
      } else if (
        page.contentCoverage ===
        "STRONG"
      ) {
        coverage.strong +=
          1;
      } else {
        coverage.unknown +=
          1;
      }
    }

    const evidence =
      new Set<string>();

    if (
      clusterPages.some(
        (page) =>
          page.indexed
      )
    ) {
      evidence.add(
        "INDEXED_PAGES"
      );
    }

    if (
      queryEvidence.length >
      0
    ) {
      evidence.add(
        "GSC_QUERY_EVIDENCE"
      );
    }

    if (
      clusterPages.some(
        (page) =>
          page.internalLinksIn !==
            null &&
          page.internalLinksIn !==
            undefined
      )
    ) {
      evidence.add(
        "INTERNAL_LINKS_IN"
      );
    }

    if (
      clusterPages.some(
        (page) =>
          page.internalLinksOut !==
            null &&
          page.internalLinksOut !==
            undefined
      )
    ) {
      evidence.add(
        "INTERNAL_LINKS_OUT"
      );
    }

    if (
      newestModifiedAt
    ) {
      evidence.add(
        "FRESHNESS_TIMESTAMP"
      );
    }

    if (
      clusterPages.some(
        (page) =>
          page.serpFootprint !==
            null &&
          page.serpFootprint !==
            undefined
      )
    ) {
      evidence.add(
        "SERP_FOOTPRINT"
      );
    }

    const missionAffinity =
      missionTopic
        ? Math.max(
            ...clusterPages.map(
              (page) =>
                pageMissionAffinity({
                  missionTopic,
                  page,
                })
            )
          )
        : null;

    nodes.push({
      id:
        `topic_${stableHash(
          `${cleanWebsiteId}:${clusterKey}`
        )}`,

      websiteId:
        cleanWebsiteId,

      cluster,

      pageIds:
        Object.freeze(
          clusterPages.map(
            (page) =>
              page.id
          )
        ),

      urls:
        Object.freeze(
          clusterPages.map(
            (page) =>
              page.url
          )
        ),

      existingPages:
        clusterPages.length,

      indexedPages:
        clusterPages.filter(
          (page) =>
            page.indexed
        ).length,

      gscQueries:
        Object.freeze(
          queryEvidence.map(
            (item) =>
              Object.freeze({
                ...item,
              })
          )
        ),

      queryBreadth:
        queryEvidence.length,

      nonBrandImpressions,

      clicks,

      top3Queries:
        top3,

      top10Queries:
        top10,

      top20Queries:
        top20,

      internalLinksIn:
        sumKnown(
          clusterPages.map(
            (page) =>
              page.internalLinksIn
          )
        ),

      internalLinksOut:
        sumKnown(
          clusterPages.map(
            (page) =>
              page.internalLinksOut
          )
        ),

      newestModifiedAt,

      freshnessAgeDays:
        newestModifiedAt
          ? daysBetween({
              later:
                observedAt,

              earlier:
                newestModifiedAt,
            })
          : null,

      contentCoverage:
        Object.freeze(
          coverage
        ),

      serpFootprint:
        sumKnown(
          clusterPages.map(
            (page) =>
              page.serpFootprint
          )
        ),

      missionAffinity,

      evidence:
        Object.freeze([
          ...evidence,
        ]),
    });
  }

  nodes.sort(
    (
      left,
      right
    ) =>
      (
        right.missionAffinity ??
        -1
      ) -
        (
          left.missionAffinity ??
          -1
        ) ||
      right.nonBrandImpressions -
        left.nonBrandImpressions ||
      right.queryBreadth -
        left.queryBreadth ||
      left.cluster.localeCompare(
        right.cluster
      )
  );

  return Object.freeze({
    version:
      "SITE_TOPIC_GRAPH_V1" as const,

    websiteId:
      cleanWebsiteId,

    observedAt:
      new Date(
        observedAt
      ),

    missionTopic:
      missionTopic?.trim() ||
      null,

    nodes:
      Object.freeze(
        nodes
      ),

    pageCount:
      pages.length,

    indexedPageCount:
      pages.filter(
        (page) =>
          page.indexed
      ).length,
  });
}
