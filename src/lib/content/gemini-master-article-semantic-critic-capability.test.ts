import {
  describe,
  expect,
  it,
} from "vitest";

import {
  geminiGenerator,
} from "./gemini-generator";

import {
  supportsMasterArticleSemanticCriticGenerator,
} from "./master-article-semantic-critics";


describe(
  "Gemini master article semantic critic capability",
  () => {
    it(
      "exposes structured master article semantic review",
      () => {
        expect(
          supportsMasterArticleSemanticCriticGenerator(
            geminiGenerator
          )
        ).toBe(
          true
        );

        expect(
          typeof geminiGenerator
            .reviewMasterArticleSemantics
        ).toBe(
          "function"
        );
      }
    );
  }
);
