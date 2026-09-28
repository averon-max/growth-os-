import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildUniversalSeoDecisionV2,
} from "./universal-seo-decision";

import type {
  CannibalizationMode,
} from "./cannibalization-policy";

import {
  applyUniversalSeoDecisionToMasterBlueprintV2,
  applyUniversalSeoDecisionToSectionsV2,
  buildUniversalSeoWriterRulesV2,
} from "./universal-seo-blueprint-wiring";


function decision({
  topic =
    "how to configure canonical tags",

  ownership =
    null,

  mode =
    "SMART",
}: {
  topic?:
    string;

  ownership?:
    unknown;

  mode?:
    CannibalizationMode;
} = {}) {
  return buildUniversalSeoDecisionV2({
    topic,

    readerGoal:
      "Complete the task correctly",

    missionIntent:
      "INFORMATIONAL",

    riskClass:
      "NORMAL",

    serpResearch: {
      results: [
        {
          rank:
            1,

          pageType:
            "GUIDE",

          title:
            "How to configure canonical tags",
        },

        {
          rank:
            2,

          pageType:
            "GUIDE",

          title:
            "Canonical implementation guide",
        },
      ],
    },

    urlOwnership:
      ownership,

    cannibalizationMode:
      mode,
  });
}


describe(
  "Universal SEO Blueprint Wiring V2",
  () => {
    it(
      "overrides generic page type with SERP-derived archetype",
      () => {
        const d =
          decision();

        const result =
          applyUniversalSeoDecisionToMasterBlueprintV2({
            input: {
              action:
                "CREATE" as const,

              pageType:
                "ARTICLE",

              technicalRequirements:
                [],
            },

            decision:
              d,
          });

        expect(
          result.pageType
        ).toBe(
          "HOW_TO"
        );

        expect(
          result.technicalRequirements
        ).toContain(
          "PAGE_ARCHETYPE:HOW_TO"
        );
      }
    );


    it(
      "maps confirmed ownership to MERGE in SMART mode",
      () => {
        const d =
          decision({
            ownership: {
              status:
                "MULTIPLE_OWNERS",

              cannibalization:
                "CONFIRMED",

              actionHint:
                "MERGE_INVESTIGATION",

              primaryOwnerUrl:
                "https://example.com/current",
            },
          });

        const result =
          applyUniversalSeoDecisionToMasterBlueprintV2({
            input: {
              action:
                "CREATE" as const,

              pageType:
                "ARTICLE",
            },

            decision:
              d,
          });

        expect(
          result.action
        ).toBe(
          "MERGE"
        );

        expect(
          result.targetUrl
        ).toBe(
          "https://example.com/current"
        );
      }
    );


    it(
      "maps unresolved SMART overlap to NO_GO",
      () => {
        const d =
          decision({
            ownership: {
              status:
                "UNCERTAIN",

              cannibalization:
                "POTENTIAL",

              actionHint:
                "REVIEW_EXISTING_PAGE",
            },
          });

        const master =
          applyUniversalSeoDecisionToMasterBlueprintV2({
            input: {
              action:
                "CREATE" as const,

              pageType:
                "ARTICLE",
            },

            decision:
              d,
          });

        const sections =
          applyUniversalSeoDecisionToSectionsV2({
            input: {
              sections: [
                {
                  heading:
                    "Example",

                  mission:
                    "Explain it.",

                  expectedOutcome:
                    "Reader understands.",
                },
              ],
            },

            decision:
              d,
          });

        expect(
          master.action
        ).toBe(
          "NO_GO"
        );

        expect(
          sections.sections
        ).toHaveLength(
          0
        );
      }
    );


    it(
      "allows overlap when policy explicitly allows it",
      () => {
        const d =
          decision({
            ownership: {
              status:
                "MULTIPLE_OWNERS",

              cannibalization:
                "CONFIRMED",

              actionHint:
                "MERGE_INVESTIGATION",
            },

            mode:
              "ALLOW",
          });

        const result =
          applyUniversalSeoDecisionToMasterBlueprintV2({
            input: {
              action:
                "MERGE" as const,

              pageType:
                "ARTICLE",
            },

            decision:
              d,
          });

        expect(
          d.recommendedAction
        ).toBe(
          "KEEP_BOTH"
        );

        expect(
          result.action
        ).toBe(
          "CREATE"
        );
      }
    );


    it(
      "pushes archetype rules into section jobs",
      () => {
        const d =
          decision();

        const result =
          applyUniversalSeoDecisionToSectionsV2({
            input: {
              sections: [
                {
                  heading:
                    "Implementation",

                  mission:
                    "Show implementation.",

                  expectedOutcome:
                    "Reader can implement it.",
                },
              ],
            },

            decision:
              d,
          });

        expect(
          result.sections[0]
            ?.mission
        ).toContain(
          "Page archetype: HOW_TO"
        );

        expect(
          result.sections[0]
            ?.mission
        ).toContain(
          "ordered executable steps"
        );
      }
    );


    it(
      "builds writer rules without fake ranking promises",
      () => {
        const rules =
          buildUniversalSeoWriterRulesV2(
            decision()
          );

        const joined =
          rules.join(
            "\n"
          );

        expect(
          joined
        ).toContain(
          "UNIVERSAL_SEO_V2"
        );

        expect(
          joined
        ).toContain(
          "EVIDENCE_MODE:"
        );

        expect(
          joined.toLowerCase()
        ).not.toContain(
          "guaranteed #1"
        );
      }
    );
  }
);
