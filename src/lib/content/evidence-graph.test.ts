import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildEvidenceGraph,
  defaultAuthorityTier,
  isPublicationGradeClaimEvidence,
} from "./evidence-graph";


describe(
  "Evidence Graph V1",
  () => {
    it(
      "implements the master source hierarchy",
      () => {
        expect(
          defaultAuthorityTier(
            "PRIMARY_GOVERNMENT"
          )
        ).toBe(
          "A"
        );

        expect(
          defaultAuthorityTier(
            "PRIMARY_OFFICIAL"
          )
        ).toBe(
          "B"
        );

        expect(
          defaultAuthorityTier(
            "ACADEMIC"
          )
        ).toBe(
          "C"
        );

        expect(
          defaultAuthorityTier(
            "COMPETITOR"
          )
        ).toBe(
          "E"
        );

        expect(
          defaultAuthorityTier(
            "UGC"
          )
        ).toBe(
          "F"
        );
      }
    );


    it(
      "stores source provenance and claim edges",
      () => {
        const graph =
          buildEvidenceGraph({
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

                updatedAt:
                  new Date(
                    "2026-09-01T00:00:00.000Z"
                  ),

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
                  "cfpb",

                relation:
                  "SUPPORTS",

                kind:
                  "VERIFIED_EXCERPT",

                excerpt:
                  "Verified source excerpt.",
              },
            ],
          });

        expect(
          graph.version
        ).toBe(
          "EVIDENCE_GRAPH_V1"
        );

        expect(
          graph.sources
        ).toHaveLength(
          1
        );

        expect(
          graph.claimEvidence
        ).toHaveLength(
          1
        );

        expect(
          Object.isFrozen(
            graph
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "never treats search snippets or reference-only records as publication evidence",
      () => {
        expect(
          isPublicationGradeClaimEvidence({
            id:
              "e1",

            claimId:
              "c1",

            sourceId:
              "s1",

            relation:
              "SUPPORTS",

            kind:
              "SEARCH_SNIPPET",

            excerpt:
              "snippet",
          })
        ).toBe(
          false
        );

        expect(
          isPublicationGradeClaimEvidence({
            id:
              "e2",

            claimId:
              "c1",

            sourceId:
              "s1",

            relation:
              "SUPPORTS",

            kind:
              "REFERENCE_ONLY",
          })
        ).toBe(
          false
        );

        expect(
          isPublicationGradeClaimEvidence({
            id:
              "e3",

            claimId:
              "c1",

            sourceId:
              "s1",

            relation:
              "SUPPORTS",

            kind:
              "VERIFIED_EXCERPT",

            excerpt:
              "verified text",
          })
        ).toBe(
          true
        );
      }
    );


    it(
      "fails closed when a verified excerpt has no excerpt text",
      () => {
        expect(
          () =>
            buildEvidenceGraph({
              sources: [
                {
                  id:
                    "s1",

                  url:
                    "https://example.com",

                  publisher:
                    "Example",

                  sourceType:
                    "PRIMARY_OFFICIAL",

                  authorityTier:
                    "B",

                  retrievedAt:
                    new Date(),
                },
              ],

              claimEvidence: [
                {
                  id:
                    "e1",

                  claimId:
                    "c1",

                  sourceId:
                    "s1",

                  relation:
                    "SUPPORTS",

                  kind:
                    "VERIFIED_EXCERPT",
                },
              ],
            })
        ).toThrow(
          "VERIFIED_EXCERPT_TEXT_REQUIRED"
        );
      }
    );
  }
);
