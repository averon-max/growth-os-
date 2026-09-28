import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildUniversalSeoDecisionV2,
} from "./universal-seo-decision";


describe(
  "Universal SEO Decision V2",
  () => {
    it(
      "raises the evidence standard for YMYL regardless of topic",
      () => {
        const decision =
          buildUniversalSeoDecisionV2({
            topic:
              "mortgage refinancing",

            readerGoal:
              "Understand refinancing",

            missionIntent:
              "INFORMATIONAL",

            riskClass:
              "YMYL_FINANCE",

            serpResearch: {
              results: [
                {
                  rank:
                    1,

                  pageType:
                    "ARTICLE",
                },
              ],
            },

            urlOwnership:
              null,
          });

        expect(
          decision.evidenceMode
        ).toBe(
          "STRICT_PRIMARY_SOURCES"
        );
      }
    );


    it(
      "maps confirmed cannibalization into MERGE",
      () => {
        const decision =
          buildUniversalSeoDecisionV2({
            topic:
              "technical seo",

            readerGoal:
              "Learn technical SEO",

            missionIntent:
              "INFORMATIONAL",

            riskClass:
              "NORMAL",

            serpResearch:
              null,

            urlOwnership: {
              status:
                "MULTIPLE_OWNERS",

              cannibalization:
                "CONFIRMED",

              actionHint:
                "MERGE_INVESTIGATION",
            },
          });

        expect(
          decision.recommendedAction
        ).toBe(
          "MERGE"
        );

        expect(
          decision.productionReady
        ).toBe(
          true
        );
      }
    );


    it(
      "requires review when ownership is genuinely uncertain",
      () => {
        const decision =
          buildUniversalSeoDecisionV2({
            topic:
              "seo audit",

            readerGoal:
              "Understand SEO audits",

            missionIntent:
              "INFORMATIONAL",

            riskClass:
              "NORMAL",

            serpResearch:
              null,

            urlOwnership: {
              status:
                "UNCERTAIN",

              cannibalization:
                "POTENTIAL",

              actionHint:
                "REVIEW_EXISTING_PAGE",
            },
          });

        expect(
          decision.recommendedAction
        ).toBe(
          "REVIEW"
        );

        expect(
          decision.productionReady
        ).toBe(
          false
        );
      }
    );
  }
);
