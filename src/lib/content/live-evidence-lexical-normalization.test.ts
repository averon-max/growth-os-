import {
  describe,
  expect,
  it,
} from "vitest";

import {
  canonicalEvidenceTokenV1,
  findVerifiedExcerptCandidateV1,
} from "./live-evidence-verification";


describe(
  "evidence lexical canonicalization V1",
  () => {
    it(
      "normalizes common paraphrases",
      () => {
        expect(
          canonicalEvidenceTokenV1(
            "watching"
          )
        ).toBe(
          "monitor"
        );

        expect(
          canonicalEvidenceTokenV1(
            "watches"
          )
        ).toBe(
          "monitor"
        );

        expect(
          canonicalEvidenceTokenV1(
            "tracked"
          )
        ).toBe(
          "monitor"
        );

        expect(
          canonicalEvidenceTokenV1(
            "monitoring"
          )
        ).toBe(
          "monitor"
        );

        expect(
          canonicalEvidenceTokenV1(
            "notifications"
          )
        ).toBe(
          "alert"
        );

        expect(
          canonicalEvidenceTokenV1(
            "fixed"
          )
        ).toBe(
          "repair"
        );

        expect(
          canonicalEvidenceTokenV1(
            "errors"
          )
        ).toBe(
          "inaccuracy"
        );

        expect(
          canonicalEvidenceTokenV1(
            "services"
          )
        ).toBe(
          "service"
        );
      }
    );


    it(
      "matches a normal definition paraphrase",
      () => {
        const result =
          findVerifiedExcerptCandidateV1({
            claimText:
              "Credit monitoring is a service that watches for changes to credit-report information.",

            bodyText:
              "A credit monitoring service tracks changes in credit report information and can notify consumers when those changes appear.",
          });


        expect(
          result
        ).not.toBeNull();

        expect(
          result?.coverage
        ).toBeGreaterThanOrEqual(
          0.7
        );
      }
    );


    it(
      "matches alert behavior expressed with equivalent wording",
      () => {
        const result =
          findVerifiedExcerptCandidateV1({
            claimText:
              "Credit monitoring services can alert users when monitored credit-report information changes.",

            bodyText:
              "A credit monitoring service watches a credit report and sends notifications to users when report information changes.",
          });


        expect(
          result
        ).not.toBeNull();
      }
    );


    it(
      "matches equivalent negative repair wording",
      () => {
        const result =
          findVerifiedExcerptCandidateV1({
            claimText:
              "Credit monitoring does not itself repair inaccurate credit-report information.",

            bodyText:
              "A credit monitoring service does not fix errors on a credit report for you.",
          });


        expect(
          result
        ).not.toBeNull();
      }
    );


    it(
      "still rejects opposite polarity",
      () => {
        const result =
          findVerifiedExcerptCandidateV1({
            claimText:
              "Credit monitoring prevents identity theft.",

            bodyText:
              "Credit monitoring does not prevent identity theft.",
          });


        expect(
          result
        ).toBeNull();
      }
    );


    it(
      "still rejects mismatched numeric facts",
      () => {
        const result =
          findVerifiedExcerptCandidateV1({
            claimText:
              "A credit monitoring service costs $20 per month.",

            bodyText:
              "A credit monitoring service costs $10 per month.",
          });


        expect(
          result
        ).toBeNull();
      }
    );

    it(
      "rejects a negated claim against an affirmative excerpt",
      () => {
        expect(
          findVerifiedExcerptCandidateV1({
            claimText:
              "Credit monitoring does not itself repair inaccurate credit-report information.",

            bodyText:
              "A credit monitoring service helps repair inaccuracies on a credit report for you.",
          })
        ).toBeNull();
      }
    );


    it(
      "rejects an affirmative claim against a negated excerpt",
      () => {
        expect(
          findVerifiedExcerptCandidateV1({
            claimText:
              "Credit monitoring services repair inaccurate credit-report information.",

            bodyText:
              "A credit monitoring service does not fix errors on a credit report for you.",
          })
        ).toBeNull();
      }
    );


    it(
      "rejects a negated excerpt whose denied target differs",
      () => {
        expect(
          findVerifiedExcerptCandidateV1({
            claimText:
              "Credit monitoring does not itself repair inaccurate credit-report information.",

            bodyText:
              "A credit monitoring service does not store your credit report information.",
          })
        ).toBeNull();
      }
    );

  }
);
