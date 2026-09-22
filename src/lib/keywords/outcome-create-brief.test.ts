import {
  describe,
  expect,
  it,
} from "vitest";

import {
  evaluateOutcomeCreateBriefPermission,
} from "./outcome-create-brief";

describe(
  "outcome create brief permission",
  () => {
    it(
      "allows planned supported create",
      () => {
        expect(
          evaluateOutcomeCreateBriefPermission({
            decision:
              "CREATE",

            status:
              "PLANNED",

            compatibilityStatus:
              "SUPPORTED",
          }).allowed
        ).toBe(
          true
        );
      }
    );

    it(
      "allows educational-only create",
      () => {
        expect(
          evaluateOutcomeCreateBriefPermission({
            decision:
              "CREATE",

            status:
              "PLANNED",

            compatibilityStatus:
              "EDUCATIONAL_ONLY",
          }).allowed
        ).toBe(
          true
        );
      }
    );

    it(
      "blocks unverified create",
      () => {
        expect(
          evaluateOutcomeCreateBriefPermission({
            decision:
              "CREATE",

            status:
              "PLANNED",

            compatibilityStatus:
              "UNVERIFIED",
          }).allowed
        ).toBe(
          false
        );
      }
    );

    it(
      "blocks conflict",
      () => {
        expect(
          evaluateOutcomeCreateBriefPermission({
            decision:
              "CREATE",

            status:
              "PLANNED",

            compatibilityStatus:
              "CONFLICT",
          }).allowed
        ).toBe(
          false
        );
      }
    );

    it(
      "blocks update from creating a new URL",
      () => {
        expect(
          evaluateOutcomeCreateBriefPermission({
            decision:
              "UPDATE",

            status:
              "PLANNED",

            compatibilityStatus:
              "SUPPORTED",
          }).allowed
        ).toBe(
          false
        );
      }
    );

    it(
      "blocks already executed action",
      () => {
        expect(
          evaluateOutcomeCreateBriefPermission({
            decision:
              "CREATE",

            status:
              "EXECUTED",

            compatibilityStatus:
              "SUPPORTED",
          }).allowed
        ).toBe(
          false
        );
      }
    );
  }
);
