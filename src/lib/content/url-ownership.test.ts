import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createSearchMission,
} from "./search-mission";

import {
  buildQueryGraph,
} from "./query-graph";

import {
  evaluateUrlOwnership,
} from "./url-ownership";

import type {
  SitePageSignal,
} from "./site-topic-graph";


const mission =
  createSearchMission({
    id:
      "mission-credit-monitoring-v1",

    websiteId:
      "site-1",

    topic:
      "what is credit monitoring",

    audience:
      "US consumers concerned about fraud and identity theft",

    readerGoal:
      "Understand what credit monitoring is and how it works.",

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


const graph =
  buildQueryGraph({
    mission,

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
          0.95,

        sameMissionEvidence:
          true,
      },

      {
        query:
          "how does credit monitoring work",

        intent:
          "INFORMATIONAL",

        subIntent:
          "FUNCTION",

        cluster:
          "CREDIT_MONITORING",

        siteCoverage:
          "WEAK",

        source:
          "PAA",

        sourceConfidence:
          0.8,

        sameMissionEvidence:
          true,
      },

      {
        query:
          "best credit monitoring services",

        intent:
          "COMMERCIAL",

        subIntent:
          "EVALUATION",

        cluster:
          "CREDIT_MONITORING_SERVICES",

        siteCoverage:
          "NONE",

        source:
          "DATAFORSEO",

        sourceConfidence:
          0.9,
      },
    ],
  });


function page(
  input:
    Partial<SitePageSignal> &
    Pick<
      SitePageSignal,
      | "id"
      | "url"
    >
): SitePageSignal {
  return {
    id:
      input.id,

    url:
      input.url,

    title:
      input.title ??
      null,

    h1:
      input.h1 ??
      null,

    cluster:
      input.cluster ??
      "Credit Monitoring",

    topics:
      input.topics ??
      [
        "credit monitoring",
      ],

    primaryIntent:
      input.primaryIntent ??
      "INFORMATIONAL",

    indexed:
      input.indexed ??
      true,

    queries:
      input.queries ??
      [],

    internalLinksIn:
      input.internalLinksIn ??
      null,

    internalLinksOut:
      input.internalLinksOut ??
      null,

    lastModifiedAt:
      input.lastModifiedAt ??
      null,

    contentCoverage:
      input.contentCoverage ??
      null,

    serpFootprint:
      input.serpFootprint ??
      null,
  };
}


