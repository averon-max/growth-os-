import type {
  QueryIntent,
} from "./intent-boundary";

import type {
  SearchMission,
} from "./search-mission";

import type {
  SerpSnapshot,
} from "./serp-observatory";

import type {
  SerpStabilityReport,
} from "./serp-stability";

import type {
  SiteTopicNode,
} from "./site-topic-graph";

import type {
  UrlOwnershipResult,
} from "./url-ownership";


export type WinnabilityBand =
  | "LOW"
  | "MEDIUM"
  | "HIGH";


export type WinnabilityStatus =
  | "INSUFFICIENT_EVIDENCE"
  | "PRELIMINARY"
  | "COMPLETE";


export type WinnabilityConfidence =
  | "LOW"
  | "MEDIUM"
  | "HIGH";


export type WinnabilitySignalLevel =
  | "FAVORABLE"
  | "MIXED"
  | "UNFAVORABLE"
  | "BLOCKED"
  | "UNKNOWN";


export type WinnabilityDimensionKey =
  | "MISSION_FIT"
  | "INTENT_FIT"
  | "EXISTING_GOOGLE_RECOGNITION"
  | "SITE_TOPIC_STRENGTH"
  | "CONTENT_OPPORTUNITY"
  | "EVIDENCE_OPPORTUNITY"
  | "ORIGINAL_VALUE_OPPORTUNITY"
  | "INTERNAL_AUTHORITY"
  | "SERP_OPENNESS"
  | "SERP_STABILITY"
  | "FRESHNESS_OPPORTUNITY"
  | "EXTERNAL_AUTHORITY_GAP";


export interface WinnabilitySignal {
  level:
    WinnabilitySignalLevel;

  evidence:
    readonly string[];
}


export interface WinnabilityDimension {
  key:
    WinnabilityDimensionKey;

  level:
    WinnabilitySignalLevel;

  evidence:
    readonly string[];

  heuristicWeight:
    number | null;
}


export interface WinnabilityOverrides {
  missionFit?:
    WinnabilitySignal;

  intentFit?:
    WinnabilitySignal;

  googleRecognition?:
    WinnabilitySignal;

  siteTopicStrength?:
    WinnabilitySignal;

  contentOpportunity?:
    WinnabilitySignal;

  evidenceOpportunity?:
    WinnabilitySignal;

  originalValueOpportunity?:
    WinnabilitySignal;

  internalAuthority?:
    WinnabilitySignal;

  serpOpenness?:
    WinnabilitySignal;

  freshnessOpportunity?:
    WinnabilitySignal;

  externalAuthorityGap?:
    WinnabilitySignal;
}


export interface WinnabilityDiagnostic {
  version:
    "WINNABILITY_DIAGNOSTIC_V1";

  model:
    "HEURISTIC_DIAGNOSTIC_V1";

  status:
    WinnabilityStatus;

  band:
    WinnabilityBand | null;

  confidence:
    WinnabilityConfidence;

  evidenceCoverage:
    number;

  dimensions:
    readonly WinnabilityDimension[];

  strengths:
    readonly WinnabilityDimensionKey[];

  constraints:
    readonly WinnabilityDimensionKey[];

  unknownDimensions:
    readonly WinnabilityDimensionKey[];

  blockers:
    readonly string[];

  primaryBottleneck:
    WinnabilityDimensionKey | null;

  explanation:
    readonly string[];

  certaintyNotes:
    readonly string[];
}


/*
 * These are transparent heuristic diagnostic weights.
 *
 * They are NOT ranking probabilities.
 * They are NOT Google scores.
 *
 * Missing evidence never receives a zero.
 * Unknown dimensions are excluded from the diagnostic numerator
 * and reduce evidence coverage / confidence instead.
 *
 * These weights are expected to become outcome-calibrated later.
 */
