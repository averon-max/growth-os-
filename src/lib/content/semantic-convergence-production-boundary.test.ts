import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";


const repair =
  readFileSync(
    new URL(
      "./master-section-repair.ts",
      import.meta.url
    ),
    "utf8"
  );


const prompt =
  readFileSync(
    new URL(
      "./master-section-prompt.ts",
      import.meta.url
    ),
    "utf8"
  );


describe(
  "semantic convergence V2",
  () => {
    it(
      "uses bounded deterministic semantic convergence",
      () => {
        expect(
          repair
        ).toContain(
          "SEMANTIC_REPAIR_DETERMINISTIC_CONVERGENCE_V2"
        );

        expect(
          repair
        ).toContain(
          "MAX_DETERMINISTIC_SEMANTIC_PASSES"
        );

        expect(
          repair
        ).toContain(
          "SECTION_DETERMINISTIC_SEMANTIC_NO_PROGRESS"
        );
      }
    );


    it(
      "does not invoke model repair inside semantic convergence",
      () => {
        const start =
          repair.indexOf(
            "SEMANTIC_REPAIR_DETERMINISTIC_CONVERGENCE_V2"
          );

        const end =
          repair.indexOf(
            "if (!finalSemantic)",
            start
          );

        expect(
          start
        ).toBeGreaterThan(
          -1
        );

        expect(
          end
        ).toBeGreaterThan(
          start
        );

        const block =
          repair.slice(
            start,
            end
          );

        expect(
          block
        ).toContain(
          "deterministicSemanticDeleteRepairV1"
        );

        expect(
          block
        ).not.toContain(
          ".repairSection({"
        );
      }
    );


    it(
      "injects strict no-evidence writer policy",
      () => {
        expect(
          prompt
        ).toContain(
          "NO-EVIDENCE SECTION MODE V1"
        );

        expect(
          prompt
        ).toContain(
          "noEvidenceSectionMode,"
        );

        expect(
          prompt
        ).toContain(
          "omit that detail rather than inventing"
        );
      }
    );


    it(
      "does not weaken evidence verification",
      () => {
        expect(
          prompt
        ).toContain(
          "publication-grade evidence"
        );

        expect(
          prompt
        ).not.toContain(
          "ignore unsupported"
        );
      }
    );
  }
);
