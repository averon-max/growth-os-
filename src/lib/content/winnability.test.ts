import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createSearchMission,
} from "./search-mission";

import {
  createSerpSnapshot,
} from "./serp-observatory";

import {
  buildSerpStabilityReport,
} from "./serp-stability";

import {
  buildWinnabilityDiagnostic,
  type WinnabilitySignal,
} from "./winnability";

import type {
  SiteTopicNode,
} from "./site-topic-graph";

import type {
  UrlOwnershipResult,
} from "./url-ownership";


const mission =
  createSearchMission({
    id:
      "mission-credit-monitoring-v1",

    websiteId:
      "site-1",

    topic:
      "what is credit monitoring",

    audience:
      "US consumers",

    readerGoal:
      "Understand credit monitoring",

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
  });


const ownership:
  UrlOwnershipResult = {
    version:
      "URL_OWNERSHIP_V1",

    missionId:
      mission.id,

    status:
      "SINGLE_OWNER",

    cannibalization:
      "NONE",

    actionHint:
      "UPDATE_CANDIDATE",

    primaryOwnerUrl:
      "/credit-monitoring",

    candidates:
      [],

    targetQueries: [
      "what is credit monitoring",
    ],

    evidence: [
      "SINGLE_GSC_QUERY_OWNER",
    ],
  };


const siteTopic:
  SiteTopicNode = {
    id:
      "topic-credit",

    websiteId:
      "site-1",

    cluster:
      "Credit Monitoring",

    pageIds: [
      "page-1",
    ],

    urls: [
      "/credit-monitoring",
    ],

    existingPages:
      3,

    indexedPages:
      3,

    gscQueries:
      [],

    queryBreadth:
      8,

    nonBrandImpressions:
      900,

    clicks:
      50,

    top3Queries:
      1,

    top10Queries:
      4,

    top20Queries:
      6,

    internalLinksIn:
      8,

    internalLinksOut:
      12,

    newestModifiedAt:
      new Date(
        "2026-09-15T00:00:00.000Z"
      ),

    freshnessAgeDays:
      6,

    contentCoverage: {
      none:
        0,

      weak:
        1,

      strong:
        2,

      unknown:
        0,
    },

    serpFootprint:
      5,

    missionAffinity:
      0.95,

    evidence: [
      "GSC_QUERY_EVIDENCE",
    ],
  };


function serp(
  date: string,
  order:
    string[]
) {
  return createSerpSnapshot({
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
        date
      ),

    results:
      order.map(
        (
          domain,
          index
        ) => ({
          rank:
            index +
            1,

          url:
            `https://${domain}/page`,

          domain,

          pageType:
            "ARTICLE" as const,

          intent:
            "INFORMATIONAL" as const,
        })
      ),
  });
}


const d0 =
  serp(
    "2026-09-01T00:00:00.000Z",
    [
      "a.com",
      "b.com",
      "c.com",
      "d.com",
      "e.com",
    ]
  );


const d3 =
  serp(
    "2026-09-04T00:00:00.000Z",
    [
      "b.com",
      "a.com",
      "c.com",
      "d.com",
      "e.com",
    ]
  );


const stability =
  buildSerpStabilityReport([
    d0,
    d3,
  ]);


const favorable:
  WinnabilitySignal = {
    level:
      "FAVORABLE",

    evidence: [
      "TEST_REAL_SIGNAL",
    ],
  };