const HEURISTIC_WEIGHTS:
  Partial<
    Record<
      WinnabilityDimensionKey,
      number
    >
  > = {
    INTENT_FIT:
      15,

    EXISTING_GOOGLE_RECOGNITION:
      10,

    SITE_TOPIC_STRENGTH:
      15,

    CONTENT_OPPORTUNITY:
      15,

    EVIDENCE_OPPORTUNITY:
      10,

    ORIGINAL_VALUE_OPPORTUNITY:
      15,

    INTERNAL_AUTHORITY:
      10,

    SERP_OPENNESS:
      5,

    FRESHNESS_OPPORTUNITY:
      5,

    /*
     * Future optional provider.
     * It only enters the denominator when real evidence exists.
     */
    EXTERNAL_AUTHORITY_GAP:
      10,
  };


const BASE_WEIGHTED_DIMENSIONS:
  WinnabilityDimensionKey[] = [
    "INTENT_FIT",
    "EXISTING_GOOGLE_RECOGNITION",
    "SITE_TOPIC_STRENGTH",
    "CONTENT_OPPORTUNITY",
    "EVIDENCE_OPPORTUNITY",
    "ORIGINAL_VALUE_OPPORTUNITY",
    "INTERNAL_AUTHORITY",
    "SERP_OPENNESS",
    "FRESHNESS_OPPORTUNITY",
  ];


function signal(
  level:
    WinnabilitySignalLevel,

  evidence:
    string[]
): Readonly<WinnabilitySignal> {
  return Object.freeze({
    level,

    evidence:
      Object.freeze([
        ...evidence,
      ]),
  });
}


function unknown(
  reason: string
): Readonly<WinnabilitySignal> {
  return signal(
    "UNKNOWN",
    [
      reason,
    ]
  );
}


function deriveMissionFit(
  mission:
    Readonly<SearchMission>
): Readonly<WinnabilitySignal> {
  switch (
    mission.businessRelationship
  ) {
    case "CORE":
      return signal(
        "FAVORABLE",
        [
          "BUSINESS_RELATIONSHIP_CORE",
        ]
      );

    case "DIRECT":
      return signal(
        "FAVORABLE",
        [
          "BUSINESS_RELATIONSHIP_DIRECT",
        ]
      );

    case "ADJACENT":
      return signal(
        "MIXED",
        [
          "BUSINESS_RELATIONSHIP_ADJACENT",
        ]
      );

    case "WEAK":
      return signal(
        "UNFAVORABLE",
        [
          "BUSINESS_RELATIONSHIP_WEAK",
        ]
      );
  }
}


function deriveIntentFit({
  targetIntent,
  latestSerp,
}: {
  targetIntent:
    QueryIntent;

  latestSerp?:
    Readonly<SerpSnapshot>;
}): Readonly<WinnabilitySignal> {
  if (
    !latestSerp
  ) {
    return unknown(
      "SERP_INTENT_EVIDENCE_MISSING"
    );
  }

  const top10 =
    latestSerp.results.filter(
      (result) =>
        result.rank <=
        10
    );

  const known =
    top10.filter(
      (result) =>
        result.intent !==
          undefined &&
        result.intent !==
          null
    );

  if (
    known.length ===
    0
  ) {
    return unknown(
      "SERP_RESULT_INTENTS_UNKNOWN"
    );
  }

  const matching =
    known.filter(
      (result) =>
        result.intent ===
        targetIntent
    ).length;

  const share =
    matching /
    known.length;

  const evidence = [
    `SERP_INTENT_KNOWN:${known.length}`,
    `SERP_INTENT_MATCHING:${matching}`,
    `SERP_INTENT_MATCH_SHARE:${share.toFixed(4)}`,
  ];

  if (
    share >=
    0.8
  ) {
    return signal(
      "FAVORABLE",
      evidence
    );
  }

  if (
    share >=
    0.55
  ) {
    return signal(
      "MIXED",
      evidence
    );
  }

  return signal(
    "UNFAVORABLE",
    evidence
  );
}


