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
  "Master critic bounded repair ownership",
  () => {
    it(
      "keeps the single-cycle ownership contract",
      () => {
        expect(
          source
        ).toContain(
          "MASTER_CRITIC_SINGLE_REPAIR_CYCLE_V1"
        );

        expect(
          execution
        ).toContain(
          "MASTER_CRITIC_SINGLE_MODEL_OWNER_V1"
        );

        expect(
          execution
        ).not.toContain(
          "currentPlan"
        );

        expect(
          execution
        ).not.toContain(
          "seenCriticStates"
        );

        expect(
          execution
        ).not.toContain(
          "criticRepairStateSignatureV1("
        );
      }
    );


    it(
      "contains one critic model repair site and one replay site",
      () => {
        expect(
          execution.match(
            /\.repairSection\(\{/g
          ) ?? []
        ).toHaveLength(
          1
        );

        expect(
          execution.match(
            /await executeMasterArticleCriticsV1\(\{/g
          ) ?? []
        ).toHaveLength(
          1
        );
      }
    );


    it(
      "does not recursively execute residual critic repair tasks",
      () => {
        expect(
          execution
        ).toContain(
          "const residualPlan ="
        );

        expect(
          execution
        ).toContain(
          "[content master critic residual review findings]"
        );

        expect(
          execution
        ).not.toMatch(
          /while\s*\([\s\S]{0,120}repairPlan/
        );
      }
    );
  }
);
