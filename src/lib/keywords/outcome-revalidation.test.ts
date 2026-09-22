import {
  describe,
  expect,
  it,
} from "vitest";

import {
  shouldCreateOutcomeRevision,
} from "./outcome-revalidation";

describe(
  "outcome compatibility revision",
  () => {
    it(
      "keeps the same action when compatibility is unchanged",
      () => {
        expect(
          shouldCreateOutcomeRevision(
            "UNVERIFIED",
            "UNVERIFIED"
          )
        ).toBe(
          false
        );
      }
    );

    it(
      "creates a revision when UNVERIFIED becomes SUPPORTED",
      () => {
        expect(
          shouldCreateOutcomeRevision(
            "UNVERIFIED",
            "SUPPORTED"
          )
        ).toBe(
          true
        );
      }
    );

    it(
      "creates a revision when UNVERIFIED becomes EDUCATIONAL_ONLY",
      () => {
        expect(
          shouldCreateOutcomeRevision(
            "UNVERIFIED",
            "EDUCATIONAL_ONLY"
          )
        ).toBe(
          true
        );
      }
    );

    it(
      "creates a revision when support becomes conflict",
      () => {
        expect(
          shouldCreateOutcomeRevision(
            "SUPPORTED",
            "CONFLICT"
          )
        ).toBe(
          true
        );
      }
    );
  }
);
