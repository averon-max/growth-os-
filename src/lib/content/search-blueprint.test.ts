import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  BusinessFactRegistry,
} from "./business-facts";

import type {
  FinalContentPlan,
} from "./final-content-plan";

import {
  buildSearchBlueprint,
} from "./search-blueprint";

function facts(
  verifiedClaims:
    string[] = []
): BusinessFactRegistry {
  return {
    verifiedClaims,
  } as unknown as
    BusinessFactRegistry;
}

function basePlan():
  FinalContentPlan {
  return {
    strategy: {
      topic:
        "identity theft protection",

      searchIntent:
        "COMMERCIAL",

      action: {
        type:
          "UPDATE_EXISTING",

        existingBriefId:
          "brief-1",

        existingTopic:
          "identity theft protection",

        similarity:
          0.9,

        reason:
          "Existing content",
      },

      primary: {
        keyword:
          "identity theft protection",

        score:
          70,

        source:
          [],

        searchVolume:
          2000,

        difficulty:
          45,

        cpc:
          4,

        existingPosition:
          11,

        impressions:
          2000,

        clicks:
          60,

        intent:
          "COMMERCIAL",

        trend: {
          points:
            [],

          average12m:
            null,

          average3m:
            null,

          previous3mAverage:
            null,

          momentumPct:
            null,

          peakVolume:
            null,

          latestVolume:
            null,

          seasonal:
            false,
        },

        breakdown: {
          intentMatch:
            20,

          businessRelevance:
            20,

          rankability:
            10,

          demand:
            5,

          trendMomentum:
            0,

          gscOpportunity:
            10,

          commercialValue:
            5,

          topicalAuthority:
            5,

          penalties:
            0,
        },

        reasons:
          [],
      },

      secondary:
        [],

      supporting:
        [],

      excluded:
        [],

      decisionIntelligence: {
        status:
          "SELECTED",

        confidence:
          "HIGH",

        primary: {
          keyword:
            "identity theft protection",

          eligible:
            true,

          decisionScore:
            82,

          originalScore:
            70,

          intent:
            "COMMERCIAL",

          topicAffinity:
            1,

          evidenceConfidence:
            "HIGH",

          metrics: {
            searchVolume:
              2000,

            difficulty:
              45,

            existingPosition:
              11,

            impressions:
              2000,

            clicks:
              60,

            observedCtr:
              0.03,

            authorityStrength:
              0.7,

            authorityConfidence:
              "HIGH",
          },

          components: {
            base:
              31.5,

            intent:
              12,

            business:
              8,

            topicalFit:
              8,

            topicalAuthority:
              8.4,

            gscOpportunity:
              8,

            difficulty:
              2,

            demand:
              4,

            evidencePenalty:
              0,
          },

          blockers:
            [],

          reasons:
            [],
        },

        secondary:
          [],

        ranked:
          [],

        reasons:
          [],
      },

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

    serpSnapshot: {
      organic:
        [],
    },

    serpAvailable:
      true,

    serpFeasibility: {
      scope:
        "SERP_STRUCTURE_ONLY",

      keyword:
        "identity theft protection",

      feasibility:
        "FAVORABLE",

      confidence:
        "HIGH",

      competitionShape:
        "DIVERSE",

      targetFormat:
        "GUIDE",

      evidence: {
        organicResults:
          10,

        eligiblePages:
          6,

        uniqueDomains:
          10,

        uniqueDomainRatio:
          1,

        repeatedDomainShare:
          0,

        exactTitleMatchShare:
          0.3,

        dominantPageType:
          "GUIDE",

        dominantPageTypeShare:
          0.5,

        pageTypeMix: {
          GUIDE:
            5,

          ARTICLE:
            5,
        },

        aiOverview:
          false,

        peopleAlsoAsk:
          false,

        questionCount:
          0,

        contentGapCount:
          0,
      },

      requirements:
        [],

      blockers:
        [],

      reasons:
        [],
    },

    confidence:
      "HIGH",

    targetFormat:
      "GUIDE",

    pageDecision: {
      type:
        "UPDATE_EXISTING",

      existingBriefId:
        "brief-1",

      existingTopic:
        "identity theft protection",

      similarity:
        0.9,

      reason:
        "Existing content",
    },

    benchmark: {
      organicResults:
        10,

      fetchedPages:
        6,

      eligiblePages:
        6,

      observedMedianWordCount:
        2100,

      observedMedianH2:
        6,

      observedMedianH3:
        4,

      pageTypeMix: {
        GUIDE:
          5,

        ARTICLE:
          5,
      },
    },

    searchFeatures: {
      aiOverview:
        false,

      peopleAlsoAsk:
        false,

      questions:
        [],

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

      requiredTopics: [
        "identity theft warning signs",
      ],

      questionsToAnswer:
        [],

      contentGaps:
        [],

      directAnswerBeforeFirstH2:
        true,

      toolFirstWhenAvailable:
        false,
    },

    generationRules:
      [],
  };
}

describe(
  "Search Blueprint v1",
  () => {
    it(
      "becomes BLOCKED when keyword decision says NO_GO",
      () => {
        const plan =
          basePlan();

        plan.strategy
          .decisionIntelligence = {
            status:
              "NO_GO",

            confidence:
              "LOW",

            primary:
              null,

            secondary:
              [],

            ranked:
              [],

            reasons: [
              "INSUFFICIENT_EVIDENCE",
            ],
          };

        const blueprint =
          buildSearchBlueprint({
            plan,

            businessFacts:
              facts([
                "The service provides identity monitoring.",
              ]),
          });

        expect(
          blueprint.readiness
        ).toBe(
          "BLOCKED"
        );

        expect(
          blueprint.governance
            .blockers
        ).toContain(
          "KEYWORD_DECISION_NO_GO"
        );
      }
    );

    it(
      "blocks new-page generation when SERP evidence is unknown",
      () => {
        const plan =
          basePlan();

        plan.strategy
          .action = {
            type:
              "CREATE_NEW",

            existingBriefId:
              null,

            existingTopic:
              null,

            similarity:
              0,

            reason:
              "New page",
          };

        plan.pageDecision =
          plan.strategy.action;

        if (
          plan.serpFeasibility
        ) {
          plan.serpFeasibility
            .feasibility =
            "UNKNOWN";
        }

        const blueprint =
          buildSearchBlueprint({
            plan,

            businessFacts:
              facts([
                "Verified first-party fact",
              ]),
          });

        expect(
          blueprint.readiness
        ).toBe(
          "BLOCKED"
        );

        expect(
          blueprint.governance
            .blockers
        ).toContain(
          "INSUFFICIENT_SERP_EVIDENCE_FOR_NEW_PAGE"
        );
      }
    );

    it(
      "requires review for structurally challenging SERPs",
      () => {
        const plan =
          basePlan();

        if (
          plan.serpFeasibility
        ) {
          plan.serpFeasibility
            .feasibility =
            "CHALLENGING";
        }

        const blueprint =
          buildSearchBlueprint({
            plan,

            businessFacts:
              facts([
                "Verified first-party fact",
              ]),
          });

        expect(
          blueprint.readiness
        ).toBe(
          "REVIEW"
        );

        expect(
          blueprint.governance
            .reviews
        ).toContain(
          "SERP_STRUCTURALLY_CHALLENGING"
        );
      }
    );

    it(
      "never turns observed competitor heading counts into targets",
      () => {
        const blueprint =
          buildSearchBlueprint({
            plan:
              basePlan(),

            businessFacts:
              facts([
                "Verified fact",
              ]),
          });

        expect(
          blueprint.pageMission
            .headingCountsAreNotTargets
        ).toBe(
          true
        );

        expect(
          JSON.stringify(
            blueprint
          )
        ).not.toContain(
          "observedMedianH2"
        );
      }
    );

    it(
      "carries verified first-party facts without inventing new claims",
      () => {
        const verified = [
          "The product can check an email address for known breach exposure.",
          "The website provides educational identity-protection guidance.",
        ];

        const blueprint =
          buildSearchBlueprint({
            plan:
              basePlan(),

            businessFacts:
              facts(
                verified
              ),
          });

        expect(
          blueprint
            .evidencePolicy
            .verifiedBusinessClaims
        ).toEqual(
          verified
        );

        expect(
          blueprint
            .evidencePolicy
            .forbidInventedCapabilities
        ).toBe(
          true
        );
      }
    );

    it(
      "surfaces disagreement between production and evidence-recommended primary",
      () => {
        const plan =
          basePlan();

        const decision =
          plan.strategy
            .decisionIntelligence!;

        decision.primary = {
          ...decision.primary!,
          keyword:
            "identity protection service",
        };

        const blueprint =
          buildSearchBlueprint({
            plan,

            businessFacts:
              facts([
                "Verified fact",
              ]),
          });

        expect(
          blueprint.decision
            .primaryChanged
        ).toBe(
          true
        );

        expect(
          blueprint.governance
            .reviews
        ).toContain(
          "SHADOW_PRIMARY_DIFFERS_FROM_PRODUCTION"
        );
      }
    );
  }
);
