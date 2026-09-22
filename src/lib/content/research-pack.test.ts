import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  BusinessFactRegistry,
} from "./business-facts";

import {
  buildResearchPack,
  researchPackPrompt,
} from "./research-pack";

function facts(
  verifiedClaims:
    string[] = []
): BusinessFactRegistry {
  return {
    verifiedClaims,
  } as unknown as
    BusinessFactRegistry;
}

function brief() {
  return {
    topic:
      "identity theft protection",

    primaryKeyword:
      "identity theft protection",

    searchIntent:
      "COMMERCIAL",

    secondaryKeywords: [
      "identity theft protection service",
    ],
  };
}

function blueprint({
  readiness = "READY",
  action = "CREATE_NEW",
  informationGain = [
    "SERP_GAP:recovery steps",
  ],
}: {
  readiness?: string;
  action?: string;
  informationGain?: string[];
} = {}) {
  return {
    searchBlueprintShadow: {
      readiness,

      decision: {
        action,

        serpFeasibility:
          "FAVORABLE",

        serpConfidence:
          "HIGH",
      },

      searchEvidence: {
        searchVolume:
          1900,

        difficulty:
          47,

        existingPosition:
          12,

        impressions:
          2400,

        clicks:
          70,

        observedCtr:
          0.0292,

        topicalAuthorityStrength:
          0.68,

        competitionShape:
          "DIVERSE",

        targetFormat:
          "GUIDE",
      },

      coverage: {
        secondaryKeywords: [
          "identity theft protection service",
        ],

        supportingConcepts: [
          "identity theft recovery",
        ],

        requiredTopics: [
          "warning signs",
          "recovery steps",
        ],

        questionsToAnswer: [
          "How does identity theft protection work?",
        ],

        contentGaps: [
          "recovery steps",
        ],
      },

      pageMission: {
        targetFormat:
          "GUIDE",

        directAnswerRequired:
          true,

        toolFirstWhenAvailable:
          false,

        doNotCreateCompetingUrl:
          action !==
          "CREATE_NEW",
      },

      informationGain: {
        evidenceCandidates:
          informationGain,
      },

      governance: {
        blockers:
          [],

        reviews:
          [],
      },
    },
  };
}

describe(
  "Research Pack v1",
  () => {
    it(
      "builds evidence-backed generation context from the saved Search Blueprint",
      () => {
        const pack =
          buildResearchPack({
            brief:
              brief(),

            planSnapshot:
              blueprint(),

            businessFacts:
              facts([
                "The service provides a verified breach-check capability.",
              ]),
          });

        expect(
          pack.source
        ).toBe(
          "IMMUTABLE_EVIDENCE_SNAPSHOT"
        );

        expect(
          pack.searchEvidence
            .difficulty
        ).toBe(47);

        expect(
          pack.coverage
            .requiredTopics
        ).toContain(
          "recovery steps"
        );

        expect(
          pack.evidencePolicy
            .verifiedBusinessClaims
        ).toHaveLength(1);
      }
    );

    it(
      "blocks CREATE_NEW when no information-gain evidence candidate exists",
      () => {
        const pack =
          buildResearchPack({
            brief:
              brief(),

            planSnapshot:
              blueprint({
                action:
                  "CREATE_NEW",

                informationGain:
                  [],
              }),

            businessFacts:
              facts(),
          });

        expect(
          pack.readiness
        ).toBe(
          "BLOCKED"
        );

        expect(
          pack.blockers
        ).toContain(
          "NO_INFORMATION_GAIN_EVIDENCE_FOR_NEW_PAGE"
        );
      }
    );

    it(
      "respects an upstream blocked Search Blueprint",
      () => {
        const pack =
          buildResearchPack({
            brief:
              brief(),

            planSnapshot:
              blueprint({
                readiness:
                  "BLOCKED",
              }),

            businessFacts:
              facts(),
          });

        expect(
          pack.readiness
        ).toBe(
          "BLOCKED"
        );

        expect(
          pack.blockers
        ).toContain(
          "SEARCH_BLUEPRINT_BLOCKED"
        );
      }
    );

    it(
      "does not hard-block legacy briefs that predate Search Blueprint",
      () => {
        const pack =
          buildResearchPack({
            brief:
              brief(),

            planSnapshot:
              null,

            businessFacts:
              facts(),
          });

        expect(
          pack.readiness
        ).toBe(
          "REVIEW"
        );

        expect(
          pack.reviews
        ).toContain(
          "LEGACY_BRIEF_WITHOUT_SEARCH_BLUEPRINT"
        );
      }
    );

    it(
      "does not call competitor heading counts generation targets",
      () => {
        const prompt =
          researchPackPrompt(
            buildResearchPack({
              brief:
                brief(),

              planSnapshot:
                blueprint(),

              businessFacts:
                facts(),
            })
          );

        expect(
          prompt
        ).toContain(
          "Do not manufacture headings"
        );

        expect(
          prompt
        ).not.toContain(
          "target H2 count"
        );
      }
    );

    it(
      "passes only verified first-party claims into the research prompt",
      () => {
        const claim =
          "The website provides a verified email breach-check feature.";

        const prompt =
          researchPackPrompt(
            buildResearchPack({
              brief:
                brief(),

              planSnapshot:
                blueprint(),

              businessFacts:
                facts([
                  claim,
                ]),
            })
          );

        expect(
          prompt
        ).toContain(
          claim
        );

        expect(
          prompt
        ).toContain(
          "Do not fabricate"
        );
      }
    );
  }
);
