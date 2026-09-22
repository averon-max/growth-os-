import {
  describe,
  expect,
  it,
} from "vitest";

import {
  evaluateOutcomeExecutionPermission,
} from "./outcome-service";

describe(
  "outcome execution permission",
  () => {
    it(
      "blocks unverified compatibility",
      () => {
        expect(
          evaluateOutcomeExecutionPermission({
            decision:
              "CREATE",

            compatibilityStatus:
              "UNVERIFIED",

            executionKind:
              "CONTENT_PUBLISH",

            normalizedKeyword:
              "credit monitoring",

            primaryKeyword:
              "credit monitoring",
          }).allowed
        ).toBe(
          false
        );
      }
    );

    it(
      "blocks conflicting compatibility",
      () => {
        expect(
          evaluateOutcomeExecutionPermission({
            decision:
              "UPDATE",

            compatibilityStatus:
              "CONFLICT",

            executionKind:
              "CMS_FIX",

            normalizedKeyword:
              "credit monitoring",

            targetPageUrl:
              "https://example.com/a",

            requestedPageUrl:
              "https://example.com/a",
          }).allowed
        ).toBe(
          false
        );
      }
    );

    it(
      "allows supported create through matching content publish",
      () => {
        expect(
          evaluateOutcomeExecutionPermission({
            decision:
              "CREATE",

            compatibilityStatus:
              "SUPPORTED",

            executionKind:
              "CONTENT_PUBLISH",

            normalizedKeyword:
              "credit monitoring",

            primaryKeyword:
              "Credit Monitoring",
          }).allowed
        ).toBe(
          true
        );
      }
    );

    it(
      "does not allow CREATE through a CMS fix",
      () => {
        expect(
          evaluateOutcomeExecutionPermission({
            decision:
              "CREATE",

            compatibilityStatus:
              "SUPPORTED",

            executionKind:
              "CMS_FIX",

            normalizedKeyword:
              "credit monitoring",

            targetPageUrl:
              "https://example.com/a",

            requestedPageUrl:
              "https://example.com/a",
          }).allowed
        ).toBe(
          false
        );
      }
    );

    it(
      "allows educational-only only through content publish",
      () => {
        expect(
          evaluateOutcomeExecutionPermission({
            decision:
              "CREATE",

            compatibilityStatus:
              "EDUCATIONAL_ONLY",

            executionKind:
              "CONTENT_PUBLISH",

            normalizedKeyword:
              "what is credit monitoring",

            primaryKeyword:
              "what is credit monitoring",
          }).allowed
        ).toBe(
          true
        );

        expect(
          evaluateOutcomeExecutionPermission({
            decision:
              "UPDATE",

            compatibilityStatus:
              "EDUCATIONAL_ONLY",

            executionKind:
              "CMS_FIX",

            normalizedKeyword:
              "what is credit monitoring",

            targetPageUrl:
              "https://example.com/guide",

            requestedPageUrl:
              "https://example.com/guide",
          }).allowed
        ).toBe(
          false
        );
      }
    );

    it(
      "requires CMS fix to target the exact planned page",
      () => {
        expect(
          evaluateOutcomeExecutionPermission({
            decision:
              "UPDATE",

            compatibilityStatus:
              "SUPPORTED",

            executionKind:
              "CMS_FIX",

            normalizedKeyword:
              "credit monitoring",

            targetPageUrl:
              "https://example.com/features/",

            requestedPageUrl:
              "https://example.com/pricing",
          }).allowed
        ).toBe(
          false
        );

        expect(
          evaluateOutcomeExecutionPermission({
            decision:
              "UPDATE",

            compatibilityStatus:
              "SUPPORTED",

            executionKind:
              "CMS_FIX",

            normalizedKeyword:
              "credit monitoring",

            targetPageUrl:
              "https://example.com/features/",

            requestedPageUrl:
              "https://example.com/features",
          }).allowed
        ).toBe(
          true
        );
      }
    );

    it(
      "requires published content keyword to match the outcome keyword",
      () => {
        expect(
          evaluateOutcomeExecutionPermission({
            decision:
              "CREATE",

            compatibilityStatus:
              "SUPPORTED",

            executionKind:
              "CONTENT_PUBLISH",

            normalizedKeyword:
              "credit monitoring",

            primaryKeyword:
              "identity theft protection",
          }).allowed
        ).toBe(
          false
        );
      }
    );

    it(
      "never executes SKIP",
      () => {
        expect(
          evaluateOutcomeExecutionPermission({
            decision:
              "SKIP",

            compatibilityStatus:
              "SUPPORTED",

            executionKind:
              "CONTENT_PUBLISH",

            normalizedKeyword:
              "credit monitoring",

            primaryKeyword:
              "credit monitoring",
          }).allowed
        ).toBe(
          false
        );
      }
    );
  }
);
