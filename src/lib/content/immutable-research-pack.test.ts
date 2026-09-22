import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  SearchMission,
} from "./search-mission";

import type {
  QueryGraph,
} from "./query-graph";

import type {
  SerpSnapshot,
} from "./serp-observatory";

import type {
  MasterSearchBlueprint,
} from "./master-search-blueprint";

import type {
  SectionBlueprintSet,
} from "./section-blueprint";

import type {
  ClaimLedger,
} from "./claim-ledger";

import type {
  EvidenceGraph,
} from "./evidence-graph";

import type {
  GapAnalysis,
} from "./gap-engine";

import type {
  OriginalValuePlan,
} from "./original-value";

import {
  buildImmutableResearchPack,
  immutableResearchPackPrompt,
} from "./immutable-research-pack";


const mission = {
  id:
    "mission-1",

  websiteId:
    "site-1",

  topic:
    "what is credit monitoring",

  audience:
    "US consumers",

  readerGoal:
    "Understand credit monitoring.",

  businessRelationship:
    "DIRECT",

  jurisdiction:
    "US",

  language:
    "en",

  location:
    "United States",

  riskClass:
    "YMYL_FINANCE",

  createdAt:
    new Date(
      "2026-09-21T00:00:00.000Z"
    ),

  version:
    1,
} as SearchMission;


const queryGraph = {
  version:
    "QUERY_GRAPH_V1",

  missionId:
    "mission-1",

  nodes:
    [],

  edges:
    [],

  boundaries:
    [],

  provenance:
    [],
} as unknown as QueryGraph;


const blueprint:
  MasterSearchBlueprint = {
    version:
      "MASTER_SEARCH_BLUEPRINT_V1",

    revision:
      1,

    missionId:
      "mission-1",

    action:
      "CREATE",

    primaryQuery:
      "what is credit monitoring",

    queryNodeIds:
      [],

    intent:
      "INFORMATIONAL",

    pageType:
      "ARTICLE",

    requiredTopics: [
      "Definition",
    ],

    supportingTopics:
      [],

    excludedTopics:
      [],

    requiredEntities:
      [],

    questions:
      [],

    evidenceIds: [
      "ev-good",
    ],

    requiredClaims: [
      "claim-good",
    ],

    forbiddenClaims: [
      "claim-bad",
    ],

    competitorStrengths:
      [],

    competitorWeaknesses:
      [],

    gaps: [
      "EVIDENCE_GAP:Limitations",
    ],

    originalAssets: [
      "asset-1",
    ],

    internalLinkTargets:
      [],

    technicalRequirements:
      [],

    fingerprint:
      "blueprint-fingerprint",
  };


const sections:
  SectionBlueprintSet = {
    version:
      "SECTION_BLUEPRINT_SET_V1",

    blueprintFingerprint:
      "blueprint-fingerprint",

    h1Mission:
      "what is credit monitoring",

    sections: [
      {
        heading:
          "What Credit Monitoring Does",

        mission:
          "Explain detection.",

        queryNodeIds:
          [],

        requiredClaims: [
          "claim-good",
        ],

        forbiddenClaims: [
          "claim-bad",
        ],

        evidenceIds: [
          "ev-good",
        ],

        internalLinks:
          [],

        expectedOutcome:
          "Reader understands detection.",
      },
    ],

    rules: [
      "ONE_INFORMATION_JOB_EQUALS_ONE_LOGICAL_SECTION",
    ],
  };


const ledger:
  ClaimLedger = {
    version:
      "CLAIM_LEDGER_V1",

    claims: [
      {
        id:
          "claim-good",

        text:
          "Monitoring detects changes.",

        category:
          "FINANCIAL",

        risk:
          "HIGH",

        evidenceIds: [
          "ev-good",
        ],

        status:
          "VERIFIED",
      },

      {
        id:
          "claim-bad",

        text:
          "Monitoring prevents identity theft.",

        category:
          "FINANCIAL",

        risk:
          "HIGH",

        evidenceIds: [
          "ev-bad",
        ],

        status:
          "CONTRADICTED",
      },
    ],

    counts: {
      VERIFIED:
        1,

      PARTIAL:
        0,

      UNSUPPORTED:
        0,

      CONTRADICTED:
        1,

      STALE:
        0,

      JURISDICTION_MISMATCH:
        0,
    },

    verified:
      1,

    unsupported:
      0,

    blockingCandidateCount:
      1,
  };


