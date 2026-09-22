import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  MasterSearchBlueprint,
} from "./master-search-blueprint";

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

import {
  buildSectionBlueprintSet,
} from "./section-blueprint";


const queryGraph = {
  version:
    "QUERY_GRAPH_V1",

  missionId:
    "mission-1",

  nodes: [
    {
      id:
        "q1",

      query:
        "what is credit monitoring",
    },

    {
      id:
        "q2",

      query:
        "credit monitoring limitations",
    },
  ],

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

    queryNodeIds: [
      "q1",
      "q2",
    ],

    intent:
      "INFORMATIONAL",

    pageType:
      "ARTICLE",

    requiredTopics: [
      "Definition",
      "Limitations",
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
      "source-1",
      "ev-1",
    ],

    requiredClaims: [
      "claim-1",
    ],

    forbiddenClaims: [
      "claim-2",
    ],

    competitorStrengths:
      [],

    competitorWeaknesses:
      [],

    gaps:
      [],

    originalAssets: [
      "asset-1",
    ],

    internalLinkTargets:
      [],

    technicalRequirements:
      [],

    fingerprint:
      "fingerprint-1",
  };


const claimLedger:
  ClaimLedger = {
    version:
      "CLAIM_LEDGER_V1",

    claims: [
      {
        id:
          "claim-1",

        text:
          "Monitoring detects changes.",

        category:
          "FINANCIAL",

        risk:
          "HIGH",

        evidenceIds: [
          "ev-1",
        ],

        status:
          "VERIFIED",
      },

      {
        id:
          "claim-2",

        text:
          "Monitoring prevents identity theft.",

        category:
          "FINANCIAL",

        risk:
          "HIGH",

        evidenceIds: [
          "ev-2",
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
          "source-1",

        url:
          "https://example.com",

        publisher:
          "Example",

        sourceType:
          "PRIMARY_GOVERNMENT",

        authorityTier:
          "A",

        retrievedAt:
          new Date(
            "2026-09-21T00:00:00.000Z"
          ),
      },
    ],

    claimEvidence: [
      {
        id:
          "ev-1",

        claimId:
          "claim-1",

        sourceId:
          "source-1",

        relation:
          "SUPPORTS",

        kind:
          "VERIFIED_EXCERPT",

        excerpt:
          "Verified.",
      },

      {
        id:
          "ev-2",

        claimId:
          "claim-2",

        sourceId:
          "source-1",

        relation:
          "CONTRADICTS",

        kind:
          "VERIFIED_EXCERPT",

        excerpt:
          "Contradicted.",
      },
    ],
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


describe(
  "Section Blueprint V1",
  () => {
    it(
      "creates one contract per information job",
      () => {
        const result =
          buildSectionBlueprintSet({
            blueprint,

            queryGraph,

            claimLedger,

            evidenceGraph,

            originalValue,

            sections: [
              {
                heading:
                  "What Credit Monitoring Does",

                mission:
                  "Explain the detection function.",

                queryNodeIds: [
                  "q1",
                ],

                requiredClaims: [
                  "claim-1",
                ],

                evidenceIds: [
                  "ev-1",
                ],

                expectedOutcome:
                  "Reader understands the core function.",
              },

              {
                heading:
                  "What Credit Monitoring Doesn't Do",

                mission:
                  "Prevent confusion between detection and prevention.",

                queryNodeIds: [
                  "q2",
                ],

                forbiddenClaims: [
                  "claim-2",
                ],

                evidenceIds: [
                  "source-1",
                ],

                asset:
                  "asset-1",

                internalLinks: [
                  "/identity-theft-protection",
                ],

                expectedOutcome:
                  "Reader distinguishes monitoring from prevention.",
              },
            ],
          });

        expect(
          result.sections
        ).toHaveLength(
          2
        );

        expect(
          result.rules
        ).toContain(
          "ONE_INFORMATION_JOB_EQUALS_ONE_LOGICAL_SECTION"
        );

        expect(
          result.rules
        ).toContain(
          "NO_PREDETERMINED_H2_COUNT"
        );
      }
    );


    it(
      "rejects duplicate information jobs",
      () => {
        expect(
          () =>
            buildSectionBlueprintSet({
              blueprint,

              queryGraph,

              claimLedger,

              evidenceGraph,

              originalValue,

              sections: [
                {
                  heading:
                    "Section A",

                  mission:
                    "Explain alerts.",

                  expectedOutcome:
                    "Understood.",
                },

                {
                  heading:
                    "Section B",

                  mission:
                    "Explain alerts.",

                  expectedOutcome:
                    "Understood again.",
                },
              ],
            })
        ).toThrow(
          "SECTION_BLUEPRINT_DUPLICATE_INFORMATION_JOB"
        );
      }
    );


    it(
      "does not permit query drift outside the approved blueprint",
      () => {
        expect(
          () =>
            buildSectionBlueprintSet({
              blueprint: {
                ...blueprint,

                queryNodeIds: [
                  "q1",
                ],
              },

              queryGraph,

              claimLedger,

              evidenceGraph,

              originalValue,

              sections: [
                {
                  heading:
                    "Limitations",

                  mission:
                    "Explain limitations.",

                  queryNodeIds: [
                    "q2",
                  ],

                  expectedOutcome:
                    "Reader understands limitations.",
                },
              ],
            })
        ).toThrow(
          "SECTION_BLUEPRINT_QUERY_NODE_OUTSIDE_BLUEPRINT:q2"
        );
      }
    );


    it(
      "never generates article sections for NO_GO",
      () => {
        expect(
          () =>
            buildSectionBlueprintSet({
              blueprint: {
                ...blueprint,

                action:
                  "NO_GO",
              },

              queryGraph,

              claimLedger,

              evidenceGraph,

              originalValue,

              sections: [
                {
                  heading:
                    "Should not exist",

                  mission:
                    "Should not exist.",

                  expectedOutcome:
                    "Should not exist.",
                },
              ],
            })
        ).toThrow(
          "SECTION_BLUEPRINT_NO_GO_SECTIONS_FORBIDDEN"
        );
      }
    );
  }
);
