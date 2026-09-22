import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildEvidenceAwareOutline,
  filterEvidenceAwareQuestions,
  hasVerifiedEvidenceForText,
  sensitiveEvidenceCategories,
} from "./evidence-aware-planning";


describe(
  "evidence-aware article planning",
  () => {
    const noVerifiedEvidence = [
      {
        evidenceLevel:
          "SEARCH_SNIPPET",

        title:
          "Credit Monitoring",

        excerpt:
          "Credit monitoring helps consumers track changes.",
      },
      {
        evidenceLevel:
          "REFERENCE_ONLY",

        title:
          "Best Credit Monitoring Services",
      },
    ];


    it(
      "detects sensitive coverage categories",
      () => {
        expect(
          sensitiveEvidenceCategories(
            "Top credit monitoring services and pricing"
          )
        ).toEqual(
          expect.arrayContaining([
            "RANKING",
            "PRICE",
          ])
        );

        expect(
          sensitiveEvidenceCategories(
            "How credit monitoring works"
          )
        ).toEqual(
          []
        );
      }
    );


    it(
      "does not treat SEARCH_SNIPPET as verified evidence",
      () => {
        expect(
          hasVerifiedEvidenceForText({
            text:
              "How much does credit monitoring cost?",

            externalEvidenceSources:
              noVerifiedEvidence,
          })
        ).toBe(
          false
        );
      }
    );


    it(
      "defers pricing, ranking, comparison and legal sections without verified excerpts",
      () => {
        const result =
          buildEvidenceAwareOutline({
            outline: [
              {
                level: 2,
                heading:
                  "How Credit Monitoring Works",
                summary:
                  "Explain the mechanism.",
              },
              {
                level: 2,
                heading:
                  "Benefits of Credit Monitoring",
                summary:
                  "Explain practical general benefits.",
              },
              {
                level: 2,
                heading:
                  "Top Credit Monitoring Services",
                summary:
                  "Compare leading providers.",
              },
              {
                level: 2,
                heading:
                  "Cost of Credit Monitoring",
                summary:
                  "Explain pricing and paid tiers.",
              },
              {
                level: 2,
                heading:
                  "Credit Monitoring vs Credit Freeze",
                summary:
                  "Compare the two products.",
              },
              {
                level: 2,
                heading:
                  "Can Someone Check Credit Without You Knowing?",
                summary:
                  "Discuss consent and unauthorized access.",
              },
            ],

            externalEvidenceSources:
              noVerifiedEvidence,
          });

        expect(
          result.outline.map(
            section =>
              section.heading
          )
        ).toEqual([
          "How Credit Monitoring Works",
          "Benefits of Credit Monitoring",
        ]);

        expect(
          result.deferredSections
        ).toHaveLength(
          4
        );

        expect(
          result.verifiedExcerptCount
        ).toBe(
          0
        );
      }
    );


    it(
      "allows a price section only when verified price evidence exists",
      () => {
        const evidence = [
          {
            evidenceLevel:
              "VERIFIED_EXCERPT",

            title:
              "Credit Monitoring Cost",

            excerpt:
              "The service costs $10 per month.",
          },
        ];

        const result =
          buildEvidenceAwareOutline({
            outline: [
              {
                level: 2,
                heading:
                  "Cost of Credit Monitoring",
                summary:
                  "Explain pricing.",
              },
              {
                level: 2,
                heading:
                  "Top Credit Monitoring Services",
                summary:
                  "Rank the best providers.",
              },
            ],

            externalEvidenceSources:
              evidence,
          });

        expect(
          result.outline.map(
            section =>
              section.heading
          )
        ).toEqual([
          "Cost of Credit Monitoring",
        ]);

        expect(
          result.deferredSections.map(
            section =>
              section.heading
          )
        ).toEqual([
          "Top Credit Monitoring Services",
        ]);
      }
    );


    it(
      "filters evidence-sensitive PAA questions without verified excerpts",
      () => {
        const result =
          filterEvidenceAwareQuestions({
            questions: [
              "How does credit monitoring work?",
              "What are the top 3 credit monitoring services?",
              "How much does credit monitoring cost?",
              "Is it worth paying for credit monitoring?",
              "Can someone check my credit without me knowing?",
            ],

            externalEvidenceSources:
              noVerifiedEvidence,
          });

        expect(
          result.questions
        ).toEqual([
          "How does credit monitoring work?",
        ]);

        expect(
          result.deferredQuestions
        ).toHaveLength(
          4
        );
      }
    );
  }
);