const evidenceGraph:
  EvidenceGraph = {
    version:
      "EVIDENCE_GRAPH_V1",

    sources: [
      {
        id:
          "cfpb",

        url:
          "https://consumerfinance.gov/example",

        publisher:
          "CFPB",

        sourceType:
          "PRIMARY_GOVERNMENT",

        authorityTier:
          "A",

        jurisdiction:
          "US",

        retrievedAt:
          new Date(
            "2026-09-21T00:00:00.000Z"
          ),
      },

      {
        id:
          "snippet-source",

        url:
          "https://example.com",

        publisher:
          "Search result",

        sourceType:
          "REPUTABLE_SECONDARY",

        authorityTier:
          "C",

        retrievedAt:
          new Date(
            "2026-09-21T00:00:00.000Z"
          ),
      },
    ],

    claimEvidence: [
      {
        id:
          "ev-good",

        claimId:
          "claim-good",

        sourceId:
          "cfpb",

        relation:
          "SUPPORTS",

        kind:
          "VERIFIED_EXCERPT",

        excerpt:
          "Verified evidence.",
      },

      {
        id:
          "ev-bad",

        claimId:
          "claim-bad",

        sourceId:
          "cfpb",

        relation:
          "CONTRADICTS",

        kind:
          "VERIFIED_EXCERPT",

        excerpt:
          "Contradictory evidence.",
      },

      {
        id:
          "ev-snippet",

        claimId:
          "claim-good",

        sourceId:
          "snippet-source",

        relation:
          "SUPPORTS",

        kind:
          "SEARCH_SNIPPET",

        excerpt:
          "Snippet.",
      },
    ],
  };


const gaps:
  GapAnalysis = {
    version:
      "GAP_ENGINE_V1",

    missionId:
      "mission-1",

    gaps: [
      {
        type:
          "EVIDENCE_GAP",

        topic:
          "Limitations",

        severity:
          "MAJOR",

        coverageRole:
          "REQUIRED",

        evidence:
          [],

        opportunity:
          "Use primary evidence.",
      },
    ],

    byType: {
      MISSION_GAP:
        0,

      EXPECTED_GAP:
        0,

      DEPTH_GAP:
        0,

      CLARITY_GAP:
        0,

      EVIDENCE_GAP:
        1,

      ACTION_GAP:
        0,

      ORIGINAL_VALUE_GAP:
        0,
    },

    criticalCount:
      0,

    majorCount:
      1,

    evidence:
      [],
  };


const originalValue:
  OriginalValuePlan = {
    version:
      "ORIGINAL_VALUE_PLAN_V1",

    missionId:
      "mission-1",

    strength:
      "DEFENSIBLE",

    gate:
      "PASS",

    assets: [
      {
        id:
          "asset-1",

        type:
          "COMPARISON_MATRIX",

        title:
          "Detection matrix",

        description:
          "Original synthesis.",

        firstParty:
          false,

        verified:
          true,
      },
    ],

    commodity: {
      risk:
        "LOW",

      evidence:
        [],
    },

    issues:
      [],

    evidence:
      [],
  };


function build() {
  return buildImmutableResearchPack({
    mission,

    queryGraph,

    serpResearch:
      null as SerpSnapshot | null,

    searchBlueprint:
      blueprint,

    sectionBlueprints:
      sections,

    claimLedger:
      ledger,

    evidenceGraph,

    gaps,

    originalValue,

    internalLinkPlan: [
      {
        fromUrl:
          "/identity-theft-protection",

        toUrl:
          "/what-is-credit-monitoring",

        anchor:
          "credit monitoring",

        reason:
          "Strong topical relationship.",
      },
    ],

    styleRules: [
      "Direct answers before elaboration.",
      "No filler.",
    ],
  });
}


