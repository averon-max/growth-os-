import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  ProductionMasterArtifactPipelineInput,
} from "./production-master-artifact-builders";

import {
  ProductionMasterSourceBlockedError,
  assertProductionMasterSourceBundle,
  inspectProductionMasterSourceBundle,
  type ProductionMasterSourceBundle,
} from "./production-master-source-assembler";


function sourceBundle():
ProductionMasterSourceBundle {
  const input = {
    mission: {
      id:
        "mission-1",

      websiteId:
        "website-1",

      topic:
        "what is credit monitoring",

      audience:
        "US consumers concerned about credit and identity theft",

      readerGoal:
        "Understand what credit monitoring does, its limitations, and what to do after an alert.",

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
          "2026-09-22T00:00:00.000Z"
        ),

      version:
        1,
    },

    queryGraph: {
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
            1,

          sameMissionEvidence:
            true,
        },
      ],
    },

    serpResearch: {
      version:
        "SERP_SNAPSHOT_V1",

      keyword:
        "what is credit monitoring",

      country:
        "US",

      language:
        "en",

      device:
        "DESKTOP",

      capturedAt:
        new Date(
          "2026-09-22T00:00:00.000Z"
        ),

      results: [
        {
          rank:
            1,

          domain:
            "consumerfinance.gov",

          url:
            "https://www.consumerfinance.gov/example",

          title:
            "What is credit monitoring?",

          pageType:
            "ARTICLE",
        },
      ],

      features:
        [],

      aiOverview:
        false,

      fingerprint:
        "real-serp-fingerprint",
    },

    expectedCoverage: {
      topics: [
        {
          topic:
            "what credit monitoring does",

          importance:
            1,

          queryNodeIds:
            [],
        },
      ],
    },

    gaps: {
      observations: [
        {
          topic:
            "what credit monitoring does",

          ownCoverage:
            "WEAK",

          competitorCoverage:
            "STRONG",
        },
      ],
    },

    originalValue: {
      assets:
        [],

      commoditySignals: {},
    },

    evidenceGraph: {
      sources: [
        {
          id:
            "source-1",

          url:
            "https://www.consumerfinance.gov/example",

          publisher:
            "Consumer Financial Protection Bureau",

          sourceType:
            "PRIMARY_GOVERNMENT",

          retrievedAt:
            new Date(
              "2026-09-22T00:00:00.000Z"
            ),
        },
      ],

      claimEvidence:
        [],
    },

    claimLedger: {
      claims:
        [],

      asOf:
        new Date(
          "2026-09-22T00:00:00.000Z"
        ),
    },

    masterBlueprint: {
      action:
        "CREATE",

      primaryQuery:
        "what is credit monitoring",

      intent:
        "INFORMATIONAL",

      pageType:
        "ARTICLE",
    },

    sectionBlueprints: {
      sections: [
        {
          heading:
            "What Credit Monitoring Does",

          mission:
            "Explain the core detection function.",

          queryNodeIds:
            [],

          requiredClaims:
            [],

          evidenceIds:
            [],

          expectedOutcome:
            "Reader understands what monitoring detects.",
        },
      ],
    },

    internalLinkPlan:
      [],

    styleRules: [
      "Direct answers before elaboration.",
      "No filler.",
    ],
  } as unknown as
    ProductionMasterArtifactPipelineInput;


  return {
    input,

    provenance: [
      {
        stage:
          "SEARCH_MISSION",

        source:
          "USER_EXPLICIT",

        ref:
          "mission-input-1",
      },

      {
        stage:
          "QUERY_GRAPH",

        source:
          "DATAFORSEO",

        ref:
          "dataforseo-query-evidence-1",
      },

      {
        stage:
          "SERP_RESEARCH",

        source:
          "LIVE_SERP",

        ref:
          "real-serp-fingerprint",
      },

      {
        stage:
          "EVIDENCE_GRAPH",

        source:
          "VERIFIED_EXTERNAL_EVIDENCE",

        ref:
          "https://www.consumerfinance.gov/example",
      },
    ],
  };
}


