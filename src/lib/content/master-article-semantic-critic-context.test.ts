import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildMasterArticleSemanticCriticContextV1,
} from "./master-article-semantic-critic-context";

import type {
  MasterRuntimeSnapshotV1,
} from "./master-runtime-adapter";


function runtime({
  serp = true,
  ownership = true,
}: {
  serp?:
    boolean;

  ownership?:
    boolean;
} = {}):
MasterRuntimeSnapshotV1 {
  return {
    serpResearch:
      serp
        ? {
            results: [
              {
                rank:
                  1,

                url:
                  "https://competitor.example/article",

                domain:
                  "competitor.example",

                title:
                  "What Credit Monitoring Does",

                snippet:
                  "Credit monitoring watches for certain changes in credit-report data and can notify consumers when monitored activity appears.",

                pageType:
                  "ARTICLE",

                h1:
                  "Credit Monitoring Explained",

                h2: [
                  "How monitoring works",
                  "What monitoring does not prevent",
                ],
              },
            ],
          }
        : null,

    urlOwnership:
      ownership
        ? {
            version:
              "URL_OWNERSHIP_V1",

            missionId:
              "mission-1",

            status:
              "SINGLE_OWNER",

            cannibalization:
              "NONE",

            actionHint:
              "UPDATE_CANDIDATE",

            primaryOwnerUrl:
              "https://site.example/existing",

            candidates: [
              {
                url:
                  "https://site.example/existing",

                matchedQueries: [
                  "what is credit monitoring",
                ],

                intentMatch:
                  true,

                queryOverlap:
                  0.75,

                matchedImpressions:
                  420,

                missionAffinity:
                  0.91,
              },
            ],

            targetQueries: [
              "what is credit monitoring",
            ],

            evidence: [
              "SINGLE_GSC_QUERY_OWNER",
            ],
          }
        : null,
  } as unknown as
    MasterRuntimeSnapshotV1;
}


describe(
  "Master Article Semantic Critic Context V1",
  () => {
    it(
      "builds originality references only from real persisted SERP result text",
      () => {
        const context =
          buildMasterArticleSemanticCriticContextV1(
            runtime()
          );


        expect(
          context
            .originalityReferences
        ).toHaveLength(
          1
        );

        expect(
          context
            .originalityReferences[
              0
            ]
        ).toEqual({
          id:
            "https://competitor.example/article",

          label:
            "What Credit Monitoring Does",

          text:
            [
              "What Credit Monitoring Does",
              "Credit monitoring watches for certain changes in credit-report data and can notify consumers when monitored activity appears.",
              "Credit Monitoring Explained",
              "H2: How monitoring works",
              "H2: What monitoring does not prevent",
            ].join(
              "\n"
            ),
        });
      }
    );


    it(
      "does not pretend originality context exists when SERP is missing",
      () => {
        const context =
          buildMasterArticleSemanticCriticContextV1(
            runtime({
              serp:
                false,
            })
          );


        expect(
          context
            .originalityReferences
        ).toEqual(
          []
        );
      }
    );


    it(
      "does not treat a tiny SERP title as sufficient originality comparison material",
      () => {
        const value =
          runtime();

        (
          value.serpResearch as any
        ).results = [
          {
            url:
              "https://competitor.example/thin",

            title:
              "Credit",
          },
        ];


        const context =
          buildMasterArticleSemanticCriticContextV1(
            value
          );


        expect(
          context
            .originalityReferences
        ).toEqual(
          []
        );
      }
    );


    it(
      "maps real URL Ownership metrics without inventing title or H1",
      () => {
        const context =
          buildMasterArticleSemanticCriticContextV1(
            runtime()
          );


        expect(
          context
            .cannibalizationCandidates
        ).toHaveLength(
          1
        );


        const candidate =
          context
            .cannibalizationCandidates[
              0
            ];


        expect(
          candidate
        ).toMatchObject({
          id:
            "https://site.example/existing",

          url:
            "https://site.example/existing",

          title:
            null,

          h1:
            null,

          matchedQueries: [
            "what is credit monitoring",
          ],

          intentMatch:
            true,

          queryOverlap:
            0.75,

          matchedImpressions:
            420,

          missionAffinity:
            0.91,
        });
      }
    );


    it(
      "never converts matched query text into a fake query-node ID",
      () => {
        const context =
          buildMasterArticleSemanticCriticContextV1(
            runtime()
          );


        expect(
          context
            .cannibalizationCandidates[
              0
            ]?.queryNodeIds
        ).toEqual(
          []
        );


        expect(
          context
            .cannibalizationCandidates[
              0
            ]?.matchedQueries
        ).toEqual([
          "what is credit monitoring",
        ]);
      }
    );


    it(
      "returns no cannibalization candidates for historical runtime without ownership",
      () => {
        const context =
          buildMasterArticleSemanticCriticContextV1(
            runtime({
              ownership:
                false,
            })
          );


        expect(
          context
            .cannibalizationCandidates
        ).toEqual(
          []
        );
      }
    );


    it(
      "preserves real title and H1 only when ownership actually contains them",
      () => {
        const value =
          runtime();

        const candidate =
          (
            value.urlOwnership as any
          ).candidates[
            0
          ];

        candidate.title =
          "Existing Monitoring Page";

        candidate.h1 =
          "Credit Monitoring Guide";


        const context =
          buildMasterArticleSemanticCriticContextV1(
            value
          );


        expect(
          context
            .cannibalizationCandidates[
              0
            ]?.title
        ).toBe(
          "Existing Monitoring Page"
        );

        expect(
          context
            .cannibalizationCandidates[
              0
            ]?.h1
        ).toBe(
          "Credit Monitoring Guide"
        );
      }
    );


    it(
      "freezes real critic context",
      () => {
        const context =
          buildMasterArticleSemanticCriticContextV1(
            runtime()
          );


        expect(
          Object.isFrozen(
            context
          )
        ).toBe(
          true
        );

        expect(
          Object.isFrozen(
            context
              .originalityReferences
          )
        ).toBe(
          true
        );

        expect(
          Object.isFrozen(
            context
              .cannibalizationCandidates
          )
        ).toBe(
          true
        );

        expect(
          Object.isFrozen(
            context
              .cannibalizationCandidates[
                0
              ]
          )
        ).toBe(
          true
        );
      }
    );
  }
);
