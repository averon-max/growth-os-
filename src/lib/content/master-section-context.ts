import type {
  SectionGenerationContractV1,
} from "./article-generation-contract";


type UnknownRecord =
  Record<
    string,
    unknown
  >;


function record(
  value:
    unknown
): UnknownRecord | null {
  return (
    value !==
      null &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value
    )
  )
    ? value as
        UnknownRecord
    : null;
}


function array(
  value:
    unknown
): readonly unknown[] {
  return Array.isArray(
    value
  )
    ? value
    : [];
}


function strings(
  value:
    unknown
): readonly string[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  return value
    .filter(
      (
        item
      ): item is string =>
        typeof item ===
          "string" &&
        item.trim().length >
          0
    )
    .map(
      (
        item
      ) =>
        item.trim()
    );
}


function clip(
  value:
    unknown,
  max =
    1200
): unknown {
  if (
    typeof value !==
      "string"
  ) {
    return value;
  }

  if (
    value.length <=
      max
  ) {
    return value;
  }

  return (
    value.slice(
      0,
      max
    ) +
    "…"
  );
}


function compactRecord(
  value:
    unknown,
  keys:
    readonly string[]
): UnknownRecord {
  const source =
    record(
      value
    );

  if (
    !source
  ) {
    return {};
  }

  const output:
    UnknownRecord = {};

  for (
    const key
    of keys
  ) {
    if (
      source[key] ===
      undefined
    ) {
      continue;
    }

    output[key] =
      clip(
        source[key]
      );
  }

  return output;
}


function recordsById(
  value:
    unknown,
  ids:
    ReadonlySet<string>
): readonly UnknownRecord[] {
  return array(
    value
  )
    .map(
      record
    )
    .filter(
      (
        item
      ): item is UnknownRecord =>
        Boolean(
          item
        )
    )
    .filter(
      (
        item
      ) =>
        typeof item.id ===
          "string" &&
        ids.has(
          item.id
        )
    );
}


function compactStringArray(
  value:
    unknown,
  limit =
    16
): readonly string[] {
  return strings(
    value
  )
    .slice(
      0,
      limit
    )
    .map(
      (
        item
      ) =>
        String(
          clip(
            item,
            300
          )
        )
    );
}


/*
 * SECTION_SCOPED_AUTHORITY_CONTEXT_V1
 *
 * The Master Runtime remains complete and immutable.
 *
 * Only the provider prompt is projected to the exact
 * information this one H2 is allowed to use.
 *
 * Nothing is inferred or invented here.
 */
export function buildSectionScopedAuthorityContextV1(
  contract:
    Readonly<
      SectionGenerationContractV1
    >
): Readonly<
  UnknownRecord
