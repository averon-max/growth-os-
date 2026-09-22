import type {
  QueryGraph,
} from "./query-graph";

import type {
  ClaimLedger,
} from "./claim-ledger";

import type {
  EvidenceGraph,
} from "./evidence-graph";

import type {
  OriginalValuePlan,
} from "./original-value";

import type {
  MasterSearchBlueprint,
} from "./master-search-blueprint";


export interface SectionBlueprint {
  heading:
    string;

  mission:
    string;

  queryNodeIds:
    readonly string[];

  requiredClaims:
    readonly string[];

  forbiddenClaims:
    readonly string[];

  evidenceIds:
    readonly string[];

  asset?:
    string;

  internalLinks:
    readonly string[];

  expectedOutcome:
    string;
}


export interface SectionBlueprintSet {
  version:
    "SECTION_BLUEPRINT_SET_V1";

  blueprintFingerprint:
    string;

  h1Mission:
    string;

  sections:
    readonly Readonly<SectionBlueprint>[];

  rules:
    readonly string[];
}


export interface SectionBlueprintInput {
  heading:
    string;

  mission:
    string;

  queryNodeIds?:
    string[];

  requiredClaims?:
    string[];

  forbiddenClaims?:
    string[];

  evidenceIds?:
    string[];

  asset?:
    string;

  internalLinks?:
    string[];

