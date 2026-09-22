import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  FinalContentPlan,
} from "./final-content-plan";

import {
  analyzeSerpFeasibility,
} from "./serp-feasibility";

function plan({
  serpAvailable = true,
  organic = [],
  eligiblePages = 5,
  pageTypeMix = {},
  targetFormat = "GUIDE",
  aiOverview = false,
  peopleAlsoAsk = false,
  contentGaps = [],
  pageDecisionType = "CREATE_NEW",
}: {
  serpAvailable?: boolean;

  organic?: Array<{
    domain: string;
    url: string;
    title: string;
  }>;

  eligiblePages?: number;

  pageTypeMix?:
    Record<string, number>;

  targetFormat?: string;

  aiOverview?: boolean;

  peopleAlsoAsk?: boolean;

  contentGaps?: string[];

  pageDecisionType?:
    string;
}): FinalContentPlan {
  return {
    serpSnapshot:
      serpAvailable
        ? {
            organic,
          }
        : null,

    serpAvailable,

    confidence:
      organic.length >=
        8 &&
      eligiblePages >=
        3
        ? "HIGH"
        : "MEDIUM",

    targetFormat,

    pageDecision: {
      type:
        pageDecisionType,
    },

    benchmark: {
      organicResults:
        organic.length,

      fetchedPages:
        eligiblePages,

      eligiblePages,

      observedMedianWordCount:
        null,

      observedMedianH2:
        null,

      observedMedianH3:
        null,

      pageTypeMix,
    },

    searchFeatures: {
      aiOverview,

      peopleAlsoAsk,

      questions:
        peopleAlsoAsk
          ? [
              "What should I know?",
            ]
          : [],

      aiOverviewReferences:
        [],

      aiOnlyCitationDomains:
        [],
    },

    architecture: {
      headingPolicy: {
        h1:
          1,

        h2:
          "AS_NEEDED",

        h3:
          "ONLY_WHEN_NEEDED",

        maxDepth:
          3,
      },

      requiredTopics:
        [],

      questionsToAnswer:
        [],

      contentGaps,

      directAnswerBeforeFirstH2:
        true,

      toolFirstWhenAvailable:
        targetFormat.includes(
          "TOOL"
        ),
    },

    generationRules:
      [],

    strategy: {
      topic:
        "identity theft protection",

      searchIntent:
        "COMMERCIAL",

      action: {
        type:
          pageDecisionType,
      },

      primary: {
        keyword:
          "identity theft protection",
      },

      secondary:
        [],

      supporting:
        [],

      excluded:
        [],

      headingPolicy: {
        h1:
          1,

        h2:
          "AS_NEEDED",

        h3:
          "ONLY_WHEN_NEEDED",

        maxDepth:
          3,

        noOrphanH3:
          true,

        noDuplicateHeadings:
          true,

        noHeadingForKeywordStuffing:
          true,
      },

      qualityRequirements: {
        oneH1:
          true,

        directAnswer:
          true,

        noKeywordStuffing:
          true,

        semanticHeadings:
          true,

        internalLinks:
          true,

        sourceEvidenceWhenNeeded:
          true,

        articleSchema:
          true,

        breadcrumbSchema:
          true,

        authorMetadata:
          true,

        datePublished:
          true,

        dateModified:
          true,
      },

      measurementPlan: {
        searchConsole:
          true,

        rankTracking:
          true,

        ga4:
          true,

        cloudflareVerifiedBots:
          true,

        aiCrawlerReadiness:
          true,
      },
    },
  } as unknown as FinalContentPlan;
}

function result(
  domain: string,
  title: string,
  index: number
) {
  return {
    domain,

    url:
      `https://${domain}/page-${index}`,

    title,
  };
}

