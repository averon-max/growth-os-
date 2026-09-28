import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  SectionGenerationContractV1,
} from "./article-generation-contract";

import {
  buildSectionScopedAuthorityContextV1,
  serializeSectionScopedAuthorityContextV1,
} from "./master-section-context";


function makeContract():
Readonly<
  SectionGenerationContractV1
> {
  return {
    sectionIndex:
      0,

    sectionNumber:
      1,

    totalSections:
      4,

    blueprint: {
      heading:
        "What Credit Monitoring Does",

      mission:
        "Explain the core function.",

      queryNodeIds: [
        "q-assigned",
      ],

      requiredClaims: [
        "claim-required",
      ],

      forbiddenClaims: [
        "claim-forbidden",
      ],

      evidenceIds: [
        "ev-required",
      ],

      internalLinks: [
        "/identity-protection",
      ],

      asset:
        "asset-assigned",

      expectedOutcome:
        "Reader understands monitoring.",
    },

    mission: {
      id:
        "mission-1",

      audience:
        "Consumers",

      readerGoal:
        "Understand credit monitoring",

      businessRelationship:
        "DIRECT",

      riskClass:
        "YMYL_FINANCE",

      language:
        "en",

      jurisdiction:
        "US",
    },

    searchBlueprint: {
      action:
        "CREATE",

      primaryQuery:
        "credit monitoring",

      intent:
        "INFORMATIONAL",

      pageType:
        "ARTICLE",

      requiredEntities: [
        "credit report",
      ],

      questions: [
        "What does credit monitoring do?",
      ],

      competitorWeaknesses: [
        "Weak limitations coverage",
      ],

      gaps: [
        "Detection versus prevention distinction",
      ],

      technicalRequirements:
        [],
    },

    queryGraph: {
      missionIntent:
        "INFORMATIONAL",

      nodes: [
        {
          id:
            "q-assigned",

          query:
            "credit monitoring",

          searchVolume:
            1200,

          gscImpressions:
            88,
        },

        {
          id:
            "q-unrelated",

          query:
            "unrelated keyword",

          searchVolume:
            999999,
        },
      ],
    },

    claimLedger: {
      claims: [
        {
          id:
            "claim-required",

          text:
            "Credit monitoring can alert consumers to certain report changes.",

          category:
            "FINANCIAL",

          risk:
            "HIGH",

          evidenceIds: [
            "ev-required",
          ],

          status:
            "VERIFIED",
        },

        {
          id:
            "claim-forbidden",

          text:
            "Credit monitoring prevents all identity theft.",

          category:
            "FINANCIAL",

          risk:
            "HIGH",

          evidenceIds:
            [],

          status:
            "CONTRADICTED",
        },

        {
          id:
            "claim-unrelated",

          text:
            "This unrelated claim must never reach this section.",

          category:
            "FACT",

          risk:
            "LOW",

          evidenceIds:
            [],

          status:
            "VERIFIED",
        },
      ],
    },

    evidenceGraph: {
      sources: [
        {
          id:
            "source-required",

          url:
            "https://consumerfinance.gov/example",

          publisher:
            "CFPB",

          sourceType:
            "PRIMARY_GOVERNMENT",

          authorityTier:
            "A",

          jurisdiction:
            "US",
        },

        {
          id:
            "source-unrelated",

          url:
            "https://example.com/unrelated",

          publisher:
            "Unrelated",
        },
      ],

      claimEvidence: [
        {
          id:
            "ev-required",

          claimId:
            "claim-required",

          sourceId:
            "source-required",

          relation:
            "SUPPORTS",

          kind:
            "VERIFIED_EXCERPT",

          excerpt:
            "Credit monitoring may alert consumers to changes.",
        },

        {
          id:
            "ev-unrelated",

          claimId:
            "claim-unrelated",

          sourceId:
            "source-unrelated",

          relation:
            "SUPPORTS",

          kind:
            "VERIFIED_EXCERPT",

          excerpt:
            "Unrelated.",
        },
      ],
    },

    originalValue: {
      strength:
        "DEFENSIBLE",

      gate:
        "REVIEW",

      assets: [
        {
          id:
            "asset-assigned",

          type:
            "COMPARISON_MATRIX",

          title:
            "Decision matrix",

          description:
            "Assigned synthesis.",

          firstParty:
            false,

          verified:
            false,
        },

        {
          id:
            "asset-unrelated",

          type:
            "ORIGINAL_DIAGRAM",

          title:
            "Unrelated asset",

          description:
            "Must not reach prompt.",

          firstParty:
            false,

          verified:
            false,
        },
      ],
    },

    internalLinkPlan: [
      {
        fromUrl:
          "/credit-monitoring",

        toUrl:
          "/identity-protection",

        anchor:
          "identity protection",

        reason:
          "Supporting concept",
      },

      {
        fromUrl:
          "/credit-monitoring",

        toUrl:
          "/unrelated",

        anchor:
          "unrelated",

        reason:
          "Must not reach prompt",
      },
    ],

    styleRules: [
      "Write clearly.",
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
  "Section Scoped Authority Context V1",
  () => {
    it(
      "keeps only assigned query intelligence",
      () => {
        const context =
          JSON.stringify(
            buildSectionScopedAuthorityContextV1(
              makeContract()
            )
          );

        expect(
          context
        ).toContain(
          "q-assigned"
        );

        expect(
          context
        ).toContain(
          "credit monitoring"
        );

        expect(
          context
        ).toContain(
          "1200"
        );

        expect(
          context
        ).not.toContain(
          "q-unrelated"
        );

        expect(
          context
        ).not.toContain(
          "999999"
        );
      }
    );


    it(
      "keeps assigned claims evidence asset and links",
      () => {
        const context =
          JSON.stringify(
            buildSectionScopedAuthorityContextV1(
              makeContract()
            )
          );

        expect(
          context
        ).toContain(
          "claim-required"
        );

        expect(
          context
        ).toContain(
          "claim-forbidden"
        );

        expect(
          context
        ).toContain(
          "ev-required"
        );

        expect(
          context
        ).toContain(
          "source-required"
        );

        expect(
          context
        ).toContain(
          "asset-assigned"
        );

        expect(
          context
        ).toContain(
          "/identity-protection"
        );

        expect(
          context
        ).not.toContain(
          "claim-unrelated"
        );

        expect(
          context
        ).not.toContain(
          "asset-unrelated"
        );

        expect(
          context
        ).not.toContain(
          "/unrelated"
        );
      }
    );


    it(
      "serializes compact JSON instead of pretty printing the runtime",
      () => {
        const serialized =
          serializeSectionScopedAuthorityContextV1(
            makeContract()
          );

        expect(
          serialized
        ).toContain(
          "SECTION_SCOPED_AUTHORITY_CONTEXT_V1"
        );

        expect(
          serialized
        ).not.toContain(
          '\n  "'
        );

        expect(
          serialized.length
        ).toBeLessThan(
          12000
        );
      }
    );
  }
);
