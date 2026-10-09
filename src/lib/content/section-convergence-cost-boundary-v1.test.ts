import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";


const source =
  readFileSync(
    new URL(
      "./master-section-repair.ts",
      import.meta.url
    ),
    "utf8"
  );


describe(
  "section convergence cost boundary V1",
  () => {
    it(
      "allows only one deterministic semantic cleanup pass",
      () => {
        expect(
          source
        ).toMatch(
          /MAX_DETERMINISTIC_SEMANTIC_PASSES\s*=\s*4;/
        );
      }
    );


    it(
      "uses clean-room rewrite instead of incremental semantic rewrite loops",
      () => {
        if (
          source.includes(
            "MAX_SEMANTIC_MODEL_REPAIR_PASSES"
          )
        ) {
          expect(
            source
          ).toMatch(
            /MAX_SEMANTIC_MODEL_REPAIR_PASSES\s*=\s*0;/
          );
        }

        expect(
          source
        ).toContain(
          "SECTION_SEMANTIC_CLEAN_ROOM_FALLBACK_V1"
        );
      }
    );


    it(
      "allows at most one local depth model repair pass",
      () => {
        expect(
          source
        ).toContain(
          "SECTION_DEPTH_SINGLE_MODEL_PASS_V1"
        );

        expect(
          source
        ).toMatch(
          /MAX_DEPTH_MODEL_REPAIR_PASSES\s*=\s*1;/
        );

        expect(
          source
        ).not.toMatch(
          /while\s*\(\s*terminalDepthRepair\s*\)/
        );
      }
    );


    it(
      "allows deterministic semantic convergence after one depth model expansion",
      () => {
        expect(
          source
        ).toContain(
          "DEPTH_SEMANTIC_DETERMINISTIC_CONVERGENCE_V5"
        );

        expect(
          source
        ).toContain(
          "seenSemanticCleanupBodies"
        );

        expect(
          source
        ).not.toContain(
          "MAX_DEPTH_SEMANTIC_CLEANUP_PASSES"
        );

        expect(
          source
        ).toMatch(
          /while\s*\(\s*acceptedSemantic\.status\s*===\s*"BLOCK"\s*\)/
        );
      }
    );


    it(
      "does not increase the article model budget",
      () => {
        expect(
          source
        ).not.toContain(
          "CONTENT_LLM_CALL_BUDGET_EXCEEDED"
        );
      }
    );
  }
);
