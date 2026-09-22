import {
  assertSameSerpMarket,
  daysFromFirstSnapshot,
  SERP_HISTORY_TARGET_DAYS,
  type SerpObservedPageType,
  type SerpSnapshot,
} from "./serp-observatory";


export type SerpRankChurn =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "UNKNOWN";


export type SerpIntentConsistency =
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "UNKNOWN";


export type SerpStabilityClassification =
  | "INSUFFICIENT_HISTORY"
  | "STABLE"
  | "MODERATELY_STABLE"
  | "VOLATILE";


export interface SerpHistoryPoint {
  fingerprint:
    string;

  capturedAt:
    Date;

  daysFromFirst:
    number;

  targetMilestone:
    0 | 3 | 7 | 14 | 28 | null;
}


export interface SerpPairComparison {
  fromFingerprint:
    string;

  toFingerprint:
    string;

  fromCapturedAt:
    Date;

  toCapturedAt:
    Date;

  top10UrlJaccard:
    number;

  commonUrls:
    number;

  meanAbsoluteRankMovement:
    number | null;

  newDomains:
    readonly string[];

  removedDomains:
    readonly string[];

  domainChurnRate:
    number;

  pageTypeConsistency:
    number | null;
}


export interface SerpStabilityReport {
  version:
    "SERP_STABILITY_V1";

  snapshotCount:
    number;

  history:
    readonly SerpHistoryPoint[];

  comparisons:
    readonly SerpPairComparison[];

  averageTop10UrlOverlap:
    number | null;

  meanAbsoluteRankMovement:
    number | null;

  averageDomainChurnRate:
    number | null;

  pageTypeConsistency:
    number | null;

  rankChurn:
    SerpRankChurn;

  intentConsistency:
    SerpIntentConsistency;

  classification:
    SerpStabilityClassification;

  evidence:
    readonly string[];
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


function average(
  values:
    readonly number[]
): number | null {
  if (
    values.length ===
    0
  ) {
    return null;
  }

  return round4(
    values.reduce(
      (
        sum,
        value
      ) =>
        sum +
        value,
      0
    ) /
      values.length
  );
}


function top10(
  snapshot:
    Readonly<SerpSnapshot>
) {
  return snapshot.results
    .filter(
      (result) =>
        result.rank <=
        10
    )
    .sort(
      (
        left,
        right
      ) =>
        left.rank -
        right.rank
    );
}


function normalizedUrl(
  value: string
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /#.*$/,
      ""
    )
    .replace(
      /\/$/,
      ""
    );
}


function normalizedDomain(
  value: string
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /^www\./,
      ""
    );
}


export function top10UrlJaccard(
  left:
    Readonly<SerpSnapshot>,

  right:
    Readonly<SerpSnapshot>
): number {
  const a =
    new Set(
      top10(
        left
      ).map(
        (result) =>
          normalizedUrl(
            result.url
          )
      )
    );

  const b =
    new Set(
      top10(
        right
      ).map(
        (result) =>
          normalizedUrl(
            result.url
          )
      )
    );

  if (
    a.size ===
      0 &&
    b.size ===
      0
  ) {
    return 1;
  }

  const intersection =
    [...a].filter(
      (url) =>
        b.has(
          url
        )
    ).length;

  const union =
    new Set([
      ...a,
      ...b,
    ]).size;

  return union >
    0
    ? round4(
        intersection /
        union
      )
    : 1;
}


export function meanAbsoluteRankMovement(
  left:
    Readonly<SerpSnapshot>,

  right:
    Readonly<SerpSnapshot>
): number | null {
  const leftRanks =
    new Map(
      top10(
        left
      ).map(
        (result) => [
          normalizedUrl(
            result.url
          ),
          result.rank,
        ] as const
      )
    );

  const movements:
    number[] =
      [];

  for (
    const result
    of top10(
      right
    )
  ) {
    const previous =
      leftRanks.get(
        normalizedUrl(
          result.url
        )
      );

    if (
      previous ===
      undefined
    ) {
      continue;
    }

    movements.push(
      Math.abs(
        result.rank -
        previous
      )
    );
  }

  return average(
    movements
  );
}


function domainSet(
  snapshot:
    Readonly<SerpSnapshot>
): Set<string> {
  return new Set(
    top10(
      snapshot
    ).map(
      (result) =>
        normalizedDomain(
          result.domain
        )
    )
  );
}


