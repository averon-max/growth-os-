import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildSiteTopicGraph,
} from "./site-topic-graph";


describe(
  "SiteTopicGraph V1",
  () => {
    it(
      "builds topic signals only from supplied page and search evidence",
      () => {
        const graph =
          buildSiteTopicGraph({
            websiteId:
              "site-1",

            observedAt:
              new Date(
                "2026-09-21T00:00:00.000Z"
              ),

            missionTopic:
              "credit monitoring",

            pages: [
              {
                id:
                  "page-1",

                url:
                  "/credit-monitoring",

                title:
                  "Credit Monitoring Guide",

                h1:
                  "Credit Monitoring",

                cluster:
                  "Credit Monitoring",

                topics: [
                  "credit monitoring",
                  "credit alerts",
                ],

                primaryIntent:
                  "INFORMATIONAL",

                indexed:
                  true,

                queries: [
                  {
                    query:
                      "what is credit monitoring",

                    impressions:
                      500,

                    clicks:
                      40,

                    position:
                      6,

                    branded:
                      false,
                  },

                  {
                    query:
                      "scanmycreds credit monitoring",

                    impressions:
                      50,

                    clicks:
                      10,

                    position:
                      2,

                    branded:
                      true,
                  },
                ],

                internalLinksIn:
                  4,

                internalLinksOut:
                  6,

                lastModifiedAt:
                  new Date(
                    "2026-09-11T00:00:00.000Z"
                  ),

                contentCoverage:
                  "STRONG",

                serpFootprint:
                  3,
              },
            ],
          });

        expect(
          graph.version
        ).toBe(
          "SITE_TOPIC_GRAPH_V1"
        );

        expect(
          graph.nodes
        ).toHaveLength(
          1
        );

        const node =
          graph.nodes[0];

        expect(
          node?.existingPages
        ).toBe(
          1
        );

        expect(
          node?.indexedPages
        ).toBe(
          1
        );

        expect(
          node?.queryBreadth
        ).toBe(
          2
        );

        expect(
          node?.nonBrandImpressions
        ).toBe(
          500
        );

        expect(
          node?.clicks
        ).toBe(
          50
        );

        expect(
          node?.top10Queries
        ).toBe(
          2
        );

        expect(
          node?.internalLinksIn
        ).toBe(
          4
        );

        expect(
          node?.freshnessAgeDays
        ).toBe(
          10
        );

        expect(
          node?.missionAffinity
        ).toBeGreaterThan(
          0.9
        );
      }
    );


    it(
      "does not let unrelated high-impression pages inflate another topic",
      () => {
        const graph =
          buildSiteTopicGraph({
            websiteId:
              "site-1",

            observedAt:
              new Date(
                "2026-09-21T00:00:00.000Z"
              ),

            missionTopic:
              "credit monitoring",

            pages: [
              {
                id:
                  "weather",

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

                primaryIntent:
                  "INFORMATIONAL",

                indexed:
                  true,

                queries: [
                  {
                    query:
                      "weather tomorrow",

                    impressions:
                      100000,

                    clicks:
                      5000,

                    position:
                      1,

                    branded:
                      false,
                  },
                ],
              },

              {
                id:
                  "credit",

                url:
                  "/credit-monitoring",

                title:
                  "Credit Monitoring",

                h1:
                  "Credit Monitoring",

                cluster:
                  "Credit Monitoring",

                topics: [
                  "credit monitoring",
                ],

                primaryIntent:
                  "INFORMATIONAL",

                indexed:
                  true,

                queries: [
                  {
                    query:
                      "credit monitoring",

                    impressions:
                      100,

                    clicks:
                      5,

                    position:
                      12,

                    branded:
                      false,
                  },
                ],
              },
            ],
          });

        const credit =
          graph.nodes.find(
            (node) =>
              node.cluster ===
              "Credit Monitoring"
          );

        const weather =
          graph.nodes.find(
            (node) =>
              node.cluster ===
              "Weather"
          );

        expect(
          credit?.nonBrandImpressions
        ).toBe(
          100
        );

        expect(
          weather?.nonBrandImpressions
        ).toBe(
          100000
        );

        expect(
          credit?.missionAffinity
        ).toBeGreaterThan(
          weather?.missionAffinity ??
          0
        );
      }
    );


    it(
      "keeps unknown internal-link and freshness data unknown",
      () => {
        const graph =
          buildSiteTopicGraph({
            websiteId:
              "site-1",

            observedAt:
              new Date(
                "2026-09-21T00:00:00.000Z"
              ),

            pages: [
              {
                id:
                  "page-1",

                url:
                  "/credit-monitoring",

                cluster:
                  "Credit Monitoring",

                topics: [
                  "credit monitoring",
                ],

                primaryIntent:
                  "INFORMATIONAL",

                indexed:
                  true,

                queries: [],
              },
            ],
          });

        const node =
          graph.nodes[0];

        expect(
          node?.internalLinksIn
        ).toBeNull();

        expect(
          node?.internalLinksOut
        ).toBeNull();

        expect(
          node?.newestModifiedAt
        ).toBeNull();

        expect(
          node?.freshnessAgeDays
        ).toBeNull();

        expect(
          node?.serpFootprint
        ).toBeNull();
      }
    );


    it(
      "does not include backlinks as a Stage 3 dependency",
      () => {
        const source =
          buildSiteTopicGraph.toString();

        expect(
          source
        ).not.toContain(
          "referringDomains"
        );

        expect(
          source
        ).not.toContain(
          "backlinks"
        );
      }
    );
  }
);
