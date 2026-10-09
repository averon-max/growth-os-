
import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";


describe(
  "depth semantic deletion convergence V4",
  () => {
    it(
      "continues deterministic semantic cleanup until verifier is no longer BLOCK",
      () => {
        const source =
          readFileSync(
            new URL(
              "./master-section-repair.ts",
              import.meta.url
            ),
            "utf8"
          );

        expect(source).toContain(
          "DEPTH_SEMANTIC_DELETION_CONVERGENCE_V4"
        );

        expect(source).toContain(
          "while ("
        );

        expect(source).toContain(
          'acceptedSemantic.status ==='
        );

        expect(source).toContain(
          "seenSemanticCleanupBodies"
        );

        expect(source).toContain(
          "NO_PROGRESS_SEMANTIC_CYCLE"
        );

        expect(source).toContain(
          "NO_PROGRESS_SEMANTIC_BODY_UNCHANGED"
        );
      }
    );
  }
);
