import type {
  SearchMission,
} from "./search-mission";

import {
  evaluateIntentBoundary,
  lexicalQueryOverlap,
  type IntentBoundaryDecision,
  type QueryIntent,
} from "./intent-boundary";


export type QuerySource =
  | "DATAFORSEO"
  | "GSC"
  | "GOOGLE_TRENDS"
  | "PAA"
  | "RELATED_SEARCH"
  | "SERP_HEADING"
  | "SERP_QUESTION"
  | "EXISTING_PAGE"
  | "COMPETITOR_QUERY"
  | "AI_MODE"
  | "AI_OVERVIEW"
  | "MANUAL";


export type QuerySiteCoverage =
  | "NONE"
  | "WEAK"
  | "STRONG";


export type QueryEdgeRelationship =
  | "SAME_MISSION"
  | "SUBTOPIC"
  | "COMPARISON"
  | "FOLLOW_UP"
  | "ALTERNATIVE_INTENT"
  | "OVERLAP"
  | "CANNIBALIZATION_RISK";


export interface QueryNode {
  id:
    string;

  missionId:
    string;

  query:
    string;

  normalizedQuery:
    string;

  intent:
    QueryIntent;

  subIntent:
    string;

  cluster:
    string;

  searchVolume?:
    number;

  cpc?:
    number;

  trendMomentum?:
    number;

  gscImpressions?:
    number;

  gscClicks?:
    number;

  gscPosition?:
    number;

  competitorFrequency?:
    number;

  serpFrequency?:
    number;

  siteCoverage:
    QuerySiteCoverage;

  sourceConfidence:
    number;
}


export interface QueryEdge {
  fromId:
    string;

  toId:
    string;

  relationship:
    QueryEdgeRelationship;

  confidence:
    number;
}


export interface QuerySignalInput {
  query:
    string;

  intent:
    QueryIntent;

  subIntent:
    string;

  cluster:
    string;

  siteCoverage:
    QuerySiteCoverage;

  source:
    QuerySource;

  sourceConfidence:
    number;

  searchVolume?:
    number;

  cpc?:
    number;

  trendMomentum?:
    number;

  gscImpressions?:
    number;

  gscClicks?:
    number;

  gscPosition?:
    number;

  competitorFrequency?:
    number;

  serpFrequency?:
    number;

  existingOwnerUrls?:
    string[];

  missionOverlap?:
    number;

  queryOverlap?:
    number;

  serpUrlOverlap?:
    number;

  serpPageTypeOverlap?:
    number;

  sameMissionEvidence?:
    boolean;
}


export interface QueryNodeProvenance {
  nodeId:
    string;

  sources:
    readonly QuerySource[];
}


export interface QueryBoundaryRecord {
  nodeId:
    string;

  decision:
    IntentBoundaryDecision;

  primaryEligible:
    boolean;

  confidence:
    number;

  provisional:
    boolean;

  ownershipStatus:
    string;

  reasons:
    readonly string[];
}


export interface QueryGraph {
  version:
    "QUERY_GRAPH_V1";

  missionId:
    string;

  missionVersion:
    number;

  missionIntent:
    QueryIntent;

  nodes:
    readonly QueryNode[];

  edges:
    readonly QueryEdge[];

  boundaries:
    readonly QueryBoundaryRecord[];

  provenance:
    readonly QueryNodeProvenance[];

  samePageNodeIds:
    readonly string[];

  separatePageNodeIds:
    readonly string[];

  clusterNodeIds:
    readonly string[];

  mergeNodeIds:
    readonly string[];

