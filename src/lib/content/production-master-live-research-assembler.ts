import {
  collectCanonicalObservedQueryEvidence,
} from "./production-observed-query-registry";

import type {
  ProductionMasterLiveSourceResearch,
} from "./production-master-live-source-adapter";

import type {
  ProductionMasterArtifactPipelineInput,
} from "./production-master-artifact-builders";

import {
  assertProductionMasterSourceBundle,
  buildProductionMasterArtifactsFromSources,
  type ProductionMasterSourceBundle,
  type ProductionMasterSourceRecord,
} from "./production-master-source-assembler";


/*
 * STAGE 9N-B3
 * -----------
 *
 * This module is the production boundary between:
 *
 * real live acquisition
 *
 * and
 *
 * the canonical Stage 1-8 artifact builders.
 *
 * It performs no network requests.
 * It performs no database reads or writes.
 * It performs no AI inference.
 *
 * Semantic decisions remain explicit Stage 1-8 inputs.
 * This layer verifies that the inputs are anchored to the
 * current live research acquisition and then creates the
 * canonical ProductionMasterSourceBundle.
 */

export type ProductionMasterLiveStageContract =
  Omit<
    ProductionMasterArtifactPipelineInput,
    "serpResearch"
  >;


export interface ProductionMasterLiveResearchAssemblyInput {
  research:
    Readonly<
      ProductionMasterLiveSourceResearch
    >;

  stages:
    ProductionMasterLiveStageContract;
}


export class ProductionMasterLiveResearchAssemblyError
  extends Error {
  readonly code:
    string;


  constructor(
    code:
      string,
    message =
      code
  ) {
    super(
      message
    );

    this.name =
      "ProductionMasterLiveResearchAssemblyError";

    this.code =
      code;
  }
}


