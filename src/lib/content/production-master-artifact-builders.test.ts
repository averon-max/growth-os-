import {
  describe,
  expect,
  expectTypeOf,
  it,
} from "vitest";

import {
  createSearchMission,
} from "./search-mission";

import {
  buildQueryGraph,
} from "./query-graph";

import {
  buildExpectedCoverageModel,
} from "./expected-coverage";

import {
  buildGapAnalysis,
} from "./gap-engine";

import {
  buildOriginalValuePlan,
} from "./original-value";

import {
  buildEvidenceGraph,
} from "./evidence-graph";

import {
  buildClaimLedger,
} from "./claim-ledger";

import {
  buildMasterSearchBlueprint,
} from "./master-search-blueprint";

import {
  buildSectionBlueprintSet,
} from "./section-blueprint";

import {
  buildProductionSearchMission,
  buildProductionQueryGraph,
  buildProductionEvidenceGraph,
  buildProductionClaimLedger,
  type ProductionSearchMissionInput,
  type ProductionQueryGraphInput,
  type ProductionExpectedCoverageInput,
  type ProductionGapAnalysisInput,
  type ProductionOriginalValueInput,
  type ProductionEvidenceGraphInput,
  type ProductionClaimLedgerInput,
  type ProductionMasterBlueprintInput,
  type ProductionSectionBlueprintInput,
} from "./production-master-artifact-builders";


describe(
  "Production Master Artifact Builders",
  () => {
    it(
      "inherits Stage 1-8 input contracts directly from the real builders",
      () => {
        expectTypeOf<
          ProductionSearchMissionInput
        >().toEqualTypeOf<
          Parameters<
            typeof createSearchMission
          >[0]
        >();

        expectTypeOf<
          ProductionQueryGraphInput
        >().toEqualTypeOf<
          Omit<
            Parameters<
              typeof buildQueryGraph
            >[0],
            "mission"
          >
        >();

        expectTypeOf<
          ProductionExpectedCoverageInput
        >().toEqualTypeOf<
          Omit<
            Parameters<
              typeof buildExpectedCoverageModel
            >[0],
            | "mission"
            | "queryGraph"
          >
        >();

        expectTypeOf<
          ProductionGapAnalysisInput
        >().toEqualTypeOf<
          Omit<
            Parameters<
              typeof buildGapAnalysis
            >[0],
            "expectedCoverage"
          >
        >();

        expectTypeOf<
          ProductionOriginalValueInput
        >().toEqualTypeOf<
          Omit<
            Parameters<
              typeof buildOriginalValuePlan
            >[0],
            | "missionId"
            | "gaps"
          >
        >();

        expectTypeOf<
          ProductionEvidenceGraphInput
        >().toEqualTypeOf<
          Parameters<
            typeof buildEvidenceGraph
          >[0]
        >();

        expectTypeOf<
          ProductionClaimLedgerInput
        >().toEqualTypeOf<
          Omit<
            Parameters<
              typeof buildClaimLedger
            >[0],
            "graph"
          >
        >();

        expectTypeOf<
          ProductionMasterBlueprintInput
        >().toEqualTypeOf<
          Omit<
            Parameters<
              typeof buildMasterSearchBlueprint
            >[0],
            | "mission"
            | "queryGraph"
            | "expectedCoverage"
            | "gaps"
            | "originalValue"
            | "claimLedger"
            | "evidenceGraph"
          >
        >();

        expectTypeOf<
          ProductionSectionBlueprintInput
        >().toEqualTypeOf<
          Omit<
            Parameters<
              typeof buildSectionBlueprintSet
            >[0],
            | "blueprint"
            | "queryGraph"
            | "claimLedger"
            | "evidenceGraph"
            | "originalValue"
          >
        >();
      }
    );


    it(
      "builds SearchMission only from explicit input",
      () => {
        const mission =
          buildProductionSearchMission({
            id:
              "mission-production-1",

            websiteId:
              "website-1",

            topic:
              "what is credit monitoring",

            audience:
              "US consumers",

            readerGoal:
              "Understand what credit monitoring does and what its limitations are.",

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
                "2026-09-21T20:00:00.000Z"
              ),

            version:
              1,
          });

        expect(
          mission.id
        ).toBe(
          "mission-production-1"
        );

        expect(
          mission.version
        ).toBe(
          1
        );

        expect(
          mission.riskClass
        ).toBe(
          "YMYL_FINANCE"
        );
      }
    );


    it(
      "builds QueryGraph using the real Stage 2 builder without fake metrics",
      () => {
        const mission =
          buildProductionSearchMission({
            id:
              "mission-production-2",

            websiteId:
              "website-1",

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
                "2026-09-21T20:00:00.000Z"
              ),

            version:
              1,
          });

        const graph =
          buildProductionQueryGraph({
            mission,

            input: {
              missionIntent:
                "INFORMATIONAL",

              signals: [
                {
                  query:
                    "what is credit monitoring",

                  intent:
                    "INFORMATIONAL",

                  subIntent:
                    "DEFINITION",

                  cluster:
                    "CREDIT_MONITORING",

                  siteCoverage:
                    "WEAK",

                  source:
                    "DATAFORSEO",

                  sourceConfidence:
                    0.9,

                  sameMissionEvidence:
                    true,
                },
              ],
            },
          });

        expect(
          graph.version
        ).toBe(
          "QUERY_GRAPH_V1"
        );

        expect(
          graph.missionId
        ).toBe(
          mission.id
        );

        expect(
          graph.nodes
        ).toHaveLength(
          1
        );
      }
    );


    it(
      "builds evidence and ledger through the real Stage 7 builders",
      () => {
        const asOf =
          new Date(
            "2026-09-21T20:00:00.000Z"
          );

        const evidenceGraph =
          buildProductionEvidenceGraph({
            sources: [
              {
                id:
                  "source-1",

                url:
                  "https://example.com/source",

                publisher:
                  "Example",

                sourceType:
                  "PRIMARY_OFFICIAL",

                authorityTier:
                  "B",

                jurisdiction:
                  "US",

                retrievedAt:
                  asOf,
              },
            ],

            claimEvidence: [
              {
                id:
                  "evidence-1",

                claimId:
                  "claim-1",

                sourceId:
                  "source-1",

                relation:
                  "SUPPORTS",

                kind:
                  "VERIFIED_EXCERPT",

                excerpt:
                  "Verified source excerpt.",
              },
            ],
          });

        const ledger =
          buildProductionClaimLedger({
            evidenceGraph,

            input: {
              asOf,

              claims: [
                {
                  id:
                    "claim-1",

                  text:
                    "A supported factual claim.",

                  category:
                    "FACT",

                  risk:
                    "LOW",

                  jurisdiction:
                    "US",
                },
              ],
            },
          });

        expect(
          evidenceGraph.version
        ).toBe(
          "EVIDENCE_GRAPH_V1"
        );

        expect(
          ledger.version
        ).toBe(
          "CLAIM_LEDGER_V1"
        );

        expect(
          ledger.claims
        ).toHaveLength(
          1
        );
      }
    );
  }
);