describe(
  "Immutable Research Pack V1",
  () => {
    it(
      "contains the exact writer research layers required by the master",
      () => {
        const pack =
          build();

        expect(
          pack.version
        ).toBe(
          "IMMUTABLE_RESEARCH_PACK_V1"
        );

        expect(
          pack.mission.id
        ).toBe(
          "mission-1"
        );

        expect(
          pack.searchBlueprint
            .fingerprint
        ).toBe(
          "blueprint-fingerprint"
        );

        expect(
          pack.sectionBlueprints
            .sections
        ).toHaveLength(
          1
        );

        expect(
          pack.originalValueAssets
        ).toHaveLength(
          1
        );

        expect(
          pack.competitorGaps
        ).toHaveLength(
          1
        );
      }
    );


    it(
      "passes only publication-grade verified sources to the writer",
      () => {
        const pack =
          build();

        expect(
          pack.verifiedSources.map(
            (source) =>
              source.id
          )
        ).toEqual([
          "cfpb",
        ]);

        expect(
          pack.verifiedSources.map(
            (source) =>
              source.id
          )
        ).not.toContain(
          "snippet-source"
        );
      }
    );


    it(
      "promotes contradicted or unsupported high-risk claims into prohibited claims",
      () => {
        const pack =
          build();

        expect(
          pack.prohibitedClaims
        ).toContain(
          "claim-bad"
        );
      }
    );


    it(
      "contains hard anti-hallucination writer rules",
      () => {
        const pack =
          build();

        expect(
          pack.writerRules
        ).toEqual(
          expect.arrayContaining([
            "DO_NOT_INVENT_FACTS",
            "DO_NOT_INVENT_CITATIONS",
            "DO_NOT_INVENT_STATISTICS",
            "DO_NOT_INVENT_PRICES",
            "DO_NOT_INVENT_LEGAL_CLAIMS",
            "DO_NOT_INVENT_PRODUCT_CAPABILITIES",
            "DO_NOT_INVENT_RESEARCH",
            "UNKNOWN_INFORMATION_MUST_BE_FLAGGED_OR_OMITTED",
            "WRITER_IS_NOT_CLAIM_VERIFIER",
          ])
        );
      }
    );


    it(
      "renders all mandatory layers into the writer prompt",
      () => {
        const prompt =
          immutableResearchPackPrompt(
            build()
          );

        expect(
          prompt
        ).toContain(
          "SEARCH MISSION"
        );

        expect(
          prompt
        ).toContain(
          "SEARCH BLUEPRINT"
        );

        expect(
          prompt
        ).toContain(
          "SECTION BLUEPRINTS"
        );

        expect(
          prompt
        ).toContain(
          "VERIFIED SOURCES"
        );

        expect(
          prompt
        ).toContain(
          "COMPETITOR GAPS"
        );

        expect(
          prompt
        ).toContain(
          "ORIGINAL VALUE ASSETS"
        );

        expect(
          prompt
        ).toContain(
          "PROHIBITED CLAIMS"
        );

        expect(
          prompt
        ).toContain(
          "WRITER RULES"
        );
      }
    );


    it(
      "fails when section contracts reference a different blueprint revision",
      () => {
        expect(
          () =>
            buildImmutableResearchPack({
              mission,

              queryGraph,

              serpResearch:
                null,

              searchBlueprint:
                blueprint,

              sectionBlueprints: {
                ...sections,

                blueprintFingerprint:
                  "different-revision",
              },

              claimLedger:
                ledger,

              evidenceGraph,

              gaps,

              originalValue,

              internalLinkPlan:
                [],

              styleRules:
                [],
            })
        ).toThrow(
          "IMMUTABLE_RESEARCH_PACK_BLUEPRINT_REVISION_MISMATCH"
        );
      }
    );
  }
);
