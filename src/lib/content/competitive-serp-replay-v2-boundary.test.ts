import {
  describe,
  expect,
  it,
} from "vitest";

import fs from "node:fs";
import path from "node:path";


describe(
  "Competitive SERP Replay V2 boundary",
  () => {
    const source =
      fs.readFileSync(
        path.join(
          process.cwd(),
          "src/lib/content/competitive-serp-replay-repair-plan-v2.ts"
        ),
        "utf8"
      );


    it(
      "forbids whole-article rewrite",
      () => {
        expect(
          source
        ).toContain(
          "NO_WHOLE_ARTICLE_REWRITE"
        );
      }
    );


    it(
      "requires deterministic evidence localization",
      () => {
        expect(
          source
        ).toContain(
          "SECTION_LOCALIZATION_REQUIRES_EXISTING_EVIDENCE_ID"
        );

        expect(
          source
        ).toContain(
          "NO_FUZZY_SECTION_GUESSING"
        );
      }
    );


    it(
      "does not create ranking scores or probabilities",
      () => {
        expect(
          source
        ).toContain(
          "NO_RANKING_SCORE"
        );

        expect(
          source
        ).toContain(
          "NO_RANKING_PROBABILITY"
        );
      }
    );


    it(
      "keeps ambiguous BLOCK findings blocked",
      () => {
        expect(
          source
        ).toContain(
          "BLOCK_REMAINS_BLOCK_IF_LOCALIZATION_IS_AMBIGUOUS"
        );

        expect(
          source
        ).toContain(
          '"BLOCK_UNLOCALIZED"'
        );
      }
    );


    it(
      "contains no network, provider, or model execution",
      () => {
        expect(
          source
        ).not.toMatch(
          /\bfetch\s*\(/
        );

        expect(
          source
        ).not.toContain(
          "callGemini("
        );

        expect(
          source
        ).not.toContain(
          "callGroq("
        );

        expect(
          source
        ).not.toContain(
          "executeCompetitiveSerpReplayRepairV2("
        );
      }
    );
  }
);