  uncertainNodeIds:
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


function nodeId({
  missionId,
  normalizedQuery,
}: {
  missionId: string;
  normalizedQuery: string;
}): string {
  return (
    "query_" +
    stableHash(
      `${missionId}:${normalizedQuery}`
    )
  );
}


function clamp01(
  value: number
): number {
  return Math.max(
    0,
    Math.min(
      1,
      value
    )
  );
}


function numberOrUndefined(
  value:
    number |
    undefined
): number | undefined {
  return (
    Number.isFinite(
      value
    )
      ? value
      : undefined
  );
}


function pickMetric(
  current: {
    value?:
      number;

    confidence:
      number;
  },

  incoming: {
    value?:
      number;

    confidence:
      number;
  }
): {
  value?:
    number;

  confidence:
    number;
} {
  if (
    incoming.value ===
    undefined
  ) {
    return current;
  }

  if (
    current.value ===
      undefined ||
    incoming.confidence >
      current.confidence
  ) {
    return incoming;
  }

  return current;
}


interface Aggregate {
  query:
    string;

  normalizedQuery:
    string;

  intent:
    QueryIntent;

  subIntent:
    string;

  cluster:
    string;

  siteCoverage:
    QuerySiteCoverage;

  sourceConfidence:
    number;

  sources:
    Set<QuerySource>;

  searchVolume: {
    value?: number;
    confidence: number;
  };

  cpc: {
    value?: number;
    confidence: number;
  };

  trendMomentum: {
    value?: number;
    confidence: number;
  };

  gscImpressions: {
    value?: number;
    confidence: number;
  };

  gscClicks: {
    value?: number;
    confidence: number;
  };

  gscPosition: {
    value?: number;
    confidence: number;
  };

  competitorFrequency: {
    value?: number;
    confidence: number;
  };

  serpFrequency: {
    value?: number;
    confidence: number;
  };

  existingOwnerUrls:
    Set<string>;

  missionOverlap?:
    number;

  queryOverlap?:
    number;

  serpUrlOverlap?:
    number;

  serpPageTypeOverlap?:
    number;

