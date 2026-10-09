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
      "./master-article-critic-repair-execution.ts",
      import.meta.url
    ),
    "utf8"
  );


const start =
  source.indexOf(
    "export async function executeMasterArticleCriticRepairReplayV1"
  );


const execution =
  source.slice(
    start
  );


describe(
  "master critic validation convergence V2",
  () => {
    it(
      "uses one critic mutation and verify-only local closure",
      () => {
        expect(
          execution
        ).toContain(
          "MASTER_CRITIC_VALIDATION_CONVERGENCE_V2"
        );

        expect(
          execution
        ).toContain(
          "MASTER_CRITIC_SINGLE_MODEL_OWNER_V1"
        );

        expect(
          execution
        ).toContain(
          "verifyGeneratedSectionOnlyV1({"
        );

        expect(
          execution
        ).toMatch(
          /generator:\s*repairGenerator/
        );

        expect(
          execution
        ).not.toContain(
          "verifyAndRepairGeneratedSectionV1({"
        );
      }
    );


    it(
      "allows exactly one full critic replay",
      () => {
        expect(
          execution.match(
            /await executeMasterArticleCriticsV1\(\{/g
          ) ?? []
        ).toHaveLength(
          1
        );

        expect(
          execution
        ).toContain(
          "criticReplayCount:\n          1 as const"
        );
      }
    );
  }
);
