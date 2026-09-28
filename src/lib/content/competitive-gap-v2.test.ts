import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildCompetitiveGapV2,
} from "./competitive-gap-v2";

import {
  buildSerpConsensusV2,
} from "./serp-consensus-v2";


describe(
  "Competitive Gap V2",
  () => {
    it(
      "compares SERP consensus only against mission coverage",
      () => {
        const consensus =
          buildSerpConsensusV2({
            results: [
              {
                rank:
                  1,

                topics: [
                  "Setup",
                  "Vendor pricing",
                ],

                questions: [
                  "How does setup work?",
                ],
              },

              {
                rank:
                  2,

                topics: [
                  "Setup",
                  "Vendor pricing",
                ],

                questions: [
                  "How does setup work?",
                ],
              },

              {
                rank:
                  3,

                topics: [
                  "Setup",
                ],
              },
            ],
          });


        const gap =
          buildCompetitiveGapV2({
            consensus,

            expectedCoverage: {
              requiredTopics: [
                "Setup",
                "Security limitations",
              ],

              supportingTopics:
                [],
            },
          });


        expect(
          gap.topicAssessments
            .find(
              (
                item
              ) =>
                item.topic ===
                "Setup"
            )
            ?.status
        ).toBe(
          "SERP_CONSENSUS"
        );


        expect(
          gap.lowConsensusMissionTopics
        ).toContain(
          "Security limitations"
        );


        /*
         * Vendor pricing is recurring in SERP but not in
         * mission coverage, therefore review-only.
         */
        expect(
          gap.reviewOnlyConsensusTopics
        ).toContain(
          "Vendor pricing"
        );
      }
    );
  }
);