function deriveGoogleRecognition(
  ownership:
    Readonly<UrlOwnershipResult>
): Readonly<WinnabilitySignal> {
  switch (
    ownership.status
  ) {
    case "SINGLE_OWNER":
      return signal(
        "FAVORABLE",
        [
          "SINGLE_EXISTING_GOOGLE_OWNER",
          "GSC_QUERY_OWNERSHIP_PRESENT",
        ]
      );

    case "MULTIPLE_OWNERS":
      return signal(
        "MIXED",
        [
          "GOOGLE_RECOGNITION_PRESENT",
          "MULTIPLE_URL_OWNERS",
          ownership.cannibalization ===
          "CONFIRMED"
            ? "CANNIBALIZATION_CONFIRMED"
            : "CANNIBALIZATION_POTENTIAL",
        ]
      );

    case "INTENT_CONFLICT":
      return signal(
        "UNFAVORABLE",
        [
          "GOOGLE_RECOGNITION_WRONG_INTENT",
        ]
      );

    case "UNCERTAIN":
      return unknown(
        "URL_OWNERSHIP_UNCERTAIN"
      );

    case "NO_OWNER":
      return signal(
        "UNFAVORABLE",
        [
          "NO_EXISTING_GOOGLE_OWNER",
        ]
      );
  }
}


function deriveSiteTopicStrength(
  node:
    Readonly<SiteTopicNode> |
    undefined
): Readonly<WinnabilitySignal> {
  if (
    !node
  ) {
    return unknown(
      "SITE_TOPIC_NODE_MISSING"
    );
  }

  const affinity =
    node.missionAffinity;

  const evidence = [
    `EXISTING_PAGES:${node.existingPages}`,
    `INDEXED_PAGES:${node.indexedPages}`,
    `QUERY_BREADTH:${node.queryBreadth}`,
    `NON_BRAND_IMPRESSIONS:${node.nonBrandImpressions}`,
    `TOP10_QUERIES:${node.top10Queries}`,
  ];

  if (
    affinity !==
    null
  ) {
    evidence.push(
      `MISSION_AFFINITY:${affinity.toFixed(4)}`
    );
  }

  /*
   * This is a proprietary diagnostic classification,
   * not a claim about a Google "authority score".
   */
  if (
    affinity !==
      null &&
    affinity >=
      0.75 &&
    (
      node.top10Queries >=
        2 ||
      node.nonBrandImpressions >=
        100
    )
  ) {
    return signal(
      "FAVORABLE",
      evidence
    );
  }

  if (
    affinity !==
      null &&
    affinity >=
      0.5 &&
    (
      node.queryBreadth >
        0 ||
      node.existingPages >
        0
    )
  ) {
    return signal(
      "MIXED",
      evidence
    );
  }

  if (
    node.existingPages >
      0 ||
    node.queryBreadth >
      0
  ) {
    return signal(
      "UNFAVORABLE",
      evidence
    );
  }

  return unknown(
    "SITE_TOPIC_EVIDENCE_INSUFFICIENT"
  );
}


function deriveSerpStability(
  report:
    Readonly<SerpStabilityReport> |
    undefined
): Readonly<WinnabilitySignal> {
  if (
    !report ||
    report.classification ===
      "INSUFFICIENT_HISTORY"
  ) {
    return unknown(
      "SERP_STABILITY_HISTORY_INSUFFICIENT"
    );
  }

  const evidence = [
    `SERP_STABILITY:${report.classification}`,
    `SERP_SNAPSHOT_COUNT:${report.snapshotCount}`,
  ];

  if (
    report.averageTop10UrlOverlap !==
    null
  ) {
    evidence.push(
      `TOP10_URL_OVERLAP:${report.averageTop10UrlOverlap.toFixed(4)}`
    );
  }

  if (
    report.meanAbsoluteRankMovement !==
    null
  ) {
    evidence.push(
      `MEAN_RANK_MOVEMENT:${report.meanAbsoluteRankMovement.toFixed(4)}`
    );
  }

  switch (
    report.classification
  ) {
    case "STABLE":
      return signal(
        "FAVORABLE",
        evidence
      );

    case "MODERATELY_STABLE":
      return signal(
        "MIXED",
        evidence
      );

    case "VOLATILE":
      return signal(
        "UNFAVORABLE",
        [
          ...evidence,
          "VOLATILITY_INCREASES_OPPORTUNITY_BUT_REDUCES_CERTAINTY",
        ]
      );

  }
}


