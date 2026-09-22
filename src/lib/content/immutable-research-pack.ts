import type {
  SearchMission,
} from "./search-mission";

import type {
  QueryGraph,
} from "./query-graph";

import type {
  SerpSnapshot,
} from "./serp-observatory";

import {
  isPublicationGradeClaimEvidence,
  type EvidenceGraph,
  type EvidenceSource,
} from "./evidence-graph";

import type {
  ClaimLedger,
} from "./claim-ledger";

import type {
  GapAnalysis,
} from "./gap-engine";

import type {
  OriginalValuePlan,
  OriginalValueAsset,
} from "./original-value";

import type {
  MasterSearchBlueprint,
} from "./master-search-blueprint";

import type {
  SectionBlueprintSet,
} from "./section-blueprint";


export interface InternalLinkPlanItem {
  fromUrl:
    string;

  toUrl:
    string;

  anchor?:
    string;

  reason:
    string;
}


export interface ImmutableResearchPack {
  version:
    "IMMUTABLE_RESEARCH_PACK_V1";

  mission:
    Readonly<SearchMission>;

  queryGraph:
    Readonly<QueryGraph>;

  serpResearch:
    Readonly<SerpSnapshot> | null;

  searchBlueprint:
    Readonly<MasterSearchBlueprint>;

  sectionBlueprints:
    Readonly<SectionBlueprintSet>;

  claimLedger:
    Readonly<ClaimLedger>;

  verifiedSources:
    readonly Readonly<EvidenceSource>[];

  competitorGaps:
    readonly string[];

  originalValueAssets:
    readonly Readonly<OriginalValueAsset>[];

  internalLinkPlan:
    readonly Readonly<InternalLinkPlanItem>[];

  styleRules:
    readonly string[];

  prohibitedClaims:
    readonly string[];

  writerRules:
    readonly string[];