describe(
  "Production Master Source Assembler",
  () => {
    it(
      "accepts a source-backed non-empty envelope",
      () => {
        const result =
          inspectProductionMasterSourceBundle(
            sourceBundle()
          );


        expect(
          result.ready
        ).toBe(
          true
        );


        expect(
          result.blockers
        ).toEqual(
          []
        );
      }
    );


    it(
      "blocks empty query placeholders",
      () => {
        const bundle =
          sourceBundle();


        (
          bundle.input
            .queryGraph
            .signals as
            unknown[]
        ).splice(
          0
        );


        expect(
          () =>
            assertProductionMasterSourceBundle(
              bundle
            )
        ).toThrow(
          ProductionMasterSourceBlockedError
        );


        expect(
          inspectProductionMasterSourceBundle(
            bundle
          ).blockers
        ).toContain(
          "SOURCE_QUERY_SIGNALS_MISSING"
        );
      }
    );


    it(
      "blocks missing live SERP",
      () => {
        const bundle =
          sourceBundle();


        (
          bundle.input as {
            serpResearch:
              null;
          }
        ).serpResearch =
          null;


        expect(
          inspectProductionMasterSourceBundle(
            bundle
          ).blockers
        ).toContain(
          "SOURCE_LIVE_SERP_MISSING"
        );
      }
    );


    it(
      "blocks an empty observed SERP",
      () => {
        const bundle =
          sourceBundle();


        const serp =
          bundle.input
            .serpResearch;


        if (!serp) {
          throw new Error(
            "TEST_SERP_MISSING"
          );
        }


        (
          serp.results as
            unknown[]
        ).splice(
          0
        );


        expect(
          inspectProductionMasterSourceBundle(
            bundle
          ).blockers
        ).toContain(
          "SOURCE_LIVE_SERP_RESULTS_EMPTY"
        );
      }
    );


    it(
      "blocks empty expected coverage input",
      () => {
        const bundle =
          sourceBundle();


        (
          bundle.input
            .expectedCoverage
            .topics as
            unknown[]
        ).splice(
          0
        );


        expect(
          inspectProductionMasterSourceBundle(
            bundle
          ).blockers
        ).toContain(
          "SOURCE_EXPECTED_COVERAGE_TOPICS_MISSING"
        );
      }
    );


    it(
      "blocks empty gap observations",
      () => {
        const bundle =
          sourceBundle();


        (
          bundle.input
            .gaps
            .observations as
            unknown[]
        ).splice(
          0
        );


        expect(
          inspectProductionMasterSourceBundle(
            bundle
          ).blockers
        ).toContain(
          "SOURCE_GAP_OBSERVATIONS_MISSING"
        );
      }
    );


    it(
      "blocks empty evidence",
      () => {
        const bundle =
          sourceBundle();


        (
          bundle.input
            .evidenceGraph
            .sources as
            unknown[]
        ).splice(
          0
        );


        expect(
          inspectProductionMasterSourceBundle(
            bundle
          ).blockers
        ).toContain(
          "SOURCE_EVIDENCE_SOURCES_MISSING"
        );
      }
    );


    it(
      "requires provenance for query, SERP, and evidence boundaries",
      () => {
        const bundle =
          sourceBundle();


        const withoutCritical =
          {
            ...bundle,

            provenance:
              [],
          };


        const blockers =
          inspectProductionMasterSourceBundle(
            withoutCritical
          ).blockers;


        expect(
          blockers
        ).toContain(
          "SOURCE_QUERY_PROVENANCE_MISSING"
        );


        expect(
          blockers
        ).toContain(
          "SOURCE_SERP_PROVENANCE_MISSING"
        );


        expect(
          blockers
        ).toContain(
          "SOURCE_EVIDENCE_PROVENANCE_MISSING"
        );
      }
    );


    it(
      "never replaces absent query metrics with zero",
      () => {
        const bundle =
          sourceBundle();

        const signal =
          bundle.input
            .queryGraph
            .signals[0];


        expect(
          signal
        ).toBeTruthy();


        expect(
          "searchVolume" in
            (
              signal as
                object
            )
        ).toBe(
          false
        );


        expect(
          "gscImpressions" in
            (
              signal as
                object
            )
        ).toBe(
          false
        );


        expect(
          "gscClicks" in
            (
              signal as
                object
            )
        ).toBe(
          false
        );


        expect(
          "gscPosition" in
            (
              signal as
                object
            )
        ).toBe(
          false
        );
      }
    );
  }
);
