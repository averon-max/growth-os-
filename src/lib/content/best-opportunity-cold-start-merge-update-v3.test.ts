import {
  describe,
  expect,
  it,
} from "vitest";

import {
  readFileSync,
} from "node:fs";

import {
  join,
} from "node:path";


const source =
  readFileSync(
    join(
      process.cwd(),
      "src/lib/content/service.ts"
    ),
    "utf8"
  );


const start =
  source.indexOf(
    "BEST_OPPORTUNITY_COLD_START_BLUEPRINT_REVIEW_V2"
  );

const end =
  source.indexOf(
    "CONTENT_BEST_OPPORTUNITY_NO_ELIGIBLE_WINNER",
    start
  );

const block =
  source.slice(
    start,
    end
  );


describe(
  "BEST_OPPORTUNITY cold-start merge/update V3",
  () => {
    it(
      "keeps the cold-start authority block",
      () => {
        expect(
          start
        ).toBeGreaterThanOrEqual(
          0
        );

        expect(
          end
        ).toBeGreaterThan(
          start
        );

        expect(
          block
        ).toContain(
          "BEST_OPPORTUNITY_COLD_START_MERGE_UPDATE_V3"
        );
      }
    );


    it(
      "allows CREATE_NEW",
      () => {
        expect(
          block
        ).toContain(
          '"CREATE_NEW"'
        );
      }
    );


    it(
      "allows MERGE_OR_UPDATE",
      () => {
        expect(
          block
        ).toContain(
          '"MERGE_OR_UPDATE"'
        );
      }
    );


    it(
      "still requires preserved primary",
      () => {
        expect(
          block
        ).toContain(
          ".primaryChanged ==="
        );

        expect(
          block
        ).toContain(
          ".productionPrimaryKeyword ==="
        );

        expect(
          block
        ).toContain(
          ".recommendedPrimaryKeyword ==="
        );
      }
    );


    it(
      "still requires strong SERP evidence",
      () => {
        expect(
          block
        ).toContain(
          '"FAVORABLE"'
        );

        expect(
          block
        ).toContain(
          '"HIGH"'
        );
      }
    );


    it(
      "still requires zero governance blockers",
      () => {
        expect(
          block
        ).toContain(
          ".blockers.length ==="
        );

        expect(
          block
        ).toContain(
          "LOW_CONFIDENCE_PRIMARY_MISSION_PRESERVED"
        );
      }
    );
  }
);
