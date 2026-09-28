export interface CanonicalObservedQueryMetricSet {
  searchVolume:
    Set<number>;

  cpc:
    Set<number>;

  gscImpressions:
    Set<number>;

  gscClicks:
    Set<number>;

  gscPosition:
    Set<number>;
}


export interface CanonicalObservedQueryRegistry {
  queryStrings:
    ReadonlySet<string>;

  queryTexts:
    ReadonlyMap<
      string,
      string
    >;

  queryMetrics:
    ReadonlyMap<
      string,
      CanonicalObservedQueryMetricSet
    >;
}


export function normalizeObservedQuery(
  value:
    string
): string {
  return value
    .toLowerCase()
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-z0-9\s]/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}


function asRecord(
  value:
    unknown
): Record<
  string,
  unknown
> | null {
  if (
    typeof value !==
      "object" ||
    value ===
      null ||
    Array.isArray(
      value
    )
  ) {
    return null;
  }

  return value as
    Record<
      string,
      unknown
    >;
}


function finiteNumber(
  value:
    unknown
): number | undefined {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(
      value
    )
  )
    ? value
    : undefined;
}


function createMetricSet():
CanonicalObservedQueryMetricSet {
  return {
    searchVolume:
      new Set<number>(),

    cpc:
      new Set<number>(),

    gscImpressions:
      new Set<number>(),

    gscClicks:
      new Set<number>(),

    gscPosition:
      new Set<number>(),
  };
}


function addMetric(
  set:
    Set<number>,
  value:
    unknown
): void {
  const numeric =
    finiteNumber(
      value
    );

  if (
    numeric !==
      undefined
  ) {
    set.add(
      numeric
    );
  }
}


/*
 * CANONICAL_OBSERVED_QUERY_REGISTRY_V1
 *
 * This is the ONLY semantic definition of an observed query
 * in the Production Master pipeline.
 *
 * IMPORTANT:
 *
 * `keyword` is an observed acquisition identity.
 *
 * Generic `query` fields are deliberately NOT accepted because
 * they may originate from semantic/model/search-feature objects.
 *
 * Missing metrics remain missing.
 * No synthetic zero values are created.
 */
export function collectCanonicalObservedQueryEvidence({
  value,
  queryMetrics,
  queryStrings,
  queryTexts,
  depth = 0,
}: {
  value:
    unknown;

  queryMetrics:
    Map<
      string,
      CanonicalObservedQueryMetricSet
    >;

  queryStrings:
    Set<string>;

  queryTexts?:
    Map<
      string,
      string
    >;

  depth?:
    number;
}): void {
  if (
    depth >
      10
  ) {
    return;
  }


  if (
    Array.isArray(
      value
    )
  ) {
    for (
      const item
      of value
    ) {
      collectCanonicalObservedQueryEvidence({
        value:
          item,

        queryMetrics,

        queryStrings,

        queryTexts,

        depth:
          depth +
          1,
      });
    }

    return;
  }


  const record =
    asRecord(
      value
    );


  if (
    !record
  ) {
    return;
  }


  const keyword =
    typeof record.keyword ===
      "string"
      ? record.keyword.trim()
      : "";


  if (
    keyword
  ) {
    const key =
      normalizeObservedQuery(
        keyword
      );


    if (
      key
    ) {
      queryStrings.add(
        key
      );


      if (
        queryTexts &&
        !queryTexts.has(
          key
        )
      ) {
        queryTexts.set(
          key,
          keyword
        );
      }


      const metrics =
        queryMetrics.get(
          key
        ) ??
        createMetricSet();


      addMetric(
        metrics.searchVolume,
        record.searchVolume
      );


      addMetric(
        metrics.searchVolume,
        record.volume
      );


      addMetric(
        metrics.cpc,
        record.cpc
      );


      addMetric(
        metrics.gscImpressions,
        record.gscImpressions
      );


      addMetric(
        metrics.gscImpressions,
        record.impressions
      );


      addMetric(
        metrics.gscClicks,
        record.gscClicks
      );


      addMetric(
        metrics.gscClicks,
        record.clicks
      );


      addMetric(
        metrics.gscPosition,
        record.gscPosition
      );


      addMetric(
        metrics.gscPosition,
        record.position
      );


      queryMetrics.set(
        key,
        metrics
      );
    }
  }


  for (
    const nested
    of Object.values(
      record
    )
  ) {
    collectCanonicalObservedQueryEvidence({
      value:
        nested,

      queryMetrics,

      queryStrings,

      queryTexts,

      depth:
        depth +
        1,
    });
  }
}


export function buildCanonicalObservedQueryRegistry(
  values:
    readonly unknown[]
): CanonicalObservedQueryRegistry {
  const queryMetrics =
    new Map<
      string,
      CanonicalObservedQueryMetricSet
    >();


  const queryStrings =
    new Set<string>();


  const queryTexts =
    new Map<
      string,
      string
    >();


  for (
    const value
    of values
  ) {
    collectCanonicalObservedQueryEvidence({
      value,

      queryMetrics,

      queryStrings,

      queryTexts,
    });
  }


  return Object.freeze({
    queryStrings,

    queryTexts,

    queryMetrics,
  });
}