  sameMissionEvidence?:
    boolean;
}


function validateSignal(
  signal:
    QuerySignalInput
): void {
  if (
    normalize(
      signal.query
    ).length ===
    0
  ) {
    throw new Error(
      "QUERY_GRAPH_QUERY_REQUIRED"
    );
  }

  if (
    signal.subIntent
      .trim()
      .length ===
      0
  ) {
    throw new Error(
      "QUERY_GRAPH_SUB_INTENT_REQUIRED"
    );
  }

  if (
    signal.cluster
      .trim()
      .length ===
      0
  ) {
    throw new Error(
      "QUERY_GRAPH_CLUSTER_REQUIRED"
    );
  }

  if (
    !Number.isFinite(
      signal.sourceConfidence
    ) ||
    signal.sourceConfidence <
      0 ||
    signal.sourceConfidence >
      1
  ) {
    throw new Error(
      "QUERY_GRAPH_SOURCE_CONFIDENCE_INVALID"
    );
  }
}


function createAggregate(
  signal:
    QuerySignalInput
): Aggregate {
  const confidence =
    signal.sourceConfidence;

  return {
    query:
      signal.query.trim(),

    normalizedQuery:
      normalize(
        signal.query
      ),

    intent:
      signal.intent,

    subIntent:
      signal.subIntent.trim(),

    cluster:
      signal.cluster.trim(),

    siteCoverage:
      signal.siteCoverage,

    sourceConfidence:
      confidence,

    sources:
      new Set([
        signal.source,
      ]),

    searchVolume: {
      value:
        numberOrUndefined(
          signal.searchVolume
        ),

      confidence,
    },

    cpc: {
      value:
        numberOrUndefined(
          signal.cpc
        ),

      confidence,
    },

    trendMomentum: {
      value:
        numberOrUndefined(
          signal.trendMomentum
        ),

      confidence,
    },

    gscImpressions: {
      value:
        numberOrUndefined(
          signal.gscImpressions
        ),

      confidence,
    },

    gscClicks: {
      value:
        numberOrUndefined(
          signal.gscClicks
        ),

      confidence,
    },

    gscPosition: {
      value:
        numberOrUndefined(
          signal.gscPosition
        ),

      confidence,
    },

    competitorFrequency: {
      value:
        numberOrUndefined(
          signal.competitorFrequency
        ),

      confidence,
    },

    serpFrequency: {
      value:
        numberOrUndefined(
          signal.serpFrequency
        ),

      confidence,
    },

    existingOwnerUrls:
      new Set(
        signal.existingOwnerUrls ??
        []
      ),

    missionOverlap:
      signal.missionOverlap,

    queryOverlap:
      signal.queryOverlap,

    serpUrlOverlap:
      signal.serpUrlOverlap,

    serpPageTypeOverlap:
      signal.serpPageTypeOverlap,

    sameMissionEvidence:
      signal.sameMissionEvidence,
  };
}


function mergeAggregate(
  aggregate:
    Aggregate,

  signal:
    QuerySignalInput
): void {
  const confidence =
    signal.sourceConfidence;

  aggregate.sources.add(
    signal.source
  );

  if (
    confidence >
    aggregate.sourceConfidence
  ) {
    aggregate.sourceConfidence =
      confidence;

    aggregate.intent =
      signal.intent;

    aggregate.subIntent =
      signal.subIntent.trim();

    aggregate.cluster =
      signal.cluster.trim();

    aggregate.siteCoverage =
      signal.siteCoverage;
  }

  aggregate.searchVolume =
    pickMetric(
      aggregate.searchVolume,
      {
        value:
          numberOrUndefined(
            signal.searchVolume
          ),

        confidence,
      }
    );

  aggregate.cpc =
    pickMetric(
      aggregate.cpc,
      {
        value:
          numberOrUndefined(
            signal.cpc
          ),

        confidence,
      }
    );

  aggregate.trendMomentum =
    pickMetric(
      aggregate.trendMomentum,
      {
        value:
          numberOrUndefined(
            signal.trendMomentum
          ),

        confidence,
      }
    );

  aggregate.gscImpressions =
    pickMetric(
      aggregate.gscImpressions,
      {
        value:
          numberOrUndefined(
            signal.gscImpressions
          ),

        confidence,
      }
    );

  aggregate.gscClicks =
    pickMetric(
      aggregate.gscClicks,
      {
        value:
          numberOrUndefined(
            signal.gscClicks
          ),

        confidence,
      }
    );

  aggregate.gscPosition =
    pickMetric(
      aggregate.gscPosition,
      {
        value:
          numberOrUndefined(
            signal.gscPosition
          ),

        confidence,
      }
    );

  aggregate.competitorFrequency =
    pickMetric(
      aggregate.competitorFrequency,
      {
        value:
          numberOrUndefined(
            signal.competitorFrequency
          ),

        confidence,
      }
    );

  aggregate.serpFrequency =
    pickMetric(
      aggregate.serpFrequency,
      {
        value:
          numberOrUndefined(
            signal.serpFrequency
          ),

        confidence,
      }
    );

  for (
    const url
    of signal.existingOwnerUrls ??
    []
  ) {
    aggregate.existingOwnerUrls.add(
      url
    );
  }

  if (
    signal.missionOverlap !==
    undefined
  ) {
    aggregate.missionOverlap =
      signal.missionOverlap;
  }

  if (
    signal.queryOverlap !==
    undefined
  ) {
    aggregate.queryOverlap =
      signal.queryOverlap;
  }

  if (
    signal.serpUrlOverlap !==
    undefined
  ) {
    aggregate.serpUrlOverlap =
      signal.serpUrlOverlap;
  }

  if (
    signal.serpPageTypeOverlap !==
    undefined
  ) {
    aggregate.serpPageTypeOverlap =
      signal.serpPageTypeOverlap;
  }

  if (
    signal.sameMissionEvidence !==
    undefined
  ) {
    aggregate.sameMissionEvidence =
      signal.sameMissionEvidence;
  }
}


function edgeRelationship({
  left,
  right,
}: {
  left:
    QueryNode;

  right:
    QueryNode;
}): QueryEdgeRelationship {
  const combined =
    `${left.normalizedQuery} ${right.normalizedQuery}`;

  if (
    /\b(vs|versus|compare|comparison)\b/.test(
      combined
    )
  ) {
    return "COMPARISON";
  }

  if (
    /\b(what to do|after|next step|respond|dispute|fix)\b/.test(
      combined
    )
  ) {
    return "FOLLOW_UP";
  }

  if (
    left.intent !==
    right.intent
  ) {
    return "ALTERNATIVE_INTENT";
  }

  const overlap =
    lexicalQueryOverlap(
      left.query,
      right.query
    );

  if (
    overlap >=
    0.65
  ) {
    return "SAME_MISSION";
  }

  if (
    overlap >=
    0.35
  ) {
    return "SUBTOPIC";
  }

  return "OVERLAP";
}


function buildEdges(
  nodes:
    readonly QueryNode[]
): QueryEdge[] {
  const edges:
    QueryEdge[] =
      [];

  for (
    let leftIndex =
      0;
    leftIndex <
      nodes.length;
    leftIndex +=
      1
  ) {
    const left =
      nodes[
        leftIndex
      ];

    if (
      !left
    ) {
      continue;
    }

    for (
      let rightIndex =
        leftIndex +
        1;
      rightIndex <
        nodes.length;
      rightIndex +=
        1
    ) {
      const right =
        nodes[
          rightIndex
        ];

      if (
        !right
      ) {
        continue;
      }

      const overlap =
        lexicalQueryOverlap(
          left.query,
          right.query
        );

      if (
        overlap <
          0.2 &&
        left.intent ===
          right.intent
      ) {
        continue;
      }

      const relationship =
        edgeRelationship({
          left,
          right,
        });

      edges.push({
        fromId:
          left.id,

        toId:
          right.id,

        relationship,

        confidence:
          Number(
            clamp01(
              (
                left.sourceConfidence +
                right.sourceConfidence
              ) /
              2 *
              (
                0.5 +
                overlap *
                  0.5
              )
            ).toFixed(
              4
            )
          ),
      });
    }
  }

  return edges;
}


export function buildQueryGraph({
  mission,
  missionIntent,
  signals,
}: {
  mission:
    Readonly<SearchMission>;

  missionIntent:
    QueryIntent;

  signals:
    QuerySignalInput[];
}): Readonly<QueryGraph> {
  const aggregateMap =
    new Map<
      string,
      Aggregate
    >();

  for (
    const signal
    of signals
  ) {
    validateSignal(
      signal
    );

    const key =
      normalize(
        signal.query
      );

    const existing =
      aggregateMap.get(
        key
      );

    if (
      existing
    ) {
      mergeAggregate(
        existing,
        signal
      );
    } else {
      aggregateMap.set(
        key,
        createAggregate(
          signal
        )
      );
    }
  }

  const nodes:
    QueryNode[] =
      [];

  const boundaries:
    QueryBoundaryRecord[] =
      [];

  const provenance:
    QueryNodeProvenance[] =
      [];

  for (
    const aggregate
    of aggregateMap.values()
  ) {
    const id =
      nodeId({
        missionId:
          mission.id,

        normalizedQuery:
          aggregate.normalizedQuery,
      });

    const node:
      QueryNode = {
        id,

        missionId:
          mission.id,

        query:
          aggregate.query,

        normalizedQuery:
          aggregate.normalizedQuery,

        intent:
          aggregate.intent,

        subIntent:
          aggregate.subIntent,

        cluster:
          aggregate.cluster,

        siteCoverage:
          aggregate.siteCoverage,

        sourceConfidence:
          Number(
            aggregate
              .sourceConfidence
              .toFixed(
                4
              )
          ),
      };

    if (
      aggregate.searchVolume
        .value !==
      undefined
    ) {
      node.searchVolume =
        aggregate.searchVolume
          .value;
    }

    if (
      aggregate.cpc
        .value !==
      undefined
    ) {
      node.cpc =
        aggregate.cpc
          .value;
    }

    if (
      aggregate.trendMomentum
        .value !==
      undefined
    ) {
      node.trendMomentum =
        aggregate.trendMomentum
          .value;
    }

    if (
      aggregate.gscImpressions
        .value !==
      undefined
    ) {
      node.gscImpressions =
        aggregate.gscImpressions
          .value;
    }

    if (
      aggregate.gscClicks
        .value !==
      undefined
    ) {
      node.gscClicks =
        aggregate.gscClicks
          .value;
    }

    if (
      aggregate.gscPosition
        .value !==
      undefined
    ) {
      node.gscPosition =
        aggregate.gscPosition
          .value;
    }

    if (
      aggregate.competitorFrequency
        .value !==
      undefined
    ) {
      node.competitorFrequency =
        aggregate
          .competitorFrequency
          .value;
    }

    if (
      aggregate.serpFrequency
        .value !==
      undefined
    ) {
      node.serpFrequency =
        aggregate.serpFrequency
          .value;
    }

    const boundary =
      evaluateIntentBoundary({
        mission,

        missionIntent,

        query:
          aggregate.query,

        queryIntent:
          aggregate.intent,

        evidence: {
          missionOverlap:
            aggregate.missionOverlap,

          queryOverlap:
            aggregate.queryOverlap,

          serpUrlOverlap:
            aggregate.serpUrlOverlap,

          serpPageTypeOverlap:
            aggregate
              .serpPageTypeOverlap,

          existingOwnerUrls: [
            ...aggregate
              .existingOwnerUrls,
          ],

          sameMissionEvidence:
            aggregate
              .sameMissionEvidence,

          foreignEntityEvidence:
            (
              aggregate
                .subIntent
                .trim()
                .toUpperCase()
                .includes(
                  "BRAND"
                ) ||
              aggregate
                .subIntent
                .trim()
                .toUpperCase()
                .includes(
                  "COMPETITOR"
                ) ||
              aggregate
                .cluster
                .trim()
                .toUpperCase() ===
                "COMPETITOR_INTELLIGENCE"
            ),
        },
      });

    nodes.push(
      Object.freeze(
        node
      )
    );

    boundaries.push(
      Object.freeze({
        nodeId:
          id,

        decision:
          boundary.decision,

        primaryEligible:
          boundary.primaryEligible,

        confidence:
          boundary.confidence,

        provisional:
          boundary.provisional,

        ownershipStatus:
          boundary.ownershipStatus,

        reasons:
          boundary.reasons,
      })
    );

    provenance.push(
      Object.freeze({
        nodeId:
          id,

        sources:
          Object.freeze([
            ...aggregate.sources,
          ]),
      })
    );
  }

  nodes.sort(
    (
      left,
      right
    ) =>
      right.sourceConfidence -
        left.sourceConfidence ||
      (
        right.gscImpressions ??
        0
      ) -
        (
          left.gscImpressions ??
          0
        ) ||
      (
        right.searchVolume ??
        0
      ) -
        (
          left.searchVolume ??
          0
        ) ||
      left.normalizedQuery.localeCompare(
        right.normalizedQuery
      )
  );

  const edges =
    buildEdges(
      nodes
    );

  const idsFor =
    (
      decision:
        IntentBoundaryDecision
    ) =>
      boundaries
        .filter(
          (boundary) =>
            boundary.decision ===
            decision
        )
        .map(
          (boundary) =>
            boundary.nodeId
        );

  return Object.freeze({
    version:
      "QUERY_GRAPH_V1" as const,

    missionId:
      mission.id,

    missionVersion:
      mission.version,

    missionIntent,

    nodes:
      Object.freeze(
        nodes
      ),

    edges:
      Object.freeze(
        edges
      ),

    boundaries:
      Object.freeze(
        boundaries
      ),

    provenance:
      Object.freeze(
        provenance
      ),

    samePageNodeIds:
      Object.freeze(
        idsFor(
          "SAME_PAGE"
        )
      ),

    separatePageNodeIds:
      Object.freeze(
        idsFor(
          "SEPARATE_PAGE"
        )
      ),

    clusterNodeIds:
      Object.freeze(
        idsFor(
          "CLUSTER"
        )
      ),

    mergeNodeIds:
      Object.freeze(
        idsFor(
          "MERGE"
        )
      ),

    uncertainNodeIds:
      Object.freeze(
        idsFor(
          "UNCERTAIN"
        )
      ),
  });
}
