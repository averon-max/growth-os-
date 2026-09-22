import {
  describe,
  expect,
  it,
} from "vitest";

import {
  geminiGenerator,
} from "./gemini-generator";

import {
  supportsMasterSectionSemanticVerifier,
} from "./master-section-semantic-verifier";


describe(
  "Gemini master semantic verification capability",
  () => {
    it(
      "exposes strict section semantic verification",
      () => {
        expect(
          supportsMasterSectionSemanticVerifier(
            geminiGenerator
          )
        ).toBe(
          true
        );

        expect(
          typeof geminiGenerator
            .verifySectionClaims
        ).toBe(
          "function"
        );
      }
    );
  }
);