function levelValue(
  level:
    WinnabilitySignalLevel
): number | null {
  switch (
    level
  ) {
    case "FAVORABLE":
      return 1;

    case "MIXED":
      return 0.65;

    case "UNFAVORABLE":
      return 0.3;

    case "BLOCKED":
      return 0;

    case "UNKNOWN":
      return null;
  }
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


function round4(
  value: number
): number {
  return Number(
    value.toFixed(
      4
    )
  );
}


function toDimension({
  key,
  value,
}: {
  key:
    WinnabilityDimensionKey;

  value:
    Readonly<WinnabilitySignal>;
}): Readonly<WinnabilityDimension> {
  return Object.freeze({
    key,

    level:
      value.level,

    evidence:
      Object.freeze([
        ...value.evidence,
      ]),

    heuristicWeight:
      HEURISTIC_WEIGHTS[
        key
      ] ??
      null,
  });
}


function confidenceRank(
  value:
    WinnabilityConfidence
): number {
  switch (
    value
  ) {
    case "LOW":
      return 0;

    case "MEDIUM":
      return 1;

    case "HIGH":
      return 2;
  }
}


function capConfidence(
  current:
    WinnabilityConfidence,

  maximum:
    WinnabilityConfidence
): WinnabilityConfidence {
  return (
    confidenceRank(
      current
    ) <=
    confidenceRank(
      maximum
    )
  )
    ? current
    : maximum;
}


function classifyConfidence({
  evidenceCoverage,
  stability,
}: {
  evidenceCoverage:
    number;

  stability:
    Readonly<WinnabilitySignal>;
}): WinnabilityConfidence {
  let value:
    WinnabilityConfidence;

  if (
    evidenceCoverage >=
    0.8
  ) {
    value =
      "HIGH";
  } else if (
    evidenceCoverage >=
    0.55
  ) {
    value =
      "MEDIUM";
  } else {
    value =
      "LOW";
  }

  if (
    stability.level ===
    "UNKNOWN"
  ) {
    return capConfidence(
      value,
      "LOW"
    );
  }

  if (
    stability.level ===
    "UNFAVORABLE"
  ) {
    return capConfidence(
      value,
      "MEDIUM"
    );
  }

  return value;
}


function selectBottleneck(
  dimensions:
    readonly Readonly<WinnabilityDimension>[]
): WinnabilityDimensionKey | null {
  const candidates =
    dimensions
      .filter(
        (dimension) =>
          (
            dimension.level ===
              "BLOCKED" ||
            dimension.level ===
              "UNFAVORABLE"
          ) &&
          dimension.heuristicWeight !==
            null
      )
      .sort(
        (
          left,
          right
        ) =>
          (
            right.heuristicWeight ??
            0
          ) -
            (
              left.heuristicWeight ??
              0
            ) ||
          left.key.localeCompare(
            right.key
          )
      );

  return (
    candidates[0]
      ?.key ??
    null
  );
}


export function buildWinnabilityDiagnostic({
  mission,
  targetIntent,
  latestSerp,
  ownership,
  siteTopic,
  stability,
  overrides = {},
}: {
  mission:
    Readonly<SearchMission>;

  targetIntent:
    QueryIntent;

  latestSerp?:
    Readonly<SerpSnapshot>;

  ownership:
    Readonly<UrlOwnershipResult>;

  siteTopic?:
    Readonly<SiteTopicNode>;

  stability?:
    Readonly<SerpStabilityReport>;

  overrides?:
    WinnabilityOverrides;
}): Readonly<WinnabilityDiagnostic> {
  if (
    ownership.missionId !==
    mission.id
  ) {
    throw new Error(
      "WINNABILITY_MISSION_OWNERSHIP_MISMATCH"
    );
  }

  const missionFit =
    overrides.missionFit ??
    deriveMissionFit(
      mission
    );

  const intentFit =
    overrides.intentFit ??
    deriveIntentFit({
      targetIntent,
      latestSerp,
    });

  const googleRecognition =
    overrides.googleRecognition ??
    deriveGoogleRecognition(
      ownership
    );

  const siteTopicStrength =
    overrides.siteTopicStrength ??
    deriveSiteTopicStrength(
      siteTopic
    );

  const contentOpportunity =
    overrides.contentOpportunity ??
    unknown(
      "STAGE6_CONTENT_OPPORTUNITY_PENDING"
    );

  const evidenceOpportunity =
    overrides.evidenceOpportunity ??
    unknown(
      "STAGE7_EVIDENCE_OPPORTUNITY_PENDING"
    );

  const originalValueOpportunity =
    overrides.originalValueOpportunity ??
    unknown(
      "STAGE6_ORIGINAL_VALUE_PENDING"
    );

  const internalAuthority =
    overrides.internalAuthority ??
    unknown(
      "INTERNAL_AUTHORITY_EVIDENCE_PENDING"
    );

  const serpOpenness =
    overrides.serpOpenness ??
    unknown(
      "SERP_OPENNESS_EVIDENCE_PENDING"
    );

  const serpStability =
    deriveSerpStability(
      stability
    );

  const freshnessOpportunity =
    overrides.freshnessOpportunity ??
    unknown(
      "FRESHNESS_OPPORTUNITY_EVIDENCE_PENDING"
    );

  const externalAuthorityGap =
    overrides.externalAuthorityGap ??
    unknown(
      "EXTERNAL_AUTHORITY_FUTURE_SIGNAL"
    );

  const dimensions =
    Object.freeze([
      toDimension({
        key:
          "MISSION_FIT",

        value:
          missionFit,
      }),

      toDimension({
        key:
          "INTENT_FIT",

        value:
          intentFit,
      }),

      toDimension({
        key:
          "EXISTING_GOOGLE_RECOGNITION",

        value:
          googleRecognition,
      }),

      toDimension({
        key:
          "SITE_TOPIC_STRENGTH",

        value:
          siteTopicStrength,
      }),

      toDimension({
        key:
          "CONTENT_OPPORTUNITY",

        value:
          contentOpportunity,
      }),

      toDimension({
        key:
          "EVIDENCE_OPPORTUNITY",

        value:
          evidenceOpportunity,
      }),

      toDimension({
        key:
          "ORIGINAL_VALUE_OPPORTUNITY",

        value:
          originalValueOpportunity,
      }),

      toDimension({
        key:
          "INTERNAL_AUTHORITY",

        value:
          internalAuthority,
      }),

      toDimension({
        key:
          "SERP_OPENNESS",

        value:
          serpOpenness,
      }),

      toDimension({
        key:
          "SERP_STABILITY",

        value:
          serpStability,
      }),

      toDimension({
        key:
          "FRESHNESS_OPPORTUNITY",

        value:
          freshnessOpportunity,
      }),

      toDimension({
        key:
          "EXTERNAL_AUTHORITY_GAP",

        value:
          externalAuthorityGap,
      }),
    ]);

  const weightedKeys = [
    ...BASE_WEIGHTED_DIMENSIONS,
  ];

  if (
    externalAuthorityGap.level !==
    "UNKNOWN"
  ) {
    weightedKeys.push(
      "EXTERNAL_AUTHORITY_GAP"
    );
  }

  let knownWeight =
    0;

  let weightedValue =
    0;

  let possibleWeight =
    0;

  for (
    const key
    of weightedKeys
  ) {
    const weight =
      HEURISTIC_WEIGHTS[
        key
      ];

    if (
      !weight
    ) {
      continue;
    }

    possibleWeight +=
      weight;

    const dimension =
      dimensions.find(
        (item) =>
          item.key ===
          key
      );

    if (
      !dimension
    ) {
      continue;
    }

    const numeric =
      levelValue(
        dimension.level
      );

    if (
      numeric ===
      null
    ) {
      continue;
    }

    knownWeight +=
      weight;

    weightedValue +=
      numeric *
      weight;
  }

  const evidenceCoverage =
    possibleWeight >
      0
      ? round4(
          knownWeight /
          possibleWeight
        )
      : 0;

  const missionBlocked =
    missionFit.level ===
    "BLOCKED";

  const intentBlocked =
    intentFit.level ===
    "BLOCKED";

  const blockers:
    string[] =
      [];

  if (
    missionBlocked
  ) {
    blockers.push(
      "MISSION_FIT_BLOCKED"
    );
  }

  if (
    intentBlocked
  ) {
    blockers.push(
      "INTENT_FIT_BLOCKED"
    );
  }

  let status:
    WinnabilityStatus;

  let band:
    WinnabilityBand |
    null;

  if (
    knownWeight <
      35
  ) {
    status =
      "INSUFFICIENT_EVIDENCE";

    band =
      null;
  } else {
    status =
      evidenceCoverage >=
      0.8
        ? "COMPLETE"
        : "PRELIMINARY";

    const normalized =
      weightedValue /
      knownWeight;

    if (
      missionBlocked ||
      intentBlocked
    ) {
      band =
        "LOW";
    } else if (
      normalized >=
      0.72
    ) {
      band =
        "HIGH";
    } else if (
      normalized >=
      0.48
    ) {
      band =
        "MEDIUM";
    } else {
      band =
        "LOW";
    }
  }

  const strengths =
    dimensions
      .filter(
        (dimension) =>
          dimension.level ===
          "FAVORABLE"
      )
      .map(
        (dimension) =>
          dimension.key
      );

  const constraints =
    dimensions
      .filter(
        (dimension) =>
          dimension.level ===
            "UNFAVORABLE" ||
          dimension.level ===
            "BLOCKED"
      )
      .map(
        (dimension) =>
          dimension.key
      );

  const unknownDimensions =
    dimensions
      .filter(
        (dimension) =>
          dimension.level ===
          "UNKNOWN"
      )
      .map(
        (dimension) =>
          dimension.key
      );

  const certaintyNotes:
    string[] =
      [];

  if (
    serpStability.level ===
    "UNKNOWN"
  ) {
    certaintyNotes.push(
      "SERP_HISTORY_INSUFFICIENT_CERTAINTY_REDUCED"
    );
  }

  if (
    serpStability.level ===
    "UNFAVORABLE"
  ) {
    certaintyNotes.push(
      "VOLATILE_SERP_OPPORTUNITY_MAY_BE_HIGHER_BUT_CERTAINTY_IS_LOWER"
    );
  }

  if (
    unknownDimensions.length >
    0
  ) {
    certaintyNotes.push(
      "UNKNOWN_DIMENSIONS_ARE_NOT_SCORED_AS_ZERO"
    );
  }

  const explanation =
    dimensions.flatMap(
      (dimension) => {
        if (
          dimension.level ===
          "UNKNOWN"
        ) {
          return [];
        }

        return [
          `${dimension.key}:${dimension.level}`,
          ...dimension.evidence.map(
            (item) =>
              `${dimension.key}:${item}`
          ),
        ];
      }
    );

  return Object.freeze({
    version:
      "WINNABILITY_DIAGNOSTIC_V1" as const,

    model:
      "HEURISTIC_DIAGNOSTIC_V1" as const,

    status,

    band,

    confidence:
      band ===
      null
        ? "LOW"
        : classifyConfidence({
            evidenceCoverage,
            stability:
              serpStability,
          }),

    evidenceCoverage:
      clamp01(
        evidenceCoverage
      ),

    dimensions,

    strengths:
      Object.freeze(
        strengths
      ),

    constraints:
      Object.freeze(
        constraints
      ),

    unknownDimensions:
      Object.freeze(
        unknownDimensions
      ),

    blockers:
      Object.freeze(
        blockers
      ),

    primaryBottleneck:
      selectBottleneck(
        dimensions
      ),

    explanation:
      Object.freeze(
        explanation
      ),

    certaintyNotes:
      Object.freeze(
        certaintyNotes
      ),
  });
}
