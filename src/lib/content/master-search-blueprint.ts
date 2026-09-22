import type {
  SearchMission,
} from "./search-mission";

import type {
  QueryGraph,
} from "./query-graph";

import type {
  ExpectedCoverageModel,
} from "./expected-coverage";

import type {
  GapAnalysis,
} from "./gap-engine";

import type {
  OriginalValuePlan,
} from "./original-value";

import type {
  ClaimLedger,
} from "./claim-ledger";

import type {
  EvidenceGraph,
} from "./evidence-graph";


export type MasterSearchAction =
  | "CREATE"
  | "UPDATE"
  | "MERGE"
  | "SPLIT"
  | "REPOSITION"
  | "NO_GO";


export interface MasterSearchBlueprint {
  version:
    "MASTER_SEARCH_BLUEPRINT_V1";

  revision:
    number;

  missionId:
    string;

  action:
    MasterSearchAction;

  targetUrl?:
    string;

  primaryQuery:
    string;

  queryNodeIds:
    readonly string[];

  intent:
    string;

  pageType:
    string;

  requiredTopics:
    readonly string[];

  supportingTopics:
    readonly string[];

  excludedTopics:
    readonly string[];

  requiredEntities:
    readonly string[];

  questions:
    readonly string[];

  evidenceIds:
    readonly string[];

  requiredClaims:
    readonly string[];

  forbiddenClaims:
    readonly string[];

  competitorStrengths:
    readonly string[];

  competitorWeaknesses:
    readonly string[];

  gaps:
    readonly string[];

  originalAssets:
    readonly string[];

  internalLinkTargets:
    readonly string[];

  technicalRequirements:
    readonly string[];

  conversionGoal?:
    string;

  fingerprint:
    string;
}


export interface BuildMasterSearchBlueprintInput {
  mission:
    Readonly<SearchMission>;

  queryGraph:
    Readonly<QueryGraph>;

  expectedCoverage:
    Readonly<ExpectedCoverageModel>;

  gaps:
    Readonly<GapAnalysis>;

  originalValue:
    Readonly<OriginalValuePlan>;

  claimLedger:
    Readonly<ClaimLedger>;

  evidenceGraph:
    Readonly<EvidenceGraph>;

  action:
    MasterSearchAction;

  targetUrl?:
    string;

  primaryQuery:
    string;

  queryNodeIds:
    string[];

  intent:
    string;

  pageType:
    string;

  requiredEntities?:
    string[];

  questions?:
    string[];

  evidenceIds?:
    string[];

  requiredClaims?:
    string[];

  forbiddenClaims?:
    string[];

  competitorStrengths?:
    string[];

  competitorWeaknesses?:
    string[];

  internalLinkTargets?:
    string[];

  technicalRequirements?:
    string[];

  conversionGoal?:
    string;

  revision?:
    number;
}


function requiredText(
  value: string,
  code: string
): string {
  const clean =
    value.trim();

  if (
    !clean
  ) {
    throw new Error(
      code
    );
  }

  return clean;
}