export function domainChurn({
  left,
  right,
}: {
  left:
    Readonly<SerpSnapshot>;

  right:
    Readonly<SerpSnapshot>;
}): {
  newDomains:
    string[];

  removedDomains:
    string[];

  rate:
    number;
} {
  const before =
    domainSet(
      left
    );

  const after =
    domainSet(
      right
    );

  const newDomains =
    [...after]
      .filter(
        (domain) =>
          !before.has(
            domain
          )
      )
      .sort();

  const removedDomains =
    [...before]
      .filter(
        (domain) =>
          !after.has(
            domain
          )
      )
      .sort();

  const union =
    new Set([
      ...before,
      ...after,
    ]).size;

  return {
    newDomains,

    removedDomains,

    rate:
      union >
      0
        ? round4(
            (
              newDomains.length +
              removedDomains.length
            ) /
              union
          )
        : 0,
  };
}


function pageTypeDistribution(
  snapshot:
    Readonly<SerpSnapshot>
): Map<
  SerpObservedPageType,
  number
> {
  const results =
    top10(
      snapshot
    );

  const counts =
    new Map<
      SerpObservedPageType,
      number
    >();

  if (
    results.length ===
    0
  ) {
    return counts;
  }

  for (
    const result
    of results
  ) {
    const type =
      result.pageType ??
      "UNKNOWN";

    counts.set(
      type,
      (
        counts.get(
          type
        ) ??
        0
      ) +
        1
    );
  }

  for (
    const [
      type,
      count,
    ]
    of counts
  ) {
    counts.set(
      type,
      count /
        results.length
    );
  }

  return counts;
}


export function pageTypeConsistency(
  left:
    Readonly<SerpSnapshot>,

  right:
    Readonly<SerpSnapshot>
): number | null {
  const a =
    pageTypeDistribution(
      left
    );

  const b =
    pageTypeDistribution(
      right
    );

  if (
    a.size ===
      0 ||
    b.size ===
      0
  ) {
    return null;
  }

  const types =
    new Set([
      ...a.keys(),
      ...b.keys(),
    ]);

  let overlap =
    0;

  for (
    const type
    of types
  ) {
    overlap +=
      Math.min(
        a.get(
          type
        ) ??
          0,
        b.get(
          type
        ) ??
          0
      );
  }

  return round4(
    overlap
  );
}


function nearestMilestone(
  days:
    number
):
  | 0
  | 3
  | 7
  | 14
  | 28
  | null {
  for (
    const milestone
    of SERP_HISTORY_TARGET_DAYS
  ) {
    if (
      days ===
      milestone
    ) {
      return milestone;
    }
  }

  return null;
}


function classifyRankChurn(
  movement:
    number |
    null
): SerpRankChurn {
  if (
    movement ===
    null
  ) {
    return "UNKNOWN";
  }

  if (
    movement <=
    1.5
  ) {
    return "LOW";
  }

  if (
    movement <=
    3.5
  ) {
    return "MEDIUM";
  }

  return "HIGH";
}


function classifyIntentConsistency(
  consistency:
    number |
    null
): SerpIntentConsistency {
  if (
    consistency ===
    null
  ) {
    return "UNKNOWN";
  }

  if (
    consistency >=
    0.8
  ) {
    return "HIGH";
  }

  if (
    consistency >=
    0.55
  ) {
    return "MEDIUM";
  }

  return "LOW";
}


function classifyStability({
  snapshotCount,
  overlap,
  rankChurn,
  intentConsistency,
}: {
  snapshotCount:
    number;

  overlap:
    number |
    null;

  rankChurn:
    SerpRankChurn;

  intentConsistency:
    SerpIntentConsistency;
}): SerpStabilityClassification {
  if (
    snapshotCount <
      2 ||
    overlap ===
      null
  ) {
    return "INSUFFICIENT_HISTORY";
  }

  if (
    overlap >=
      0.8 &&
    rankChurn ===
      "LOW" &&
    (
      intentConsistency ===
        "HIGH" ||
      intentConsistency ===
        "UNKNOWN"
    )
  ) {
    return "STABLE";
  }

  if (
    overlap <
      0.5 ||
    rankChurn ===
      "HIGH" ||
    intentConsistency ===
      "LOW"
  ) {
    return "VOLATILE";
  }

  return "MODERATELY_STABLE";
}


