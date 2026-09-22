import {
  describe,
  expect,
  it,
} from "vitest";

import {
  geminiGenerator,
} from "./gemini-generator";

import {
  supportsMasterArticleGenerator,
} from "./master-article-generator";

import {
  supportsMasterArticleShellGenerator,
} from "./master-article-shell-generator";


describe(
  "Gemini/Groq Master Section Capability",
  () => {
    it(
      "exposes generateSection without removing the legacy writer during migration",
      () => {
        expect(
          supportsMasterArticleGenerator(
            geminiGenerator
          )
        ).toBe(
          true
        );

        expect(
          supportsMasterArticleShellGenerator(
            geminiGenerator
          )
        ).toBe(
          true
        );

        expect(
          typeof geminiGenerator
            .generateArticleShell
        ).toBe(
          "function"
        );

        expect(
          typeof geminiGenerator
            .generateSection
        ).toBe(
          "function"
        );

        expect(
          typeof geminiGenerator
            .generateArticle
        ).toBe(
          "function"
        );

        expect(
          typeof geminiGenerator
            .critiqueArticle
        ).toBe(
          "function"
        );

        expect(
          typeof geminiGenerator
            .rewriteArticle
        ).toBe(
          "function"
        );
      }
    );
  }
);
