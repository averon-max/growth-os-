import {
  describe,
  expect,
  it,
} from "vitest";

import {
  resolvePublicationEvidenceSectionScopeV1,
} from "./publication-evidence-section-scope";


describe(
  "publication evidence section scope V1",
  () => {
    it(
      "defers a required claim with only discovery evidence",
      () => {
        const result =
          resolvePublicationEvidenceSectionScopeV1({
            sections: [
              {
                heading:
                  "Does credit monitoring affect your credit score?",

                requiredClaims: [
                  "claim-score-impact",
                ],
              },
            ],

            claimEvidence: [
              {
                claimId:
                  "claim-score-impact",

                relation:
                  "SUPPORTS",

                kind:
                  "SEARCH_SNIPPET",

                excerpt:
                  "Discovery only.",
              },
            ],
          });


        expect(
          result.deferredIndexes
        ).toEqual([
          0,
        ]);

        expect(
          result.deferredSections[
            0
          ]?.reason
        ).toBe(
          "MISSING_PUBLICATION_GRADE_EVIDENCE"
        );
      }
    );


    it(
      "keeps a section when every required claim has verified support",
      () => {
        const result =
          resolvePublicationEvidenceSectionScopeV1({
            sections: [
              {
                heading:
                  "How credit monitoring works",

                requiredClaims: [
                  "claim-how",
                ],
              },
            ],

            claimEvidence: [
              {
                claimId:
                  "claim-how",

                relation:
                  "SUPPORTS",

                kind:
                  "VERIFIED_EXCERPT",

                excerpt:
                  "Verified factual support.",
              },
            ],
          });


        expect(
          result.deferredIndexes
        ).toEqual([]);
      }
    );


    it(
      "does not defer ordinary no-claim explanatory sections",
      () => {
        const result =
          resolvePublicationEvidenceSectionScopeV1({
            sections: [
              {
                heading:
                  "What to do next",

                requiredClaims:
                  [],
              },
            ],

            claimEvidence:
              [],
          });


        expect(
          result.deferredIndexes
        ).toEqual([]);
      }
    );


    it(
      "defers when even one required claim remains unverified",
      () => {
        const result =
          resolvePublicationEvidenceSectionScopeV1({
            sections: [
              {
                heading:
                  "Mixed authority",

                requiredClaims: [
                  "verified",
                  "missing",
                ],
              },
            ],

            claimEvidence: [
              {
                claimId:
                  "verified",

                relation:
                  "SUPPORTS",

                kind:
                  "VERIFIED_EXCERPT",

                excerpt:
                  "Verified.",
              },
            ],
          });


        expect(
          result.deferredIndexes
        ).toEqual([
          0,
        ]);
      }
    );
  }
);