  expectedOutcome:
    string;
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


function unique(
  values:
    readonly string[]
): readonly string[] {
  const seen =
    new Set<string>();

  const output:
    string[] =
      [];

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


export function buildSectionBlueprintSet({
  blueprint,
  queryGraph,
  claimLedger,
  evidenceGraph,
  originalValue,
  sections,
}: {
  blueprint:
    Readonly<MasterSearchBlueprint>;

  queryGraph:
    Readonly<QueryGraph>;

  claimLedger:
    Readonly<ClaimLedger>;

  evidenceGraph:
    Readonly<EvidenceGraph>;

  originalValue:
    Readonly<OriginalValuePlan>;

  sections:
    SectionBlueprintInput[];
}): Readonly<SectionBlueprintSet> {
  if (
    blueprint.missionId !==
      queryGraph.missionId ||
    blueprint.missionId !==
      originalValue.missionId
  ) {
    throw new Error(
      "SECTION_BLUEPRINT_MISSION_MISMATCH"
    );
  }

  if (
    blueprint.action ===
    "NO_GO"
  ) {
    if (
      sections.length >
      0
    ) {
      throw new Error(
        "SECTION_BLUEPRINT_NO_GO_SECTIONS_FORBIDDEN"
      );
    }

    return Object.freeze({
      version:
        "SECTION_BLUEPRINT_SET_V1" as const,

      blueprintFingerprint:
        blueprint.fingerprint,

      h1Mission:
        blueprint.primaryQuery,

      sections:
        Object.freeze([]),

      rules:
        Object.freeze([
          "NO_GO_HAS_NO_ARTICLE_OUTLINE",
        ]),
    });
  }

  if (
    sections.length ===
    0
  ) {
    throw new Error(
      "SECTION_BLUEPRINT_AT_LEAST_ONE_SECTION_REQUIRED"
    );
  }

  const knownQueryNodes =
    new Set(
      queryGraph.nodes.map(
        (node) =>
          node.id
      )
    );

  const knownClaims =
    new Set(
      claimLedger.claims.map(
        (claim) =>
          claim.id
      )
    );

  const knownEvidence =
    new Set<string>([
      ...evidenceGraph.sources.map(
        (source) =>
          source.id
      ),

      ...evidenceGraph.claimEvidence.map(
        (evidence) =>
          evidence.id
      ),
    ]);

  const knownAssets =
    new Set(
      originalValue.assets.map(
        (asset) =>
          asset.id
      )
    );

  const headingKeys =
    new Set<string>();

  const missionKeys =
    new Set<string>();

  const output:
    SectionBlueprint[] =
      [];

  for (
    const input
    of sections
  ) {
    const heading =
      requiredText(
        input.heading,
        "SECTION_BLUEPRINT_HEADING_REQUIRED"
      );

    const mission =
      requiredText(
        input.mission,
        "SECTION_BLUEPRINT_MISSION_REQUIRED"
      );

    const expectedOutcome =
      requiredText(
        input.expectedOutcome,
        "SECTION_BLUEPRINT_EXPECTED_OUTCOME_REQUIRED"
      );

    const headingKey =
      heading.toLowerCase();

    if (
      headingKeys.has(
        headingKey
      )
    ) {
      throw new Error(
        "SECTION_BLUEPRINT_DUPLICATE_HEADING"
      );
    }

    headingKeys.add(
      headingKey
    );

    const missionKey =
      mission.toLowerCase();

    if (
      missionKeys.has(
        missionKey
      )
    ) {
      throw new Error(
        "SECTION_BLUEPRINT_DUPLICATE_INFORMATION_JOB"
      );
    }

    missionKeys.add(
      missionKey
    );

    const queryNodeIds =
      unique(
        input.queryNodeIds ??
        []
      );

    for (
      const id
      of queryNodeIds
    ) {
      if (
        !knownQueryNodes.has(
          id
        )
      ) {
        throw new Error(
          `SECTION_BLUEPRINT_UNKNOWN_QUERY_NODE:${id}`
        );
      }

      if (
        !blueprint.queryNodeIds.includes(
          id
        )
      ) {
        throw new Error(
          `SECTION_BLUEPRINT_QUERY_NODE_OUTSIDE_BLUEPRINT:${id}`
        );
      }
    }

    const requiredClaims =
      unique(
        input.requiredClaims ??
        []
      );

    const forbiddenClaims =
      unique(
        input.forbiddenClaims ??
        []
      );

    for (
      const id
      of [
        ...requiredClaims,
        ...forbiddenClaims,
      ]
    ) {
      if (
        !knownClaims.has(
          id
        )
      ) {
        throw new Error(
          `SECTION_BLUEPRINT_UNKNOWN_CLAIM:${id}`
        );
      }
    }

    const evidenceIds =
      unique(
        input.evidenceIds ??
        []
      );

    for (
      const id
      of evidenceIds
    ) {
      if (
        !knownEvidence.has(
          id
        )
      ) {
        throw new Error(
          `SECTION_BLUEPRINT_UNKNOWN_EVIDENCE:${id}`
        );
      }
    }

    const asset =
      input.asset
        ?.trim() ||
      undefined;

    if (
      asset &&
      !knownAssets.has(
        asset
      )
    ) {
      throw new Error(
        `SECTION_BLUEPRINT_UNKNOWN_ASSET:${asset}`
      );
    }

    const internalLinks =
      unique(
        input.internalLinks ??
        []
      );

    output.push(
      Object.freeze({
        heading,

        mission,

        queryNodeIds,

        requiredClaims,

        forbiddenClaims,

        evidenceIds,

        asset,

        internalLinks,

        expectedOutcome,
      })
    );
  }

  return Object.freeze({
    version:
      "SECTION_BLUEPRINT_SET_V1" as const,

    blueprintFingerprint:
      blueprint.fingerprint,

    /*
     * H1 represents the page mission.
     * It is not copied into bodyMarkdown as another heading.
     */
    h1Mission:
      blueprint.primaryQuery,

    sections:
      Object.freeze(
        output
      ),

    rules:
      Object.freeze([
        "H1_EQUALS_PAGE_MISSION",
        "ONE_INFORMATION_JOB_EQUALS_ONE_LOGICAL_SECTION",
        "H2_REPRESENTS_MAJOR_USER_JOB",
        "H3_ONLY_WHEN_DECOMPOSITION_IS_HELPFUL",
        "NO_PREDETERMINED_H2_COUNT",
        "NO_PREDETERMINED_H3_COUNT",
        "NO_COMPETITOR_HEADING_COUNT_TARGET",
        "NO_WORD_COUNT_TARGET_FROM_COMPETITORS",
      ]),
  });
}
