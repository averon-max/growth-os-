import {
  describe,
  expect,
  it,
} from "vitest";

import {
  isSafeCompoundNegativeClaimNarrowingV1,
} from "./live-evidence-verification";


describe(
  "compound negative claim reconciliation V1",
  () => {
    const original =
      "Credit monitoring does not by itself resolve identity theft or disputed credit-report information.";


    it(
      "allows conservative narrowing to the first original negative target",
      () => {
        expect(
          isSafeCompoundNegativeClaimNarrowingV1({
            originalText:
              original,

            candidateText:
              "Credit monitoring does not resolve identity theft.",
          })
        ).toBe(
          true
        );
      }
    );


    it(
      "allows conservative narrowing to the second original negative target",
      () => {
        expect(
          isSafeCompoundNegativeClaimNarrowingV1({
            originalText:
              original,

            candidateText:
              "Credit monitoring does not resolve disputed credit-report information.",
          })
        ).toBe(
          true
        );
      }
    );


    it(
      "rejects replacement with a new negative target",
      () => {
        expect(
          isSafeCompoundNegativeClaimNarrowingV1({
            originalText:
              original,

            candidateText:
              "Credit monitoring does not resolve account takeover.",
          })
        ).toBe(
          false
        );
      }
    );


    it(
      "rejects polarity changes",
      () => {
        expect(
          isSafeCompoundNegativeClaimNarrowingV1({
            originalText:
              original,

            candidateText:
              "Credit monitoring resolves identity theft.",
          })
        ).toBe(
          false
        );
      }
    );


    it(
      "does not create an exception for ordinary single-target negative claims",
      () => {
        expect(
          isSafeCompoundNegativeClaimNarrowingV1({
            originalText:
              "Checking a credit report does not create a hard inquiry.",

            candidateText:
              "Checking a credit report does not change account information.",
          })
        ).toBe(
          false
        );
      }
    );


    it(
      "rejects numeric drift even inside a compound negative claim",
      () => {
        expect(
          isSafeCompoundNegativeClaimNarrowingV1({
            originalText:
              "A service does not monitor 3 bureaus or 3 separate report feeds.",

            candidateText:
              "A service does not monitor 2 bureaus.",
          })
        ).toBe(
          false
        );
      }
    );
  }
);