interface ObservedQueryMetricSet {
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


function normalize(
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
): Record<string, unknown> | null {
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
    Record<string, unknown>;
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
ObservedQueryMetricSet {
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


function collectObservedQueryEvidence({
  value,
  queryMetrics,
  queryStrings,
  depth = 0,
}: {
  value:
    unknown;

  queryMetrics:
    Map<
      string,
      ObservedQueryMetricSet
    >;

  queryStrings:
    Set<string>;

  depth?:
    number;
}): void {
  /*
   * CANONICAL_OBSERVED_QUERY_REGISTRY_V1
   *
   * Planner and assembler now share exactly one definition
   * of an observed query.
   */
  collectCanonicalObservedQueryEvidence({
    value,

    queryMetrics,

    queryStrings,

    depth,
  });
}


function liveObservedQueries(
  research:
    Readonly<
      ProductionMasterLiveSourceResearch
    >
): Readonly<{
  strings:
    Set<string>;

  metrics:
    Map<
      string,
      ObservedQueryMetricSet
    >;
}> {
  const strings =
    new Set<string>();

  const metrics =
    new Map<
      string,
      ObservedQueryMetricSet
    >();


  const primary =
    normalize(
      research.keyword
    );

  if (
    primary
  ) {
    strings.add(
      primary
    );
  }


  collectObservedQueryEvidence({
    value:
      research.keywordContext,

    queryMetrics:
      metrics,

    queryStrings:
      strings,
  });


  collectObservedQueryEvidence({
    value:
      research.dataForSeo,

    queryMetrics:
      metrics,

    queryStrings:
      strings,
  });


  for (
    const question
    of research.serpIntelligence
      .questions
  ) {
    const normalized =
      normalize(
        question
      );

    if (
      normalized
    ) {
      strings.add(
        normalized
      );
    }
  }


  return {
    strings,
    metrics,
  };
}


function assertObservedMetric({
  query,
  metric,
  value,
  observed,
}: {
  query:
    string;

  metric:
    keyof ObservedQueryMetricSet;

  value:
    number | undefined;

  observed:
    ObservedQueryMetricSet | undefined;
}): void {
  if (
    value ===
    undefined
  ) {
    return;
  }


  const allowed =
    observed?.[
      metric
    ];


  if (
    !allowed ||
    allowed.size ===
      0
  ) {
    throw new ProductionMasterLiveResearchAssemblyError(
      "LIVE_ASSEMBLY_QUERY_METRIC_NOT_OBSERVED",
      `LIVE_ASSEMBLY_QUERY_METRIC_NOT_OBSERVED:${metric}:${query}`
    );
  }


  if (
    !allowed.has(
      value
    )
  ) {
    throw new ProductionMasterLiveResearchAssemblyError(
      "LIVE_ASSEMBLY_QUERY_METRIC_MISMATCH",
      `LIVE_ASSEMBLY_QUERY_METRIC_MISMATCH:${metric}:${query}`
    );
  }
}


function assertQuerySignalsAnchored({
  research,
  stages,
}: {
  research:
    Readonly<
      ProductionMasterLiveSourceResearch
    >;

  stages:
    ProductionMasterLiveStageContract;
}): void {
  const evidence =
    liveObservedQueries(
      research
    );


  const primary =
    normalize(
      research.keyword
    );


  let primaryFound =
    false;


  for (
    const signal
    of stages.queryGraph
      .signals
  ) {
    const query =
      signal.query.trim();

    const normalized =
      normalize(
        query
      );


    if (
      !normalized ||
      !evidence.strings.has(
        normalized
      )
    ) {
      throw new ProductionMasterLiveResearchAssemblyError(
        "LIVE_ASSEMBLY_QUERY_NOT_OBSERVED",
        `LIVE_ASSEMBLY_QUERY_NOT_OBSERVED:${query}`
      );
    }


    if (
      normalized ===
      primary
    ) {
      primaryFound =
        true;
    }


    const observed =
      evidence.metrics.get(
        normalized
      );


    assertObservedMetric({
      query,
      metric:
        "searchVolume",
      value:
        signal.searchVolume,
      observed,
    });


    assertObservedMetric({
      query,
      metric:
        "cpc",
      value:
        signal.cpc,
      observed,
    });


    assertObservedMetric({
      query,
      metric:
        "gscImpressions",
      value:
        signal.gscImpressions,
      observed,
    });


    assertObservedMetric({
      query,
      metric:
        "gscClicks",
      value:
        signal.gscClicks,
      observed,
    });


    assertObservedMetric({
      query,
      metric:
        "gscPosition",
      value:
        signal.gscPosition,
      observed,
    });
  }


  if (
    !primaryFound
  ) {
    throw new ProductionMasterLiveResearchAssemblyError(
      "LIVE_ASSEMBLY_PRIMARY_QUERY_SIGNAL_MISSING"
    );
  }
}


function assertGapTopicsAnchored(
  stages:
    ProductionMasterLiveStageContract
): void {
  const expected =
    new Set(
      stages.expectedCoverage
        .topics
        .map(
          (item) =>
            normalize(
              item.topic
            )
        )
        .filter(
          Boolean
        )
    );


  for (
    const observation
    of stages.gaps
      .observations
  ) {
    if (
      !expected.has(
        normalize(
          observation.topic
        )
      )
    ) {
      throw new ProductionMasterLiveResearchAssemblyError(
        "LIVE_ASSEMBLY_GAP_TOPIC_NOT_IN_EXPECTED_COVERAGE",
        `LIVE_ASSEMBLY_GAP_TOPIC_NOT_IN_EXPECTED_COVERAGE:${observation.topic}`
      );
    }
  }
}


function assertLiveResearchIdentity({
  research,
  stages,
}: {
  research:
    Readonly<
      ProductionMasterLiveSourceResearch
    >;

  stages:
    ProductionMasterLiveStageContract;
}): void {
  if (
    research.version !==
    "PRODUCTION_MASTER_LIVE_SOURCE_V1"
  ) {
    throw new ProductionMasterLiveResearchAssemblyError(
      "LIVE_ASSEMBLY_RESEARCH_VERSION_INVALID"
    );
  }


  if (
    stages.mission
      .websiteId !==
    research.websiteId
  ) {
    throw new ProductionMasterLiveResearchAssemblyError(
      "LIVE_ASSEMBLY_WEBSITE_MISMATCH"
    );
  }


  if (
    normalize(
      research.serpSnapshot
        .keyword
    ) !==
    normalize(
      research.keyword
    )
  ) {
    throw new ProductionMasterLiveResearchAssemblyError(
      "LIVE_ASSEMBLY_SERP_KEYWORD_MISMATCH"
    );
  }


  if (
    research.serpSnapshot
      .results.length ===
    0
  ) {
    throw new ProductionMasterLiveResearchAssemblyError(
      "LIVE_ASSEMBLY_SERP_RESULTS_EMPTY"
    );
  }


  if (
    stages.queryGraph
      .signals.length ===
    0
  ) {
    throw new ProductionMasterLiveResearchAssemblyError(
      "LIVE_ASSEMBLY_QUERY_SIGNALS_EMPTY"
    );
  }


  if (
    stages.expectedCoverage
      .topics.length ===
    0
  ) {
    throw new ProductionMasterLiveResearchAssemblyError(
      "LIVE_ASSEMBLY_EXPECTED_COVERAGE_EMPTY"
    );
  }


  if (
    stages.gaps
      .observations.length ===
    0
  ) {
    throw new ProductionMasterLiveResearchAssemblyError(
      "LIVE_ASSEMBLY_GAP_OBSERVATIONS_EMPTY"
    );
  }


  if (
    stages.evidenceGraph
      .sources.length ===
    0
  ) {
    throw new ProductionMasterLiveResearchAssemblyError(
      "LIVE_ASSEMBLY_EVIDENCE_SOURCES_EMPTY"
    );
  }


  if (
    stages.sectionBlueprints
      .sections.length ===
    0
  ) {
    throw new ProductionMasterLiveResearchAssemblyError(
      "LIVE_ASSEMBLY_SECTION_BLUEPRINTS_EMPTY"
    );
  }
}


function sourceRecordKey(
  item:
    Readonly<
      ProductionMasterSourceRecord
    >
): string {
  return [
    item.stage,
    item.source,
    item.ref,
  ].join(
    "\u0000"
  );
}


function mergeProvenance(
  research:
    Readonly<
      ProductionMasterLiveSourceResearch
    >,

  stages:
    ProductionMasterLiveStageContract
): readonly Readonly<
  ProductionMasterSourceRecord
>[] {
  const evidenceRef =
    stages.evidenceGraph
      .sources
      .map(
        (source) =>
          source.id
      )
      .filter(
        Boolean
      )
      .slice(
        0,
        20
      )
      .join(
        ","
      );


  const derived:
    ProductionMasterSourceRecord[] = [
      {
        stage:
          "SEARCH_MISSION",

        source:
          "USER_EXPLICIT",

        ref:
          `mission:${stages.mission.id}`,
      },

      {
        stage:
          "QUERY_GRAPH",

        source:
          "DETERMINISTIC_DERIVATION",

        ref:
          `live-query-research:${research.websiteId}:${normalize(research.keyword)}`,
      },

      {
        stage:
          "SERP_RESEARCH",

        source:
          "LIVE_SERP",

        ref:
          research.serpSnapshot
            .fingerprint,
      },

      {
        stage:
          "EXPECTED_COVERAGE",

        source:
          "DETERMINISTIC_DERIVATION",

        ref:
          `expected-coverage:${research.serpSnapshot.fingerprint}`,
      },

      {
        stage:
          "GAP_ANALYSIS",

        source:
          "DETERMINISTIC_DERIVATION",

        ref:
          `gap-analysis:${research.serpSnapshot.fingerprint}`,
      },

      {
        stage:
          "ORIGINAL_VALUE",

        source:
          "DETERMINISTIC_DERIVATION",

        ref:
          `original-value:${stages.originalValue.assets.length}`,
      },

      {
        stage:
          "EVIDENCE_GRAPH",

        source:
          "VERIFIED_EXTERNAL_EVIDENCE",

        ref:
          evidenceRef ||
          "verified-evidence",
      },

      {
        stage:
          "CLAIM_LEDGER",

        source:
          "DETERMINISTIC_DERIVATION",

        ref:
          `claim-ledger:${stages.claimLedger.claims.length}`,
      },

      {
        stage:
          "MASTER_BLUEPRINT",

        source:
          "DETERMINISTIC_DERIVATION",

        ref:
          `master-blueprint:${research.serpSnapshot.fingerprint}`,
      },

      {
        stage:
          "SECTION_BLUEPRINTS",

        source:
          "DETERMINISTIC_DERIVATION",

        ref:
          `section-blueprints:${stages.sectionBlueprints.sections.length}`,
      },
    ];


  const seen =
    new Set<string>();

  const merged:
    ProductionMasterSourceRecord[] =
      [];


  for (
    const item
    of [
      ...research.provenance,
      ...derived,
    ]
  ) {
    const key =
      sourceRecordKey(
        item
      );

    if (
      seen.has(
        key
      )
    ) {
      continue;
    }

    seen.add(
      key
    );

    merged.push({
      stage:
        item.stage,

      source:
        item.source,

      ref:
        item.ref.trim(),
    });
  }


  return Object.freeze(
    merged.map(
      (item) =>
        Object.freeze(
          item
        )
    )
  );
}


export function buildProductionMasterLiveSourceBundle(
  input:
    ProductionMasterLiveResearchAssemblyInput
): Readonly<
  ProductionMasterSourceBundle
> {
  const {
    research,
    stages,
  } =
    input;


  assertLiveResearchIdentity({
    research,
    stages,
  });


  assertQuerySignalsAnchored({
    research,
    stages,
  });


  assertGapTopicsAnchored(
    stages
  );


  const serpResearch:
    ProductionMasterArtifactPipelineInput[
      "serpResearch"
    ] =
      research.serpSnapshot;


  const bundle:
    ProductionMasterSourceBundle = {
      input: {
        ...stages,

        serpResearch,
      },

      provenance:
        mergeProvenance(
          research,
          stages
        ),
    };


  /*
   * This is intentionally called before returning.
   *
   * A malformed source bundle never reaches the canonical
   * Stage 1-8 builders.
   */
  assertProductionMasterSourceBundle(
    bundle
  );


  return Object.freeze({
    input:
      bundle.input,

    provenance:
      bundle.provenance,
  });
}


export function buildProductionMasterArtifactsFromLiveResearch(
  input:
    ProductionMasterLiveResearchAssemblyInput
) {
  const bundle =
    buildProductionMasterLiveSourceBundle(
      input
    );


  return buildProductionMasterArtifactsFromSources(
    bundle
  );
}
