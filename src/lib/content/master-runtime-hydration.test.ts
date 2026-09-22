import {
  describe,
  expect,
  it,
} from "vitest";

import {
  hydrateMasterRuntimeDates,
} from "./master-runtime-hydration";


describe(
  "Master Runtime JSON hydration",
  () => {
    it(
      "hydrates dates after a JSON persistence round trip",
      () => {
        const persisted =
          JSON.parse(
            JSON.stringify({
              mission: {
                version:
                  "SEARCH_MISSION_V1",

                id:
                  "mission-1",

                createdAt:
                  new Date(
                    "2026-09-21T20:00:00.000Z"
                  ),
              },

              serpResearch: {
                version:
                  "SERP_SNAPSHOT_V1",

                capturedAt:
                  new Date(
                    "2026-09-21T20:01:00.000Z"
                  ),
              },

              evidenceGraph: {
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
                      "PRIMARY_OFFICIAL",

                    authorityTier:
                      "B",

                    publishedAt:
                      new Date(
                        "2026-09-01T00:00:00.000Z"
                      ),

                    updatedAt:
                      new Date(
                        "2026-09-20T00:00:00.000Z"
                      ),

                    retrievedAt:
                      new Date(
                        "2026-09-21T20:02:00.000Z"
                      ),
                  },
                ],

                claimEvidence:
                  [],
              },
            })
          );

        const hydrated =
          hydrateMasterRuntimeDates({
            mission:
              persisted.mission,

            serpResearch:
              persisted.serpResearch,

            evidenceGraph:
              persisted.evidenceGraph,
          });

        expect(
          hydrated.mission
            .createdAt
        ).toBeInstanceOf(
          Date
        );

        expect(
          hydrated.serpResearch
            ?.capturedAt
        ).toBeInstanceOf(
          Date
        );

        expect(
          hydrated.evidenceGraph
            .sources[0]
            ?.publishedAt
        ).toBeInstanceOf(
          Date
        );

        expect(
          hydrated.evidenceGraph
            .sources[0]
            ?.updatedAt
        ).toBeInstanceOf(
          Date
        );

        expect(
          hydrated.evidenceGraph
            .sources[0]
            ?.retrievedAt
        ).toBeInstanceOf(
          Date
        );
      }
    );


    it(
      "fails closed on invalid persisted dates",
      () => {
        expect(
          () =>
            hydrateMasterRuntimeDates({
              mission: {
                createdAt:
                  "not-a-date",
              },

              serpResearch:
                null,

              evidenceGraph: {
                sources:
                  [],

                claimEvidence:
                  [],
              },
            })
        ).toThrow(
          "MASTER_RUNTIME_MISSION_DATE_INVALID"
        );
      }
    );


    it(
      "does not manufacture a SERP timestamp when SERP research is absent",
      () => {
        const hydrated =
          hydrateMasterRuntimeDates({
            mission: {
              createdAt:
                "2026-09-21T20:00:00.000Z",
            },

            serpResearch:
              null,

            evidenceGraph: {
              sources:
                [],

              claimEvidence:
                [],
            },
          });

        expect(
          hydrated.serpResearch
        ).toBeNull();
      }
    );
  }
);
