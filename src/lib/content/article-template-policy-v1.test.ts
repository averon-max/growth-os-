import {
  describe,
  expect,
  it,
} from "vitest";

import {
  ARTICLE_SEARCH_OPTIMIZATION_POLICY_V1,
  ARTICLE_TEMPLATE_OPTIONS_V1,
  ARTICLE_TEMPLATE_POLICIES_V1,
  MATERIAL_TEMPLATE_CLAIMS_V1,
  deriveHeadingPlanningBoundsV1,
  parseArticleTemplateOverrideV1,
  selectArticleTemplateV1,
  shouldUseFaqRoleV1,
  templateAllowsClaimWithoutEvidenceV1,
} from "./article-template-policy-v1";


describe(
  "Article Templates V1",
  () => {
    it(
      "has exactly 15 structural article templates",
      () => {
        expect(
          Object.keys(
            ARTICLE_TEMPLATE_POLICIES_V1
          )
        ).toHaveLength(
          15
        );

        expect(
          ARTICLE_TEMPLATE_OPTIONS_V1
        ).toHaveLength(
          15
        );
      }
    );


    it(
      "does not model health as article structure",
      () => {
        expect(
          Object.keys(
            ARTICLE_TEMPLATE_POLICIES_V1
          )
        ).not.toContain(
          "HEALTH_NUTRITION_GUIDE"
        );
      }
    );


    it(
      "keeps one H1 and dynamic SEO coverage",
      () => {
        expect(
          ARTICLE_SEARCH_OPTIMIZATION_POLICY_V1
            .h1Count
        ).toBe(1);

        expect(
          ARTICLE_SEARCH_OPTIMIZATION_POLICY_V1
            .primaryQueryCount
        ).toBe(1);

        expect(
          ARTICLE_SEARCH_OPTIMIZATION_POLICY_V1
            .keywordDensityTarget
        ).toBeNull();

        expect(
          ARTICLE_SEARCH_OPTIMIZATION_POLICY_V1
            .fixedSecondaryKeywordCount
        ).toBeNull();

        expect(
          ARTICLE_SEARCH_OPTIMIZATION_POLICY_V1
            .fixedWordCount
        ).toBeNull();
      }
    );


    it(
      "routes comparisons",
      () => {
        expect(
          selectArticleTemplateV1({
            primaryQuery:
              "PDR vs traditional repair",
          }).id
        ).toBe(
          "COMPARISON"
        );
      }
    );


    it(
      "routes how-to queries",
      () => {
        expect(
          selectArticleTemplateV1({
            primaryQuery:
              "how to add canonical tags",
          }).id
        ).toBe(
          "HOW_TO"
        );
      }
    );


    it(
      "does not invent rankings from best/top wording",
      () => {
        expect(
          selectArticleTemplateV1({
            primaryQuery:
              "best freeze dried candy",
            rankingEvidenceAvailable:
              false,
          }).id
        ).toBe(
          "CURATED_LIST"
        );
      }
    );


    it(
      "allows ranking structure when ranking evidence exists",
      () => {
        expect(
          selectArticleTemplateV1({
            primaryQuery:
              "best freeze dried candy",
            rankingEvidenceAvailable:
              true,
          }).id
        ).toBe(
          "RANKED_LIST"
        );
      }
    );


    it(
      "routes geo service intent",
      () => {
        expect(
          selectArticleTemplateV1({
            primaryQuery:
              "paintless dent repair Calgary",
            hasGeoIntent:
              true,
          }).id
        ).toBe(
          "LOCAL_SERVICE_GUIDE"
        );
      }
    );


    it(
      "maps health-shaped SERP to structure without creating a health template",
      () => {
        expect(
          selectArticleTemplateV1({
            primaryQuery:
              "freeze dried snacks for athletes",
            dominantSerpPageType:
              "HEALTH_NUTRITION",
          }).id
        ).toBe(
          "EXPLAINER_GUIDE"
        );
      }
    );


    it(
      "supports AUTO",
      () => {
        expect(
          parseArticleTemplateOverrideV1(
            "AUTO"
          )
        ).toBeNull();

        expect(
          parseArticleTemplateOverrideV1(
            undefined
          )
        ).toBeNull();
      }
    );


    it(
      "accepts manual structural override",
      () => {
        expect(
          parseArticleTemplateOverrideV1(
            "COMPARISON"
          )
        ).toBe(
          "COMPARISON"
        );
      }
    );


    it(
      "rejects removed health structural override",
      () => {
        expect(
          () =>
            parseArticleTemplateOverrideV1(
              "HEALTH_NUTRITION_GUIDE"
            )
        ).toThrow(
          "ARTICLE_TEMPLATE_OVERRIDE_INVALID"
        );
      }
    );


    it(
      "never permits material claims without evidence",
      () => {
        for (
          const claim
          of MATERIAL_TEMPLATE_CLAIMS_V1
        ) {
          expect(
            templateAllowsClaimWithoutEvidenceV1(
              claim
            )
          ).toBe(false);
        }
      }
    );


    it(
      "adds FAQ only when real unanswered questions exist",
      () => {
        expect(
          shouldUseFaqRoleV1({
            uncoveredQuestionJobCount:
              0,
          })
        ).toBe(false);

        expect(
          shouldUseFaqRoleV1({
            uncoveredQuestionJobCount:
              4,
          })
        ).toBe(true);
      }
    );


    it(
      "keeps heading counts as guidance instead of authority",
      () => {
        const result =
          deriveHeadingPlanningBoundsV1(
            ARTICLE_TEMPLATE_POLICIES_V1
              .COMPARISON
          );

        expect(
          result.h1
        ).toEqual({
          min:
            1,
          max:
            1,
        });

        expect(
          result.authority
        ).toBe(
          "PLANNING_GUIDANCE_ONLY"
        );
      }
    );
  }
);
