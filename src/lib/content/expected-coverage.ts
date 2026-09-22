import type {
  QueryGraph,
} from "./query-graph";

import type {
  SearchMission,
} from "./search-mission";


export type ExpectedCoverageRole =
  | "REQUIRED"
  | "SUPPORTING"
  | "OPPORTUNITY"
  | "EXCLUDED";


export type ExpectedCoverageArticleFit =
  | "SAME_PAGE"
  | "CLUSTER"
  | "SEPARATE_PAGE"
  | "UNCERTAIN";


export type CoverageEvidenceRequirement =
  | "NONE"
  | "STANDARD"
  | "VERIFIED_SOURCE"
  | "PRIMARY_SOURCE";


export interface ExpectedCoverageTopicInput {
  topic:
    string;

  missionRelevance:
    number;

  queryNodeIds?:
    string[];

  serpOccurrences?:
    number | null;

  serpEligibleResults?:
    number | null;

  paaFrequency?:
    number | null;

  evidenceRequirement:
    CoverageEvidenceRequirement;

  articleFit?:
    ExpectedCoverageArticleFit;
}


export interface ExpectedCoverageDemand {
  queryNodes:
    number;

  knownSearchVolume:
    number | null;

  knownGscImpressions:
    number | null;
}


export interface ExpectedCoverageItem {
  topic:
    string;

  role:
    ExpectedCoverageRole;

  missionRelevance:
    number;

  queryDemand:
    Readonly<ExpectedCoverageDemand>;

  serpFrequency:
    number | null;

  paaFrequency:
    number | null;

  evidenceRequirement:
    CoverageEvidenceRequirement;

  articleFit:
    ExpectedCoverageArticleFit;

  queryNodeIds:
    readonly string[];

  evidence:
    readonly string[];
}


export interface ExpectedCoverageModel {
  version:
    "EXPECTED_COVERAGE_V1";

  missionId:
    string;

  queryGraphVersion:
    string;

  items:
    readonly ExpectedCoverageItem[];

  requiredTopics:
    readonly string[];

  supportingTopics:
    readonly string[];

  opportunityTopics:
    readonly string[];

  excludedTopics:
    readonly string[];

