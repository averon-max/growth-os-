import {
  describe,
  expect,
  it,
} from "vitest";

import {
  assignVerifiedEvidenceToSectionsV1,
  findVerifiedExcerptCandidateV1,
} from "./live-evidence-verification";


describe(
  "Live evidence verification V1",
  () => {
    it(
      "accepts a real excerpt with strong claim coverage",
      () => {
        const result =
          findVerifiedExcerptCandidateV1({
            claimText:
              "Credit monitoring tracks changes in your credit report.",

            bodyText:
              "Credit monitoring tracks changes that appear in your credit report. It can help readers notice activity they may want to review.",
          });


        expect(
          result
        ).not.toBeNull();


        expect(
          result!.coverage
        ).toBeGreaterThanOrEqual(
          0.7
        );


        expect(
          result!.excerpt
        ).toContain(
          "credit report"
        );
      }
    );


    it(
      "fails closed on opposite negation",
      () => {
        const result =
          findVerifiedExcerptCandidateV1({
            claimText:
              "Credit monitoring tracks changes in your credit report.",

            bodyText:
              "Credit monitoring does not track changes in your credit report.",
          });


        expect(
          result
        ).toBeNull();
      }
    );


    it(
      "fails closed when numbers do not match",
      () => {
        const result =
          findVerifiedExcerptCandidateV1({
            claimText:
              "The service costs $20 per month.",

            bodyText:
              "The service costs $10 per month.",
          });


        expect(
          result
        ).toBeNull();
      }
    );


    it(
      "assigns only SUPPORTS + VERIFIED_EXCERPT authority",
      () => {
        const assignments =
          assignVerifiedEvidenceToSectionsV1({
            sections: [
              {
                heading:
                  "How credit monitoring works",

                mission:
                  "Explain credit monitoring and report changes.",

                expectedOutcome:
                  "Reader understands the monitoring process.",
              },

              {
                heading:
                  "Benefits",

                mission:
                  "Explain reader benefits.",
              },
            ],

            claims: [
              {
                id:
                  "claim-monitoring",

                text:
                  "Credit monitoring tracks changes in your credit report.",
              },
            ],

            evidenceGraph:
              {
                sources: [
                  {
                    id:
                      "source-1",

                    url:
                      "https://example.com",

                    publisher:
                      "Example",

                    sourceType:
                      "REPUTABLE_SECONDARY",

                    authorityTier:
                      "C",

                    retrievedAt:
                      new Date(),
                  },
                ],

                claimEvidence: [
                  {
                    id:
                      "evidence-1",

                    claimId:
                      "claim-monitoring",

                    sourceId:
                      "source-1",

                    relation:
                      "SUPPORTS",

                    kind:
                      "VERIFIED_EXCERPT",

                    excerpt:
                      "Credit monitoring tracks changes that appear in your credit report.",
                  },
                ],
              },
          });


        expect(
          assignments[0]
            ?.requiredClaims
        ).toContain(
          "claim-monitoring"
        );


        expect(
          assignments[0]
            ?.evidenceIds
        ).toContain(
          "evidence-1"
        );
      }
    );
  }
);
