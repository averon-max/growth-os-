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
      "./production-master-live-stage-planner.ts",
      import.meta.url
    ),
    "utf8"
  );


describe(
  "deterministic definition replan wiring V1",
  () => {
    it(
      "runs before LLM required-claim replan",
      () => {
        const deterministic =
          source.indexOf(
            "DETERMINISTIC_DEFINITION_PRE_LLM_REPLAN_V1"
          );

        const llmPrompt =
          source.indexOf(
            '"MISSION_PRESERVING_REQUIRED_CLAIM_REPLAN_V1"',
            deterministic
          );

        expect(
          deterministic
        ).toBeGreaterThanOrEqual(
          0
        );

        expect(
          llmPrompt
        ).toBeGreaterThan(
          deterministic
        );
      }
    );


    it(
      "retains the strict evidence authority",
      () => {
        const start =
          source.indexOf(
            "DETERMINISTIC_DEFINITION_PRE_LLM_REPLAN_V1"
          );

        const end =
          source.indexOf(
            '"MISSION_PRESERVING_REQUIRED_CLAIM_REPLAN_V1"',
            start
          );

        const block =
          source.slice(
            start,
            end
          );

        expect(
          block
        ).toContain(
          "await enrichLiveEvidenceGraphV1({"
        );

        expect(
          block
        ).toContain(
          '"VERIFIED_EXCERPT"'
        );

        expect(
          block
        ).toContain(
          '"SUPPORTS"'
        );

        expect(
          block
        ).toContain(
          "allowedSourceIds"
        );
      }
    );
  }
);