  evidence:
    readonly string[];
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


function sumKnown(
  values:
    Array<
      number |
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


function inferArticleFit({
  queryGraph,
  queryNodeIds,
}: {
  queryGraph:
    Readonly<QueryGraph>;

  queryNodeIds:
    readonly string[];
}): ExpectedCoverageArticleFit {
  if (
    queryNodeIds.length ===
    0
  ) {
    return "UNCERTAIN";
  }

  const decisions =
    queryGraph.boundaries
      .filter(
        (boundary) =>
          queryNodeIds.includes(
            boundary.nodeId
          )
      )
      .map(
        (boundary) =>
          boundary.decision
      );

  if (
    decisions.includes(
      "SEPARATE_PAGE"
    )
  ) {
    return "SEPARATE_PAGE";
  }

  if (
    decisions.includes(
      "SAME_PAGE"
    ) ||
    decisions.includes(
      "MERGE"
    )
  ) {
    return "SAME_PAGE";
  }

  if (
    decisions.includes(
      "CLUSTER"
    )
  ) {
    return "CLUSTER";
  }

  return "UNCERTAIN";
}


function deriveRole({
  missionRelevance,
  articleFit,
  queryNodes,
  serpFrequency,
  paaFrequency,
}: {
  missionRelevance:
    number;

  articleFit:
    ExpectedCoverageArticleFit;

  queryNodes:
    number;

  serpFrequency:
    number | null;

  paaFrequency:
    number | null;
}): ExpectedCoverageRole {
  if (
    articleFit ===
    "SEPARATE_PAGE"
  ) {
    return "EXCLUDED";
  }

  /*
   * Transparent editorial heuristics.
   * They are NOT Google thresholds and do not imply
   * that SERP consensus is an article blueprint.
   */
  if (
    articleFit ===
      "SAME_PAGE" &&
    (
      missionRelevance >=
        0.75 ||
      (
        queryNodes >
          0 &&
        (
          (
            serpFrequency !==
              null &&
            serpFrequency >=
              0.5
          ) ||
          (
            paaFrequency !==
              null &&
            paaFrequency >
              0
          )
        )
      )
    )
  ) {
    return "REQUIRED";
  }

  if (
    (
      articleFit ===
        "SAME_PAGE" ||
      articleFit ===
        "CLUSTER"
    ) &&
    (
      missionRelevance >=
        0.4 ||
      queryNodes >
        0 ||
      (
        serpFrequency !==
          null &&
        serpFrequency >
          0
      )
    )
  ) {
    return "SUPPORTING";
  }

  return "OPPORTUNITY";
}


export function buildExpectedCoverageModel({
  mission,
  queryGraph,
  topics,
}: {
  mission:
    Readonly<SearchMission>;

  queryGraph:
    Readonly<QueryGraph>;

  topics:
    ExpectedCoverageTopicInput[];
}): Readonly<ExpectedCoverageModel> {
  if (
    queryGraph.missionId !==
    mission.id
  ) {
    throw new Error(
      "EXPECTED_COVERAGE_MISSION_GRAPH_MISMATCH"
    );
  }

  const seen =
    new Set<string>();

  const items:
    ExpectedCoverageItem[] =
      [];

  for (
    const input
    of topics
  ) {
    const topic =
      input.topic.trim();

    if (
      !topic
    ) {
      throw new Error(
        "EXPECTED_COVERAGE_TOPIC_REQUIRED"
      );
    }

    const normalized =
      normalize(
        topic
      );

    if (
      seen.has(
        normalized
      )
    ) {
      throw new Error(
        "EXPECTED_COVERAGE_DUPLICATE_TOPIC"
      );
    }

    seen.add(
      normalized
    );

    if (
      !Number.isFinite(
        input.missionRelevance
      ) ||
      input.missionRelevance <
        0 ||
      input.missionRelevance >
        1
    ) {
      throw new Error(
        "EXPECTED_COVERAGE_MISSION_RELEVANCE_INVALID"
      );
    }

    const queryNodeIds = [
      ...new Set(
        input.queryNodeIds ??
        []
      ),
    ];

    const queryNodes =
      queryGraph.nodes.filter(
        (node) =>
          queryNodeIds.includes(
            node.id
          )
      );

    if (
      queryNodes.length !==
      queryNodeIds.length
    ) {
      throw new Error(
        "EXPECTED_COVERAGE_QUERY_NODE_UNKNOWN"
      );
    }

    const articleFit =
      input.articleFit ??
      inferArticleFit({
        queryGraph,
        queryNodeIds,
      });

    let serpFrequency:
      number |
      null =
        null;

    if (
      input.serpOccurrences !==
        undefined &&
      input.serpOccurrences !==
        null &&
      input.serpEligibleResults !==
        undefined &&
      input.serpEligibleResults !==
        null
    ) {
      if (
        input.serpOccurrences <
          0 ||
        input.serpEligibleResults <
          0 ||
        input.serpOccurrences >
          input.serpEligibleResults
      ) {
        throw new Error(
          "EXPECTED_COVERAGE_SERP_FREQUENCY_INVALID"
        );
      }

      serpFrequency =
        input.serpEligibleResults >
        0
          ? Number(
              (
                input.serpOccurrences /
                input.serpEligibleResults
              ).toFixed(
                4
              )
            )
          : null;
    }

    const paaFrequency =
      input.paaFrequency ??
      null;

    if (
      paaFrequency !==
        null &&
      (
        !Number.isFinite(
          paaFrequency
        ) ||
        paaFrequency <
          0
      )
    ) {
      throw new Error(
        "EXPECTED_COVERAGE_PAA_FREQUENCY_INVALID"
      );
    }

    const demand:
      ExpectedCoverageDemand = {
        queryNodes:
          queryNodes.length,

        knownSearchVolume:
          sumKnown(
            queryNodes.map(
              (node) =>
                node.searchVolume
            )
          ),

        knownGscImpressions:
          sumKnown(
            queryNodes.map(
              (node) =>
                node.gscImpressions
            )
          ),
      };

    const role =
      deriveRole({
        missionRelevance:
          clamp01(
            input.missionRelevance
          ),

        articleFit,

        queryNodes:
          queryNodes.length,

        serpFrequency,

        paaFrequency,
      });

    const evidence =
      new Set<string>();

    if (
      queryNodes.length >
      0
    ) {
      evidence.add(
        "QUERY_GRAPH"
      );
    }

    if (
      serpFrequency !==
      null
    ) {
      evidence.add(
        "SERP_FREQUENCY"
      );
    }

    if (
      paaFrequency !==
        null &&
      paaFrequency >
        0
    ) {
      evidence.add(
        "PAA"
      );
    }

    evidence.add(
      "MISSION_RELEVANCE"
    );

    items.push(
      Object.freeze({
        topic,

        role,

        missionRelevance:
          clamp01(
            input.missionRelevance
          ),

        queryDemand:
          Object.freeze(
            demand
          ),

        serpFrequency,

        paaFrequency,

        evidenceRequirement:
          input.evidenceRequirement,

        articleFit,

        queryNodeIds:
          Object.freeze(
            queryNodeIds
          ),

        evidence:
          Object.freeze([
            ...evidence,
          ]),
      })
    );
  }

  const namesFor =
    (
      role:
        ExpectedCoverageRole
    ) =>
      items
        .filter(
          (item) =>
            item.role ===
            role
        )
        .map(
          (item) =>
            item.topic
        );

  return Object.freeze({
    version:
      "EXPECTED_COVERAGE_V1" as const,

    missionId:
      mission.id,

    queryGraphVersion:
      queryGraph.version,

    items:
      Object.freeze(
        items
      ),

    requiredTopics:
      Object.freeze(
        namesFor(
          "REQUIRED"
        )
      ),

    supportingTopics:
      Object.freeze(
        namesFor(
          "SUPPORTING"
        )
      ),

    opportunityTopics:
      Object.freeze(
        namesFor(
          "OPPORTUNITY"
        )
      ),

    excludedTopics:
      Object.freeze(
        namesFor(
          "EXCLUDED"
        )
      ),

    evidence:
      Object.freeze([
        "MISSION",
        "QUERY_GRAPH",
        "SERP_OBSERVATIONS_WHEN_AVAILABLE",
        "SERP_CONSENSUS_IS_NOT_A_BLUEPRINT",
      ]),
  });
}