describe(
  "SERP feasibility engine",
  () => {
    it(
      "returns UNKNOWN when live SERP evidence is unavailable",
      () => {
        const report =
          analyzeSerpFeasibility({
            keyword:
              "identity theft protection",

            plan:
              plan({
                serpAvailable:
                  false,

                organic:
                  [],

                eligiblePages:
                  0,
              }),
          });

        expect(
          report.feasibility
        ).toBe(
          "UNKNOWN"
        );

        expect(
          report.blockers
        ).toContain(
          "SERP_UNAVAILABLE"
        );
      }
    );

    it(
      "recognizes a diverse SERP as structurally favorable",
      () => {
        const organic =
          Array.from(
            {
              length:
                10,
            },
            (
              _,
              index
            ) =>
              result(
                `domain${index}.com`,
                index <
                  3
                  ? "Identity Theft Protection Guide"
                  : `Security Resource ${index}`,
                index
              )
          );

        const report =
          analyzeSerpFeasibility({
            keyword:
              "identity theft protection",

            plan:
              plan({
                organic,

                eligiblePages:
                  6,

                pageTypeMix: {
                  GUIDE:
                    4,

                  ARTICLE:
                    3,

                  COMPARISON:
                    2,

                  TOOL:
                    1,
                },
              }),
          });

        expect(
          report.competitionShape
        ).toBe(
          "DIVERSE"
        );

        expect(
          report.feasibility
        ).toBe(
          "FAVORABLE"
        );
      }
    );

    it(
      "detects domain concentration as challenging",
      () => {
        const organic =
          Array.from(
            {
              length:
                10,
            },
            (
              _,
              index
            ) =>
              result(
                index <
                  4
                  ? "dominant.com"
                  : index <
                      7
                    ? "second.com"
                    : `other${index}.com`,
                `Result ${index}`,
                index
              )
          );

        const report =
          analyzeSerpFeasibility({
            keyword:
              "identity theft protection",

            plan:
              plan({
                organic,

                pageTypeMix: {
                  GUIDE:
                    6,

                  ARTICLE:
                    4,
                },
              }),
          });

        expect(
          report.competitionShape
        ).toBe(
          "CONCENTRATED"
        );

        expect(
          report.feasibility
        ).toBe(
          "CHALLENGING"
        );
      }
    );

    it(
      "detects dominant page-type consensus",
      () => {
        const organic =
          Array.from(
            {
              length:
                10,
            },
            (
              _,
              index
            ) =>
              result(
                `domain${index}.com`,
                `Guide ${index}`,
                index
              )
          );

        const report =
          analyzeSerpFeasibility({
            keyword:
              "identity theft protection",

            plan:
              plan({
                organic,

                pageTypeMix: {
                  GUIDE:
                    9,

                  ARTICLE:
                    1,
                },
              }),
          });

        expect(
          report.evidence
            .dominantPageType
        ).toBe(
          "GUIDE"
        );

        expect(
          report.evidence
            .dominantPageTypeShare
        ).toBe(
          0.9
        );

        expect(
          report.requirements
        ).toContain(
          "MATCH_SERP_PAGE_TYPE:GUIDE"
        );
      }
    );

    it(
      "requires a real interactive capability when the SERP rewards tools",
      () => {
        const organic =
          Array.from(
            {
              length:
                10,
            },
            (
              _,
              index
            ) =>
              result(
                `domain${index}.com`,
                `Email Checker ${index}`,
                index
              )
          );

        const report =
          analyzeSerpFeasibility({
            keyword:
              "email breach checker",

            plan:
              plan({
                organic,

                targetFormat:
                  "HYBRID_TOOL_GUIDE",

                pageTypeMix: {
                  TOOL:
                    6,

                  GUIDE:
                    4,
                },
              }),
          });

        expect(
          report.requirements
        ).toContain(
          "REAL_INTERACTIVE_CAPABILITY_REQUIRED"
        );
      }
    );

    it(
      "turns AI Overview and PAA into explicit content requirements",
      () => {
        const organic =
          Array.from(
            {
              length:
                10,
            },
            (
              _,
              index
            ) =>
              result(
                `domain${index}.com`,
                `Security Result ${index}`,
                index
              )
          );

        const report =
          analyzeSerpFeasibility({
            keyword:
              "identity theft protection",

            plan:
              plan({
                organic,

                aiOverview:
                  true,

                peopleAlsoAsk:
                  true,

                contentGaps: [
                  "recovery steps",
                ],
              }),
          });

        expect(
          report.requirements
        ).toContain(
          "RETRIEVAL_READY_DIRECT_ANSWERS"
        );

        expect(
          report.requirements
        ).toContain(
          "VERIFIABLE_STANDALONE_CLAIMS"
        );

        expect(
          report.requirements
        ).toContain(
          "SAME_INTENT_QUESTION_COVERAGE"
        );

        expect(
          report.requirements
        ).toContain(
          "EVIDENCE_BACKED_CONTENT_GAPS"
        );
      }
    );
  }
);
