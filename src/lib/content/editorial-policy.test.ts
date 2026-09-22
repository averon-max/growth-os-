import {
  describe,
  expect,
  it,
} from "vitest";

import {
  assertEditorialFindingsResolved,
  shouldRewriteEditorialFindings,
} from "./editorial-policy";

import type {
  ArticleCriticFinding,
} from "./generator";

function finding(
  code:
    string,
  severity:
    ArticleCriticFinding["severity"]
): ArticleCriticFinding {
  return {
    code,
    severity,
    message:
      "test finding",
    evidence:
      "test evidence",
    instruction:
      "fix it",
  };
}

describe(
  "editorial policy",
  () => {
    it(
      "rewrites concrete editorial MINOR defects",
      () => {
        expect(
          shouldRewriteEditorialFindings([
            finding(
              "TYPOGRAPHICAL_ERROR",
              "MINOR"
            ),
          ])
        ).toBe(
          true
        );
      }
    );

    it(
      "does not spend a rewrite on optional style preferences",
      () => {
        expect(
          shouldRewriteEditorialFindings([
            finding(
              "OPTIONAL_STYLE_PREFERENCE",
              "MINOR"
            ),
          ])
        ).toBe(
          false
        );
      }
    );

    it(
      "fails closed when an editorial defect remains after rewrite",
      () => {
        expect(
          () =>
            assertEditorialFindingsResolved([
              finding(
                "GRAMMAR_ERROR",
                "MINOR"
              ),
            ])
        ).toThrow(
          /ARTICLE_EDITORIAL_REVIEW_FAILED/
        );
      }
    );

    it(
      "allows non-editorial MINOR polish findings",
      () => {
        expect(
          () =>
            assertEditorialFindingsResolved([
              finding(
                "OPTIONAL_STYLE_PREFERENCE",
                "MINOR"
              ),
            ])
        ).not.toThrow();
      }
    );
  }
);
