
import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";


describe(
  "section depth local convergence V2",
  () => {
    it(
      "keeps depth repair inside the owning section",
      () => {
        const repair =
          readFileSync(
            new URL(
              "./master-section-repair.ts",
              import.meta.url
            ),
            "utf8"
          );

        expect(repair).toContain(
          "SECTION_DEPTH_LOCAL_CONVERGENCE_V2"
        );

        expect(repair).toContain(
          "terminalDepthRepair"
        );

        expect(repair).toContain(
          "seenDepthBodies"
        );

        expect(repair).toContain(
          "NO_MEANINGFUL_PROGRESS"
        );

        expect(repair).toContain(
          "NO_PROGRESS_BODY_CYCLE"
        );
      }
    );


    it(
      "does not restart the whole article for DEPTH_FAILURE",
      () => {
        const recovery =
          readFileSync(
            new URL(
              "./article-recovery-orchestrator-v1.ts",
              import.meta.url
            ),
            "utf8"
          );

        const start =
          recovery.indexOf(
            "RECOVERABLE_ARTICLE_FAILURES_V2"
          );

        expect(start).toBeGreaterThanOrEqual(0);

        const end =
          recovery.indexOf(
            "]);",
            start
          );

        const block =
          recovery.slice(
            start,
            end
          );

        expect(block).not.toContain(
          '"DEPTH_FAILURE"'
        );
      }
    );
  }
);
