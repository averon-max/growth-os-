import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  SectionGenerationContractV1,
} from "./article-generation-contract";

import {
  buildMasterSectionPrompt,
} from "./master-section-prompt";


function makeContract():
SectionGenerationContractV1 {
  return {
    version:
      "SECTION_GENERATION_CONTRACT_V1",

    sectionIndex:
      0,

    sectionNumber:
      1,

    totalSections:
      2,

    blueprint: {
      heading:
        "What Credit Monitoring Does",

      mission:
        "Explain the detection function.",

      queryNodeIds: [
        "q1",
      ],

      requiredClaims: [
        "claim-1",
      ],

      forbiddenClaims: [
        "claim-forbidden",
      ],

      evidenceIds: [
        "ev-1",
      ],

      asset:
        "asset-1",

      internalLinks: [
        "/identity-theft-protection",
      ],

      expectedOutcome:
        "Reader understands the core function.",
    },

    mission: {
      id:
        "mission-1",
    },

    queryGraph: {
      id:
        "query-graph-1",
    },

    serpResearch:
      null,

    expectedCoverage: {
      id:
        "coverage-1",
    },

    gaps: {
      id:
        "gaps-1",
    },

    originalValue: {
      id:
        "original-value-1",
    },

    evidenceGraph: {
      id:
        "evidence-graph-1",
    },

    claimLedger: {
      id:
        "claim-ledger-1",
    },

    searchBlueprint: {
      id:
        "search-blueprint-1",
    },

    internalLinkPlan: [
      {
        toUrl:
          "/identity-theft-protection",
      },
    ],

    styleRules: [
      "DIRECT_ANSWER_FIRST",
    ],

    hardRules: {
      canonicalH1OwnedByArticle:
        true,

      bodyMayContainH1:
        false,

      mayInventMetrics:
        false,

      mayInventEvidence:
        false,

      mayInventClaims:
        false,

      mayInventHeadingTargets:
        false,

      preserveSectionOrder:
        true,
    },
  } as unknown as
    SectionGenerationContractV1;
}


describe(
  "Master Section Prompt V1",
  () => {
    it(
      "sends the real section blueprint and authority boundaries to the model",
      () => {
        const prompt =
          buildMasterSectionPrompt(
            makeContract()
          );

        expect(
          prompt
        ).toContain(
          "What Credit Monitoring Does"
        );

        expect(
          prompt
        ).toContain(
          "claim-1"
        );

        expect(
          prompt
        ).toContain(
          "claim-forbidden"
        );

        expect(
          prompt
        ).toContain(
          "ev-1"
        );

        expect(
          prompt
        ).toContain(
          "/identity-theft-protection"
        );

        expect(
          prompt
        ).toContain(
          "asset-1"
        );
      }
    );


    it(
      "does not ask the model to write the complete article",
      () => {
        const prompt =
          buildMasterSectionPrompt(
            makeContract()
          );

        expect(
          prompt.toLowerCase()
        ).not.toContain(
          "write a complete article"
        );

        expect(
          prompt
        ).toContain(
          "EXACTLY ONE approved article section"
        );
      }
    );


    it(
      "keeps H1 and H2 ownership outside the model",
      () => {
        const prompt =
          buildMasterSectionPrompt(
            makeContract()
          );

        expect(
          prompt
        ).toContain(
          "Do NOT output an H1."
        );

        expect(
          prompt
        ).toContain(
          "Do NOT output an H2."
        );

        expect(
          prompt
        ).toContain(
          "H3 headings are allowed only when they materially improve this section."
        );
      }
    );


    it(
      "explicitly prohibits fabricated evidence and metrics",
      () => {
        const prompt =
          buildMasterSectionPrompt(
            makeContract()
          );

        expect(
          prompt
        ).toContain(
          "Do not invent facts, metrics, statistics"
        );

        expect(
          prompt
        ).toContain(
          "narrow the wording instead of inventing support"
        );
      }
    );


    it(
      "requires structured provenance declarations from model output",
      () => {
        const prompt =
          buildMasterSectionPrompt(
            makeContract()
          );

        expect(
          prompt
        ).toContain(
          '"coveredQueryNodeIds"'
        );

        expect(
          prompt
        ).toContain(
          '"referencedClaimIds"'
        );

        expect(
          prompt
        ).toContain(
          '"referencedEvidenceIds"'
        );

        expect(
          prompt
        ).toContain(
          '"usedInternalLinks"'
        );

        expect(
          prompt
        ).toContain(
          '"assetUsed"'
        );
      }
    );
  }
);
