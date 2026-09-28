import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildCompetitiveGapV2,
} from "./competitive-gap-v2";

import {
  applyCompetitiveSeoToMasterBlueprintV2,
} from "./competitive-seo-blueprint-wiring";

import {
  buildSerpConsensusV2,
} from "./serp-consensus-v2";


describe(
  "Competitive SEO Blueprint Wiring V2",
  () => {
    it(
      "adds real consensus signals without creating structure-count targets",
      () => {
        const consensus =
          buildSerpConsensusV2({
            results: [
              {
                rank:
                  1,

                pageType:
                  "GUIDE",

                topics: [
                  "Implementation",
                ],

                questions: [
                  "How do I implement it?",
                ],

                h2: [
                  "Implementation",
                ],

                wordCount:
                  2500,
              },

              {
                rank:
                  2,

                pageType:
                  "GUIDE",

                topics: [
                  "Implementation",
                ],

                questions: [
                  "How do I implement it?",
                ],

                h2: [
                  "Implementation",
                ],

                wordCount:
                  5000,
              },

              {
                rank:
                  3,

                pageType:
                  "GUIDE",

                topics: [
                  "Implementation",
                ],

                questions: [
                  "How do I implement it?",
                ],

                h2: [
                  "Implementation",
                ],
              },
            ],
          });


        const competitiveGap =
          buildCompetitiveGapV2({
            consensus,

            expectedCoverage: {
              requiredTopics: [
                "Implementation",
              ],

              supportingTopics:
                [],
            },
          });


        const result =
          applyCompetitiveSeoToMasterBlueprintV2({
            input: {
              questions:
                [],

              competitorStrengths:
                [],

              competitorWeaknesses:
                [],

              technicalRequirements:
                [],
            },

            consensus,

            competitiveGap,
          });


        expect(
          result.questions
        ).toContain(
          "How do I implement it?"
        );


        expect(
          result.competitorStrengths
            ?.join(
              "\n"
            )
        ).toContain(
          "Recurring SERP topic: Implementation"
        );


        const rules =
          result.technicalRequirements
            ?.join(
              "\n"
            ) ??
          "";


        expect(
          rules
        ).toContain(
          "Observed competitor word counts are not content-length targets."
        );


        expect(
          rules
        ).toContain(
          "Observed competitor heading counts are not heading-count targets."
        );
      }
    );


    it(
      "is a no-op when SERP evidence is absent",
      () => {
        const consensus =
          buildSerpConsensusV2(
            null
          );


        const competitiveGap =
          buildCompetitiveGapV2({
            consensus,

            expectedCoverage: {
              requiredTopics:
                [],

              supportingTopics:
                [],
            },
          });


        const input = {
          questions: [
            "Existing",
          ],
        };


        expect(
          applyCompetitiveSeoToMasterBlueprintV2({
            input,

            consensus,

            competitiveGap,
          })
        ).toBe(
          input
        );
      }
    );
  }
);