  fingerprint:
    string;
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


function verifiedSourceIds({
  graph,
  ledger,
}: {
  graph:
    Readonly<EvidenceGraph>;

  ledger:
    Readonly<ClaimLedger>;
}): Set<string> {
  const authorizableClaims =
    new Set(
      ledger.claims
        .filter(
          (claim) =>
            claim.status ===
              "VERIFIED" ||
            claim.status ===
              "PARTIAL"
        )
        .map(
          (claim) =>
            claim.id
        )
    );

  return new Set(
    graph.claimEvidence
      .filter(
        (evidence) =>
          authorizableClaims.has(
            evidence.claimId
          ) &&
          (
            evidence.relation ===
              "SUPPORTS" ||
            evidence.relation ===
              "PARTIALLY_SUPPORTS"
          ) &&
          isPublicationGradeClaimEvidence(
            evidence
          )
      )
      .map(
        (evidence) =>
          evidence.sourceId
      )
  );
}


function freezeInternalLinks(
  links:
    InternalLinkPlanItem[]
): readonly Readonly<InternalLinkPlanItem>[] {
  return Object.freeze(
    links.map(
      (link) => {
        const fromUrl =
          link.fromUrl.trim();

        const toUrl =
          link.toUrl.trim();

        const reason =
          link.reason.trim();

        if (
          !fromUrl ||
          !toUrl ||
          !reason
        ) {
          throw new Error(
            "IMMUTABLE_RESEARCH_PACK_INTERNAL_LINK_INVALID"
          );
        }

        return Object.freeze({
          fromUrl,

          toUrl,

          anchor:
            link.anchor
              ?.trim() ||
            undefined,

          reason,
        });
      }
    )
  );
}


export function buildImmutableResearchPack({
  mission,
  queryGraph,
  serpResearch,
  searchBlueprint,
  sectionBlueprints,
  claimLedger,
  evidenceGraph,
  gaps,
  originalValue,
  internalLinkPlan,
  styleRules,
}: {
  mission:
    Readonly<SearchMission>;

  queryGraph:
    Readonly<QueryGraph>;

  serpResearch:
    Readonly<SerpSnapshot> | null;

  searchBlueprint:
    Readonly<MasterSearchBlueprint>;

  sectionBlueprints:
    Readonly<SectionBlueprintSet>;

  claimLedger:
    Readonly<ClaimLedger>;

  evidenceGraph:
    Readonly<EvidenceGraph>;

  gaps:
    Readonly<GapAnalysis>;

  originalValue:
    Readonly<OriginalValuePlan>;

  internalLinkPlan:
    InternalLinkPlanItem[];

  styleRules:
    string[];
}): Readonly<ImmutableResearchPack> {
  if (
    searchBlueprint.missionId !==
      mission.id ||
    queryGraph.missionId !==
      mission.id ||
    gaps.missionId !==
      mission.id ||
    originalValue.missionId !==
      mission.id
  ) {
    throw new Error(
      "IMMUTABLE_RESEARCH_PACK_MISSION_MISMATCH"
    );
  }

  if (
    sectionBlueprints
      .blueprintFingerprint !==
    searchBlueprint
      .fingerprint
  ) {
    throw new Error(
      "IMMUTABLE_RESEARCH_PACK_BLUEPRINT_REVISION_MISMATCH"
    );
  }

  if (
    searchBlueprint.action !==
      "NO_GO" &&
    originalValue.gate ===
      "REJECTED"
  ) {
    throw new Error(
      "IMMUTABLE_RESEARCH_PACK_ORIGINAL_VALUE_BLOCKED"
    );
  }

  const verifiedIds =
    verifiedSourceIds({
      graph:
        evidenceGraph,

      ledger:
        claimLedger,
    });

  const verifiedSources =
    evidenceGraph.sources
      .filter(
        (source) =>
          verifiedIds.has(
            source.id
          )
      )
      .map(
        (source) =>
          Object.freeze({
            ...source,

            publishedAt:
              source.publishedAt
                ? new Date(
                    source.publishedAt
                  )
                : undefined,

            updatedAt:
              source.updatedAt
                ? new Date(
                    source.updatedAt
                  )
                : undefined,

            retrievedAt:
              new Date(
                source.retrievedAt
              ),
          })
      );

  const prohibitedClaims =
    unique([
      ...searchBlueprint
        .forbiddenClaims,

      ...claimLedger.claims
        .filter(
          (claim) =>
            claim.status ===
              "CONTRADICTED" ||
            claim.status ===
              "JURISDICTION_MISMATCH" ||
            (
              claim.status ===
                "UNSUPPORTED" &&
              claim.risk ===
                "HIGH"
            ) ||
            (
              claim.status ===
                "STALE" &&
              (
                claim.category ===
                  "LEGAL" ||
                claim.category ===
                  "FINANCIAL"
              )
            )
        )
        .map(
          (claim) =>
            claim.id
        ),
    ]);

  const competitorGaps =
    unique(
      gaps.gaps.map(
        (gap) =>
          `${gap.type}:${gap.topic}:${gap.opportunity}`
      )
    );

  const frozenInternalLinks =
    freezeInternalLinks(
      internalLinkPlan
    );

  const frozenStyleRules =
    unique(
      styleRules
    );

  const writerRules =
    Object.freeze([
      "FOLLOW_SEARCH_MISSION",
      "FOLLOW_QUERY_GRAPH_BOUNDARIES",
      "FOLLOW_SEARCH_BLUEPRINT",
      "FOLLOW_SECTION_BLUEPRINTS",
      "USE_ONLY_VERIFIED_SOURCES_FOR_SENSITIVE_CLAIMS",
      "DO_NOT_INVENT_FACTS",
      "DO_NOT_INVENT_CITATIONS",
      "DO_NOT_INVENT_STATISTICS",
      "DO_NOT_INVENT_PRICES",
      "DO_NOT_INVENT_LEGAL_CLAIMS",
      "DO_NOT_INVENT_PRODUCT_CAPABILITIES",
      "DO_NOT_INVENT_RESEARCH",
      "UNKNOWN_INFORMATION_MUST_BE_FLAGGED_OR_OMITTED",
      "WRITER_IS_NOT_CLAIM_VERIFIER",
      "BLUEPRINT_REQUIRES_EXPLICIT_REVISION_TO_CHANGE",
    ] as const);

  const fingerprintPayload = {
    missionId:
      mission.id,

    queryGraphVersion:
      queryGraph.version,

    serpFingerprint:
      serpResearch
        ?.fingerprint ??
      null,

    blueprintFingerprint:
      searchBlueprint.fingerprint,

    sectionBlueprintVersion:
      sectionBlueprints.version,

    claimLedgerVersion:
      claimLedger.version,

    verifiedSourceIds:
      verifiedSources.map(
        (source) =>
          source.id
      ),

    originalAssetIds:
      originalValue.assets.map(
        (asset) =>
          asset.id
      ),

    prohibitedClaims,

    internalLinkPlan:
      frozenInternalLinks,

    styleRules:
      frozenStyleRules,
  };

  const fingerprint =
    stableHash(
      JSON.stringify(
        fingerprintPayload
      )
    );

  return Object.freeze({
    version:
      "IMMUTABLE_RESEARCH_PACK_V1" as const,

    mission:
      Object.freeze({
        ...mission,
      }),

    queryGraph,

    serpResearch,

    searchBlueprint,

    sectionBlueprints,

    claimLedger,

    verifiedSources:
      Object.freeze(
        verifiedSources
      ),

    competitorGaps,

    originalValueAssets:
      Object.freeze(
        originalValue.assets.map(
          (asset) =>
            Object.freeze({
              ...asset,
            })
        )
      ),

    internalLinkPlan:
      frozenInternalLinks,

    styleRules:
      frozenStyleRules,

    prohibitedClaims,

    writerRules,

    fingerprint,
  });
}


export function immutableResearchPackPrompt(
  pack:
    Readonly<ImmutableResearchPack>
): string {
  const sourceLines =
    pack.verifiedSources.length >
      0
      ? pack.verifiedSources.map(
          (source) =>
            `- ${source.id}: ${source.publisher} (${source.url})`
        )
      : [
          "- none",
        ];

  const sectionLines =
    pack.sectionBlueprints
      .sections
      .map(
        (
          section,
          index
        ) =>
          [
            `SECTION ${index + 1}: ${section.heading}`,
            `Mission: ${section.mission}`,
            `Queries: ${section.queryNodeIds.join(", ") || "none"}`,
            `Required claims: ${section.requiredClaims.join(", ") || "none"}`,
            `Forbidden claims: ${section.forbiddenClaims.join(", ") || "none"}`,
            `Evidence: ${section.evidenceIds.join(", ") || "none"}`,
            `Asset: ${section.asset ?? "none"}`,
            `Internal links: ${section.internalLinks.join(", ") || "none"}`,
            `Expected outcome: ${section.expectedOutcome}`,
          ].join(
            "\n"
          )
      );

  return [
    "IMMUTABLE RESEARCH PACK",
    `Version: ${pack.version}`,
    `Fingerprint: ${pack.fingerprint}`,
    "",
    "SEARCH MISSION",
    `Topic: ${pack.mission.topic}`,
    `Audience: ${pack.mission.audience}`,
    `Reader goal: ${pack.mission.readerGoal}`,
    `Jurisdiction: ${pack.mission.jurisdiction}`,
    `Risk: ${pack.mission.riskClass}`,
    "",
    "SEARCH BLUEPRINT",
    `Action: ${pack.searchBlueprint.action}`,
    `Primary query: ${pack.searchBlueprint.primaryQuery}`,
    `Intent: ${pack.searchBlueprint.intent}`,
    `Page type: ${pack.searchBlueprint.pageType}`,
    `Required topics: ${pack.searchBlueprint.requiredTopics.join(", ") || "none"}`,
    `Supporting topics: ${pack.searchBlueprint.supportingTopics.join(", ") || "none"}`,
    `Excluded topics: ${pack.searchBlueprint.excludedTopics.join(", ") || "none"}`,
    "",
    "SECTION BLUEPRINTS",
    sectionLines.join(
      "\n\n"
    ) || "none",
    "",
    "VERIFIED SOURCES",
    sourceLines.join(
      "\n"
    ),
    "",
    "COMPETITOR GAPS",
    pack.competitorGaps
      .map(
        (gap) =>
          `- ${gap}`
      )
      .join(
        "\n"
      ) || "- none",
    "",
    "ORIGINAL VALUE ASSETS",
    pack.originalValueAssets
      .map(
        (asset) =>
          `- ${asset.id}: ${asset.title}`
      )
      .join(
        "\n"
      ) || "- none",
    "",
    "PROHIBITED CLAIMS",
    pack.prohibitedClaims
      .map(
        (claim) =>
          `- ${claim}`
      )
      .join(
        "\n"
      ) || "- none",
    "",
    "STYLE RULES",
    pack.styleRules
      .map(
        (rule) =>
          `- ${rule}`
      )
      .join(
        "\n"
      ) || "- none",
    "",
    "WRITER RULES",
    pack.writerRules
      .map(
        (rule) =>
          `- ${rule}`
      )
      .join(
        "\n"
      ),
  ].join(
    "\n"
  );
}