export function compareSerpSnapshots(
  left:
    Readonly<SerpSnapshot>,

  right:
    Readonly<SerpSnapshot>
): Readonly<SerpPairComparison> {
  assertSameSerpMarket([
    left,
    right,
  ]);

  const leftUrls =
    new Set(
      top10(
        left
      ).map(
        (result) =>
          normalizedUrl(
            result.url
          )
      )
    );

  const rightUrls =
    new Set(
      top10(
        right
      ).map(
        (result) =>
          normalizedUrl(
            result.url
          )
      )
    );

  const commonUrls =
    [...leftUrls].filter(
      (url) =>
        rightUrls.has(
          url
        )
    ).length;

  const domains =
    domainChurn({
      left,
      right,
    });

  return Object.freeze({
    fromFingerprint:
      left.fingerprint,

    toFingerprint:
      right.fingerprint,

    fromCapturedAt:
      new Date(
        left.capturedAt
      ),

    toCapturedAt:
      new Date(
        right.capturedAt
      ),

    top10UrlJaccard:
      top10UrlJaccard(
        left,
        right
      ),

    commonUrls,

    meanAbsoluteRankMovement:
      meanAbsoluteRankMovement(
        left,
        right
      ),

    newDomains:
      Object.freeze(
        domains.newDomains
      ),

    removedDomains:
      Object.freeze(
        domains.removedDomains
      ),

    domainChurnRate:
      domains.rate,

    pageTypeConsistency:
      pageTypeConsistency(
        left,
        right
      ),
  });
}


export function buildSerpStabilityReport(
  snapshots:
    readonly Readonly<SerpSnapshot>[]
): Readonly<SerpStabilityReport> {
  assertSameSerpMarket(
    snapshots
  );

  const ordered =
    [...snapshots].sort(
      (
        left,
        right
      ) =>
        left.capturedAt.getTime() -
        right.capturedAt.getTime()
    );

  const first =
    ordered[0];

  const history:
    SerpHistoryPoint[] =
      first
        ? ordered.map(
            (snapshot) => {
              const days =
                daysFromFirstSnapshot({
                  first,
                  snapshot,
                });

              return Object.freeze({
                fingerprint:
                  snapshot.fingerprint,

                capturedAt:
                  new Date(
                    snapshot.capturedAt
                  ),

                daysFromFirst:
                  days,

                targetMilestone:
                  nearestMilestone(
                    days
                  ),
              });
            }
          )
        : [];

  const comparisons:
    SerpPairComparison[] =
      [];

  for (
    let index =
      1;
    index <
      ordered.length;
    index +=
      1
  ) {
    const previous =
      ordered[
        index -
        1
      ];

    const current =
      ordered[
        index
      ];

    if (
      previous &&
      current
    ) {
      comparisons.push(
        compareSerpSnapshots(
          previous,
          current
        )
      );
    }
  }

  const averageOverlap =
    average(
      comparisons.map(
        (item) =>
          item.top10UrlJaccard
      )
    );

  const rankMovement =
    average(
      comparisons
        .map(
          (item) =>
            item.meanAbsoluteRankMovement
        )
        .filter(
          (
            value
          ): value is number =>
            value !==
            null
        )
    );

  const domainChurnRate =
    average(
      comparisons.map(
        (item) =>
          item.domainChurnRate
      )
    );

  const typeConsistency =
    average(
      comparisons
        .map(
          (item) =>
            item.pageTypeConsistency
        )
        .filter(
          (
            value
          ): value is number =>
            value !==
            null
        )
    );

  const rankChurn =
    classifyRankChurn(
      rankMovement
    );

  const intentConsistency =
    classifyIntentConsistency(
      typeConsistency
    );

  const classification =
    classifyStability({
      snapshotCount:
        ordered.length,

      overlap:
        averageOverlap,

      rankChurn,

      intentConsistency,
    });

  const evidence =
    new Set<string>();

  if (
    ordered.length >=
    2
  ) {
    evidence.add(
      "MULTIPLE_SERP_SNAPSHOTS"
    );
  }

  if (
    averageOverlap !==
    null
  ) {
    evidence.add(
      "TOP10_URL_JACCARD"
    );
  }

  if (
    rankMovement !==
    null
  ) {
    evidence.add(
      "POSITION_CHURN"
    );
  }

  if (
    domainChurnRate !==
    null
  ) {
    evidence.add(
      "DOMAIN_CHURN"
    );
  }

  if (
    typeConsistency !==
    null
  ) {
    evidence.add(
      "PAGE_TYPE_CHURN"
    );
  }

  return Object.freeze({
    version:
      "SERP_STABILITY_V1" as const,

    snapshotCount:
      ordered.length,

    history:
      Object.freeze(
        history
      ),

    comparisons:
      Object.freeze(
        comparisons
      ),

    averageTop10UrlOverlap:
      averageOverlap,

    meanAbsoluteRankMovement:
      rankMovement,

    averageDomainChurnRate:
      domainChurnRate,

    pageTypeConsistency:
      typeConsistency,

    rankChurn,

    intentConsistency,

    classification,

    evidence:
      Object.freeze([
        ...evidence,
      ]),
  });
}