describe(
  "Winnability Diagnostic V1",
  () => {
    it(
      "produces HIGH only as a diagnostic band, never as ranking likelihood",
      () => {
        const result =
          buildWinnabilityDiagnostic({
            mission,

            targetIntent:
              "INFORMATIONAL",

            latestSerp:
              d3,

            ownership,

            siteTopic,

            stability,

            overrides: {
              contentOpportunity:
                favorable,

              evidenceOpportunity:
                favorable,

              originalValueOpportunity:
                favorable,

              internalAuthority:
                favorable,

              serpOpenness:
                favorable,

              freshnessOpportunity:
                favorable,
            },
          });

        expect(
          result.band
        ).toBe(
          "HIGH"
        );

        expect(
          result.status
        ).toBe(
          "COMPLETE"
        );

        expect(
          result.confidence
        ).toBe(
          "HIGH"
        );

        expect(
          result.model
        ).toBe(
          "HEURISTIC_DIAGNOSTIC_V1"
        );
      }
    );


    it(
      "keeps missing Stage 6 and Stage 7 evidence unknown instead of scoring it as zero",
      () => {
        const result =
          buildWinnabilityDiagnostic({
            mission,

            targetIntent:
              "INFORMATIONAL",

            latestSerp:
              d3,

            ownership,

            siteTopic,

            stability,
          });

        expect(
          result.status
        ).toBe(
          "PRELIMINARY"
        );

        expect(
          result.band
        ).not.toBeNull();

        expect(
          result.unknownDimensions
        ).toEqual(
          expect.arrayContaining([
            "CONTENT_OPPORTUNITY",
            "EVIDENCE_OPPORTUNITY",
            "ORIGINAL_VALUE_OPPORTUNITY",
            "INTERNAL_AUTHORITY",
            "SERP_OPENNESS",
            "FRESHNESS_OPPORTUNITY",
            "EXTERNAL_AUTHORITY_GAP",
          ])
        );

        expect(
          result.certaintyNotes
        ).toContain(
          "UNKNOWN_DIMENSIONS_ARE_NOT_SCORED_AS_ZERO"
        );
      }
    );


    it(
      "derives intent fit from actual observed SERP intent",
      () => {
        const result =
          buildWinnabilityDiagnostic({
            mission,

            targetIntent:
              "COMMERCIAL",

            latestSerp:
              d3,

            ownership,

            siteTopic,

            stability,

            overrides: {
              contentOpportunity:
                favorable,

              evidenceOpportunity:
                favorable,

              originalValueOpportunity:
                favorable,
            },
          });

        const intent =
          result.dimensions.find(
            (dimension) =>
              dimension.key ===
              "INTENT_FIT"
          );

        expect(
          intent?.level
        ).toBe(
          "UNFAVORABLE"
        );
      }
    );


    it(
      "allows an explicit hard mission or intent blocker to force LOW",
      () => {
        const result =
          buildWinnabilityDiagnostic({
            mission,

            targetIntent:
              "INFORMATIONAL",

            latestSerp:
              d3,

            ownership,

            siteTopic,

            stability,

            overrides: {
              intentFit: {
                level:
                  "BLOCKED",

                evidence: [
                  "SERP_INTENT_INCOMPATIBLE",
                ],
              },

              contentOpportunity:
                favorable,

              evidenceOpportunity:
                favorable,

              originalValueOpportunity:
                favorable,

              internalAuthority:
                favorable,

              serpOpenness:
                favorable,

              freshnessOpportunity:
                favorable,
            },
          });

        expect(
          result.band
        ).toBe(
          "LOW"
        );

        expect(
          result.blockers
        ).toContain(
          "INTENT_FIT_BLOCKED"
        );
      }
    );


    it(
      "uses SERP volatility to lower certainty rather than fabricate a negative outcome",
      () => {
        const volatile =
          buildSerpStabilityReport([
            d0,

            serp(
              "2026-09-04T00:00:00.000Z",
              [
                "x.com",
                "y.com",
                "z.com",
                "q.com",
                "r.com",
              ]
            ),
          ]);

        const result =
          buildWinnabilityDiagnostic({
            mission,

            targetIntent:
              "INFORMATIONAL",

            latestSerp:
              d3,

            ownership,

            siteTopic,

            stability:
              volatile,

            overrides: {
              contentOpportunity:
                favorable,

              evidenceOpportunity:
                favorable,

              originalValueOpportunity:
                favorable,

              internalAuthority:
                favorable,

              serpOpenness:
                favorable,

              freshnessOpportunity:
                favorable,
            },
          });

        expect(
          result.certaintyNotes
        ).toContain(
          "VOLATILE_SERP_OPPORTUNITY_MAY_BE_HIGHER_BUT_CERTAINTY_IS_LOWER"
        );

        expect(
          result.confidence
        ).not.toBe(
          "HIGH"
        );
      }
    );


    it(
      "does not require external authority evidence in V1",
      () => {
        const result =
          buildWinnabilityDiagnostic({
            mission,

            targetIntent:
              "INFORMATIONAL",

            latestSerp:
              d3,

            ownership,

            siteTopic,

            stability,

            overrides: {
              contentOpportunity:
                favorable,

              evidenceOpportunity:
                favorable,

              originalValueOpportunity:
                favorable,

              internalAuthority:
                favorable,

              serpOpenness:
                favorable,

              freshnessOpportunity:
                favorable,
            },
          });

        const external =
          result.dimensions.find(
            (dimension) =>
              dimension.key ===
              "EXTERNAL_AUTHORITY_GAP"
          );

        expect(
          external?.level
        ).toBe(
          "UNKNOWN"
        );

        expect(
          result.status
        ).toBe(
          "COMPLETE"
        );
      }
    );


    it(
      "identifies the strongest known negative weighted dimension as bottleneck",
      () => {
        const result =
          buildWinnabilityDiagnostic({
            mission,

            targetIntent:
              "INFORMATIONAL",

            latestSerp:
              d3,

            ownership,

            siteTopic,

            stability,

            overrides: {
              contentOpportunity: {
                level:
                  "UNFAVORABLE",

                evidence: [
                  "TOP10_CONTENT_ALREADY_STRONG",
                ],
              },

              evidenceOpportunity:
                favorable,

              originalValueOpportunity:
                favorable,

              internalAuthority:
                favorable,

              serpOpenness:
                favorable,

              freshnessOpportunity:
                favorable,
            },
          });

        expect(
          result.primaryBottleneck
        ).toBe(
          "CONTENT_OPPORTUNITY"
        );

        expect(
          result.constraints
        ).toContain(
          "CONTENT_OPPORTUNITY"
        );
      }
    );


    it(
      "fails closed when ownership belongs to another mission",
      () => {
        expect(
          () =>
            buildWinnabilityDiagnostic({
              mission,

              targetIntent:
                "INFORMATIONAL",

              latestSerp:
                d3,

              siteTopic,

              stability,

              ownership: {
                ...ownership,

                missionId:
                  "another-mission",
              },
            })
        ).toThrow(
          "WINNABILITY_MISSION_OWNERSHIP_MISMATCH"
        );
      }
    );
  }
);