function uniqueStrings(
  values:
    readonly string[]
): readonly string[] {
  const output:
    string[] =
      [];

  const seen =
    new Set<string>();

  for (
    const raw
    of values
  ) {
    const value =
      raw.trim();

    if (
      !value
    ) {
      continue;
    }

    const key =
      value.toLowerCase();

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

    output.push(
      value
    );
  }

  return Object.freeze(
    output
  );
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


function assertMissionAlignment({
  mission,
  queryGraph,
  expectedCoverage,
  gaps,
  originalValue,
}: {
  mission:
    Readonly<SearchMission>;

  queryGraph:
    Readonly<QueryGraph>;

  expectedCoverage:
    Readonly<ExpectedCoverageModel>;

  gaps:
    Readonly<GapAnalysis>;

  originalValue:
    Readonly<OriginalValuePlan>;
}): void {
  const missionIds = [
    queryGraph.missionId,
    expectedCoverage.missionId,
    gaps.missionId,
    originalValue.missionId,
  ];

  if (
    missionIds.some(
      (missionId) =>
        missionId !==
        mission.id
    )
  ) {
    throw new Error(
      "MASTER_BLUEPRINT_MISSION_MISMATCH"
    );
  }
}


function assertQueryNodesExist({
  queryGraph,
  queryNodeIds,
}: {
  queryGraph:
    Readonly<QueryGraph>;

  queryNodeIds:
    readonly string[];
}): void {
  const known =
    new Set(
      queryGraph.nodes.map(
        (node) =>
          node.id
      )
    );

  for (
    const id
    of queryNodeIds
  ) {
    if (
      !known.has(
        id
      )
    ) {
      throw new Error(
        `MASTER_BLUEPRINT_UNKNOWN_QUERY_NODE:${id}`
      );
    }
  }
}


function assertEvidenceExists({
  graph,
  evidenceIds,
}: {
  graph:
    Readonly<EvidenceGraph>;

  evidenceIds:
    readonly string[];
}): void {
  const known =
    new Set<string>([
      ...graph.sources.map(
        (source) =>
          source.id
      ),

      ...graph.claimEvidence.map(
        (evidence) =>
          evidence.id
      ),
    ]);

  for (
    const id
    of evidenceIds
  ) {
    if (
      !known.has(
        id
      )
    ) {
      throw new Error(
        `MASTER_BLUEPRINT_UNKNOWN_EVIDENCE:${id}`
      );
    }
  }
}


function assertClaimsExist({
  ledger,
  claimIds,
}: {
  ledger:
    Readonly<ClaimLedger>;

  claimIds:
    readonly string[];
}): void {
  const known =
    new Set(
      ledger.claims.map(
        (claim) =>
          claim.id
      )
    );

  for (
    const id
    of claimIds
  ) {
    if (
      !known.has(
        id
      )
    ) {
      throw new Error(
        `MASTER_BLUEPRINT_UNKNOWN_CLAIM:${id}`
      );
    }
  }
}


function assertOriginalAssetsExist({
  plan,
  assetIds,
}: {
  plan:
    Readonly<OriginalValuePlan>;

  assetIds:
    readonly string[];
}): void {
  const known =
    new Set(
      plan.assets.map(
        (asset) =>
          asset.id
      )
    );

  for (
    const id
    of assetIds
  ) {
    if (
      !known.has(
        id
      )
    ) {
      throw new Error(
        `MASTER_BLUEPRINT_UNKNOWN_ORIGINAL_ASSET:${id}`
      );
    }
  }
}


export function buildMasterSearchBlueprint(
  input:
    BuildMasterSearchBlueprintInput
): Readonly<MasterSearchBlueprint> {
  assertMissionAlignment({
    mission:
      input.mission,

    queryGraph:
      input.queryGraph,

    expectedCoverage:
      input.expectedCoverage,

    gaps:
      input.gaps,

    originalValue:
      input.originalValue,
  });

  const revision =
    input.revision ??
    1;

  if (
    !Number.isInteger(
      revision
    ) ||
    revision <
      1
  ) {
    throw new Error(
      "MASTER_BLUEPRINT_REVISION_INVALID"
    );
  }

  const primaryQuery =
    requiredText(
      input.primaryQuery,
      "MASTER_BLUEPRINT_PRIMARY_QUERY_REQUIRED"
    );

  const intent =
    requiredText(
      input.intent,
      "MASTER_BLUEPRINT_INTENT_REQUIRED"
    );

  const pageType =
    requiredText(
      input.pageType,
      "MASTER_BLUEPRINT_PAGE_TYPE_REQUIRED"
    );

  const targetUrl =
    input.targetUrl
      ?.trim() ||
    undefined;

  if (
    input.action !==
      "CREATE" &&
    input.action !==
      "NO_GO" &&
    !targetUrl
  ) {
    throw new Error(
      "MASTER_BLUEPRINT_TARGET_URL_REQUIRED"
    );
  }

  if (
    input.action ===
      "NO_GO" &&
    targetUrl
  ) {
    throw new Error(
      "MASTER_BLUEPRINT_NO_GO_TARGET_URL_FORBIDDEN"
    );
  }

  const queryNodeIds =
    uniqueStrings(
      input.queryNodeIds
    );

  assertQueryNodesExist({
    queryGraph:
      input.queryGraph,

    queryNodeIds,
  });

  const evidenceIds =
    uniqueStrings(
      input.evidenceIds ??
      []
    );

  assertEvidenceExists({
    graph:
      input.evidenceGraph,

    evidenceIds,
  });

  const requiredClaims =
    uniqueStrings(
      input.requiredClaims ??
      []
    );

  const forbiddenClaims =
    uniqueStrings(
      input.forbiddenClaims ??
      []
    );

  assertClaimsExist({
    ledger:
      input.claimLedger,

    claimIds: [
      ...requiredClaims,
      ...forbiddenClaims,
    ],
  });

  const originalAssets =
    uniqueStrings(
      input.originalValue.assets.map(
        (asset) =>
          asset.id
      )
    );

  assertOriginalAssetsExist({
    plan:
      input.originalValue,

    assetIds:
      originalAssets,
  });

  if (
    input.action !==
      "NO_GO" &&
    input.originalValue.gate ===
      "REJECTED"
  ) {
    throw new Error(
      "MASTER_BLUEPRINT_ORIGINAL_VALUE_REJECTED"
    );
  }

  const blueprintWithoutFingerprint = {
    version:
      "MASTER_SEARCH_BLUEPRINT_V1" as const,

    revision,

    missionId:
      input.mission.id,

    action:
      input.action,

    targetUrl,

    primaryQuery,

    queryNodeIds,

    intent,

    pageType,

    requiredTopics:
      uniqueStrings(
        input.expectedCoverage
          .requiredTopics
      ),

    supportingTopics:
      uniqueStrings(
        input.expectedCoverage
          .supportingTopics
      ),

    excludedTopics:
      uniqueStrings(
        input.expectedCoverage
          .excludedTopics
      ),

    requiredEntities:
      uniqueStrings(
        input.requiredEntities ??
        []
      ),

    questions:
      uniqueStrings(
        input.questions ??
        []
      ),

    evidenceIds,

    requiredClaims,

    forbiddenClaims,

    competitorStrengths:
      uniqueStrings(
        input.competitorStrengths ??
        []
      ),

    competitorWeaknesses:
      uniqueStrings(
        input.competitorWeaknesses ??
        []
      ),

    gaps:
      uniqueStrings(
        input.gaps.gaps.map(
          (gap) =>
            `${gap.type}:${gap.topic}`
        )
      ),

    originalAssets,

    internalLinkTargets:
      uniqueStrings(
        input.internalLinkTargets ??
        []
      ),

    technicalRequirements:
      uniqueStrings(
        input.technicalRequirements ??
        []
      ),

    conversionGoal:
      input.conversionGoal
        ?.trim() ||
      undefined,
  };

  const fingerprint =
    stableHash(
      JSON.stringify(
        blueprintWithoutFingerprint
      )
    );

  return Object.freeze({
    ...blueprintWithoutFingerprint,

    fingerprint,
  });
}


export function reviseMasterSearchBlueprint({
  previous,
  input,
}: {
  previous:
    Readonly<MasterSearchBlueprint>;

  input:
    Omit<
      BuildMasterSearchBlueprintInput,
      "revision"
    >;
}): Readonly<MasterSearchBlueprint> {
  return buildMasterSearchBlueprint({
    ...input,

    revision:
      previous.revision +
      1,
  });
}
