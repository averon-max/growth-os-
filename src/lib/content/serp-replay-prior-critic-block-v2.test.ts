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
      "./service.ts",
      import.meta.url
    ),
    "utf8"
  );


const generationStart =
  source.indexOf(
    "export async function generateArticleFromBrief("
  );


const generationEnd =
  source.indexOf(
    "export async function approveArticle(",
    generationStart
  );


const generation =
  source.slice(
    generationStart,
    generationEnd
  );


describe(
  "SERP replay prior critic BLOCK short circuit V2",
  () => {
    it(
      "places the BLOCK guard before competitive replay execution",
      () => {
        const guard =
          generation.indexOf(
            "SERP_REPLAY_PRIOR_CRITIC_BLOCK_SHORT_CIRCUIT_V2"
          );

        const statusCheck =
          generation.indexOf(
            'finalMasterCriticExecution',
            guard
          );

        const replay =
          generation.indexOf(
            "await executeCompetitiveSerpReplayRepairV2({",
            guard
          );

        expect(
          guard
        ).toBeGreaterThan(
          -1
        );

        expect(
          statusCheck
        ).toBeGreaterThan(
          guard
        );

        expect(
          replay
        ).toBeGreaterThan(
          statusCheck
        );
      }
    );


    it(
      "uses final master critic BLOCK as the skip condition",
      () => {
        const marker =
          generation.indexOf(
            "SERP_REPLAY_PRIOR_CRITIC_BLOCK_SHORT_CIRCUIT_V2"
          );

        const replay =
          generation.indexOf(
            "const competitiveReplayExecution =",
            marker
          );

        const area =
          generation.slice(
            marker,
            replay
          );

        expect(
          area
        ).toContain(
          '.status ==='
        );

        expect(
          area
        ).toContain(
          '"BLOCK"'
        );

        expect(
          area
        ).toContain(
          "SERP_REPLAY_SKIPPED_PRIOR_MASTER_CRITIC_BLOCK"
        );
      }
    );


    it(
      "does not remove competitive replay for non-BLOCK articles",
      () => {
        expect(
          generation.match(
            /await executeCompetitiveSerpReplayRepairV2\(\{/g
          ) ??
          []
        ).toHaveLength(
          1
        );
      }
    );


    it(
      "does not use SERP Replay status as article lifecycle authority",
      () => {
        expect(
          generation
        ).not.toMatch(
          /masterSerpReplay(?:\?)?\.status\s*===/
        );

        expect(
          generation
        ).not.toMatch(
          /masterSerpReplay(?:\?)?\.status\s*!==/
        );
      }
    );


    it(
      "records zero pairwise calls on the prior-BLOCK branch",
      () => {
        expect(
          generation
        ).toContain(
          "compareSerpReplayPairCalls:"
        );

        expect(
          generation
        ).toMatch(
          /compareSerpReplayPairCalls:\s*0/
        );
      }
    );
  }
);