describe(
  "URL Ownership V1",
  () => {
    it(
      "returns UPDATE candidate when one URL owns mission queries",
      () => {
        const result =
          evaluateUrlOwnership({
            mission,

            missionIntent:
              "INFORMATIONAL",

            queryGraph:
              graph,

            pages: [
              page({
                id:
                  "p1",

                url:
                  "/credit-monitoring",

                title:
                  "Credit Monitoring Guide",

                queries: [
                  {
                    query:
                      "what is credit monitoring",

                    impressions:
                      500,

                    clicks:
                      30,

                    position:
                      7,

                    branded:
                      false,
                  },
                ],
              }),
            ],
          });

        expect(
          result.status
        ).toBe(
          "SINGLE_OWNER"
        );

        expect(
          result.primaryOwnerUrl
        ).toBe(
          "/credit-monitoring"
        );

        expect(
          result.actionHint
        ).toBe(
          "UPDATE_CANDIDATE"
        );

        expect(
          result.cannibalization
        ).toBe(
          "NONE"
        );
      }
    );


    it(
      "detects confirmed cannibalization when two URLs receive the same mission query",
      () => {
        const result =
          evaluateUrlOwnership({
            mission,

            missionIntent:
              "INFORMATIONAL",

            queryGraph:
              graph,

            pages: [
              page({
                id:
                  "p1",

                url:
                  "/credit-monitoring",

                queries: [
                  {
                    query:
                      "what is credit monitoring",

                    impressions:
                      300,

                    position:
                      8,

                    branded:
                      false,
                  },
                ],
              }),

              page({
                id:
                  "p2",

                url:
                  "/credit-monitoring-guide",

                queries: [
                  {
                    query:
                      "what is credit monitoring",

                    impressions:
                      220,

                    position:
                      11,

                    branded:
                      false,
                  },
                ],
              }),
            ],
          });

        expect(
          result.status
        ).toBe(
          "MULTIPLE_OWNERS"
        );

        expect(
          result.cannibalization
        ).toBe(
          "CONFIRMED"
        );

        expect(
          result.actionHint
        ).toBe(
          "MERGE_INVESTIGATION"
        );
      }
    );


    it(
      "does not call a different-intent URL the mission owner",
      () => {
        const result =
          evaluateUrlOwnership({
            mission,

            missionIntent:
              "INFORMATIONAL",

            queryGraph:
              graph,

            pages: [
              page({
                id:
                  "commercial",

                url:
                  "/best-credit-monitoring",

                primaryIntent:
                  "COMMERCIAL",

                queries: [
                  {
                    query:
                      "what is credit monitoring",

                    impressions:
                      90,

                    position:
                      18,

                    branded:
                      false,
                  },
                ],
              }),
            ],
          });

        expect(
          result.status
        ).toBe(
          "INTENT_CONFLICT"
        );

        expect(
          result.primaryOwnerUrl
        ).toBeNull();

        expect(
          result.actionHint
        ).toBe(
          "REPOSITION_INVESTIGATION"
        );
      }
    );


    it(
      "does not invent ownership from topical similarity alone",
      () => {
        const result =
          evaluateUrlOwnership({
            mission,

            missionIntent:
              "INFORMATIONAL",

            queryGraph:
              graph,

            pages: [
              page({
                id:
                  "related",

                url:
                  "/credit-monitoring-guide",

                title:
                  "Credit Monitoring Guide",

                h1:
                  "Credit Monitoring",

                queries:
                  [],
              }),
            ],
          });

        expect(
          result.status
        ).toBe(
          "UNCERTAIN"
        );

        expect(
          result.primaryOwnerUrl
        ).toBeNull();

        expect(
          result.actionHint
        ).toBe(
          "REVIEW_EXISTING_PAGE"
        );

        expect(
          result.evidence
        ).toContain(
          "DO_NOT_INVENT_URL_OWNER"
        );
      }
    );


    it(
      "returns CREATE candidate when no existing URL has ownership evidence",
      () => {
        const result =
          evaluateUrlOwnership({
            mission,

            missionIntent:
              "INFORMATIONAL",

            queryGraph:
              graph,

            pages: [
              page({
                id:
                  "unrelated",

                url:
                  "/weather",

                title:
                  "Weather Tomorrow",

                h1:
                  "Weather Tomorrow",

                cluster:
                  "Weather",

                topics: [
                  "weather",
                ],

                queries: [
                  {
                    query:
                      "weather tomorrow",

                    impressions:
                      50000,

                    position:
                      1,

                    branded:
                      false,
                  },
                ],
              }),
            ],
          });

        expect(
          result.status
        ).toBe(
          "NO_OWNER"
        );

        expect(
          result.actionHint
        ).toBe(
          "CREATE_CANDIDATE"
        );
      }
    );


    it(
      "ignores alternate-intent query nodes when determining same-page ownership",
      () => {
        const result =
          evaluateUrlOwnership({
            mission,

            missionIntent:
              "INFORMATIONAL",

            queryGraph:
              graph,

            pages: [
              page({
                id:
                  "commercial",

                url:
                  "/best-credit-monitoring",

                primaryIntent:
                  "COMMERCIAL",

                queries: [
                  {
                    query:
                      "best credit monitoring services",

                    impressions:
                      900,

                    position:
                      5,

                    branded:
                      false,
                  },
                ],
              }),
            ],
          });

        expect(
          result.status
        ).toBe(
          "NO_OWNER"
        );

        expect(
          result.primaryOwnerUrl
        ).toBeNull();
      }
    );
  }
);
