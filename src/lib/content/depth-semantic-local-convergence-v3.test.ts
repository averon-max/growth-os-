
import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";


describe(
  "depth semantic local convergence V3",
  () => {
    it(
      "cleans semantic BLOCK inside the local depth loop",
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
          "DEPTH_SEMANTIC_LOCAL_CONVERGENCE_V3"
        );

        expect(source).toContain(
          'acceptedSemantic.status ==='
        );

        expect(source).toContain(
          "deterministicSemanticDeleteRepairV1({"
        );

        expect(source).toContain(
          "NO_PROGRESS_AFTER_SEMANTIC_CLEANUP"
        );

        expect(source).toContain(
          "acceptedSection.bodyMarkdown"
        );
      }
    );
  }
);