> {
  const blueprint =
    record(
      contract.blueprint
    ) ??
    {};


  const queryNodeIds =
    new Set(
      strings(
        blueprint
          .queryNodeIds
      )
    );


  const requiredClaimIds =
    new Set(
      strings(
        blueprint
          .requiredClaims
      )
    );


  const forbiddenClaimIds =
    new Set(
      strings(
        blueprint
          .forbiddenClaims
      )
    );


  const relevantClaimIds =
    new Set([
      ...requiredClaimIds,
      ...forbiddenClaimIds,
    ]);


  const assignedEvidenceIds =
    new Set(
      strings(
        blueprint
          .evidenceIds
      )
    );


  const assignedInternalLinks =
    new Set(
      strings(
        blueprint
          .internalLinks
      )
    );


  const assignedAssetId =
    typeof blueprint.asset ===
      "string" &&
    blueprint.asset.trim()
      ? blueprint.asset.trim()
      : null;


  const queryGraph =
    record(
      contract.queryGraph
    ) ??
    {};


  const selectedQueryNodes =
    recordsById(
      queryGraph.nodes,
      queryNodeIds
    ).map(
      (
        node
      ) =>
        compactRecord(
          node,
          [
            "id",
            "query",
            "intent",
            "subIntent",
            "cluster",
            "siteCoverage",
            "searchVolume",
            "cpc",
            "gscImpressions",
            "gscClicks",
            "gscPosition",
            "serpFrequency",
            "source",
            "sourceConfidence",
          ]
        )
    );


  const claimLedger =
    record(
      contract.claimLedger
    ) ??
    {};


  const selectedClaims =
    recordsById(
      claimLedger.claims,
      relevantClaimIds
    ).map(
      (
        claim
      ) =>
        compactRecord(
          claim,
          [
            "id",
            "text",
            "category",
            "risk",
            "jurisdiction",
            "evidenceIds",
            "status",
          ]
        )
    );


  const evidenceGraph =
    record(
      contract.evidenceGraph
    ) ??
    {};


  const selectedClaimEvidence =
    array(
      evidenceGraph
        .claimEvidence
    )
      .map(
        record
      )
      .filter(
        (
          item
        ): item is UnknownRecord =>
          Boolean(
            item
          )
      )
      .filter(
        (
          item
        ) => {
          const id =
            typeof item.id ===
              "string"
              ? item.id
              : "";

          const claimId =
            typeof item.claimId ===
              "string"
              ? item.claimId
              : "";

          return (
            assignedEvidenceIds.has(
              id
            ) ||
            relevantClaimIds.has(
              claimId
            )
          );
        }
      )
      .map(
        (
          evidence
        ): UnknownRecord => ({
          ...compactRecord(
            evidence,
            [
              "id",
              "claimId",
              "sourceId",
              "relation",
              "kind",
            ]
          ),

          ...(
            typeof evidence.excerpt ===
              "string"
              ? {
                  excerpt:
                    clip(
                      evidence.excerpt,
                      900
                    ),
                }
              : {}
          ),
        })
      );


  const requiredSourceIds =
    new Set<string>(
      [
        ...assignedEvidenceIds,

        ...selectedClaimEvidence
          .map(
            (
              evidence
            ) =>
              typeof evidence.sourceId ===
                "string"
                ? evidence.sourceId
                : ""
          )
          .filter(
            Boolean
          ),
      ]
    );


  const selectedSources =
    recordsById(
      evidenceGraph.sources,
      requiredSourceIds
    ).map(
      (
        source
      ) =>
        compactRecord(
          source,
          [
            "id",
            "url",
            "publisher",
            "sourceType",
            "authorityTier",
            "jurisdiction",
            "publishedAt",
            "updatedAt",
            "retrievedAt",
          ]
        )
    );


  const originalValue =
    record(
      contract.originalValue
    ) ??
    {};


  const originalAssetIds =
    new Set(
      assignedAssetId
        ? [
            assignedAssetId,
          ]
        : []
    );


  const selectedAssets =
    recordsById(
      originalValue.assets,
      originalAssetIds
    ).map(
      (
        asset
      ) =>
        compactRecord(
          asset,
          [
            "id",
            "type",
            "title",
            "description",
            "firstParty",
            "verified",
            "evidenceIds",
          ]
        )
    );


  const internalLinks =
    array(
      contract
        .internalLinkPlan
    )
      .map(
        record
      )
      .filter(
        (
          item
        ): item is UnknownRecord =>
          Boolean(
            item
          )
      )
      .filter(
        (
          item
        ) => {
          const toUrl =
            typeof item.toUrl ===
              "string"
              ? item.toUrl
              : "";

          return (
            assignedInternalLinks.has(
              toUrl
            )
          );
        }
      )
      .map(
        (
          link
        ) =>
          compactRecord(
            link,
            [
              "fromUrl",
              "toUrl",
              "anchor",
              "reason",
            ]
          )
      );


  const searchBlueprint =
    record(
      contract
        .searchBlueprint
    ) ??
    {};


  const mission =
    compactRecord(
      contract.mission,
      [
        "id",
        "audience",
        "readerGoal",
        "businessRelationship",
        "jurisdiction",
        "language",
        "location",
        "riskClass",
      ]
    );


    /*
   * SECTION_EXECUTION_PLAN_AUTHORITY_CONTEXT_V1
   *
   * Bound by ArticleExecutionPlan before the Writer runs.
   * Kept optional here only so isolated legacy unit fixtures
   * can still construct SectionGenerationContractV1.
   */
  const executionPlanAuthority =
    (
      contract as
        Readonly<
          SectionGenerationContractV1
        > & {
          readonly executionPlanAuthority?:
            unknown;
        }
    ).executionPlanAuthority ??
    null;


return Object.freeze({
    version:
      "SECTION_SCOPED_AUTHORITY_CONTEXT_V1",

    sectionIndex:
      contract.sectionIndex,

    sectionNumber:
      contract.sectionNumber,

    totalSections:
      contract.totalSections,

    executionPlanAuthority,


    section:
      contract.blueprint,

    mission,

    pageStrategy: {
      ...compactRecord(
        searchBlueprint,
        [
          "action",
          "primaryQuery",
          "intent",
          "pageType",
          "conversionGoal",
        ]
      ),

      requiredEntities:
        compactStringArray(
          searchBlueprint
            .requiredEntities
        ),

      questions:
        compactStringArray(
          searchBlueprint
            .questions,
          12
        ),

      competitorWeaknesses:
        compactStringArray(
          searchBlueprint
            .competitorWeaknesses,
          10
        ),

      gaps:
        compactStringArray(
          searchBlueprint
            .gaps,
          12
        ),

      technicalRequirements:
        compactStringArray(
          searchBlueprint
            .technicalRequirements,
          10
        ),
    },

    queryGraph: {
      missionIntent:
        queryGraph
          .missionIntent,

      nodes:
        selectedQueryNodes,
    },

    claimLedger: {
      claims:
        selectedClaims,
    },

    evidenceGraph: {
      sources:
        selectedSources,

      claimEvidence:
        selectedClaimEvidence,
    },

    originalValue: {
      strength:
        originalValue.strength,

      gate:
        originalValue.gate,

      assets:
        selectedAssets,
    },

    internalLinkPlan:
      internalLinks,

    styleRules:
      compactStringArray(
        contract
          .styleRules,
        20
      ),

    hardRules:
      contract.hardRules,
  });
}


export function serializeSectionScopedAuthorityContextV1(
  contract:
    Readonly<
      SectionGenerationContractV1
    >
): string {
  /*
   * Minified JSON deliberately reduces provider-token overhead.
   * It changes representation only, never authority semantics.
   */
  return JSON.stringify(
    buildSectionScopedAuthorityContextV1(
      contract
    )
  );
}
