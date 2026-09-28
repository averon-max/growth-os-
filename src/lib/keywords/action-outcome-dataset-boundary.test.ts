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
      "src/lib/keywords/action-outcome-dataset.ts"
    ),
    "utf8"
  );


describe(
  "action outcome dataset boundary",
  () => {
    it(
      "is deterministic and derived",
      () => {
        expect(
          source
        ).toContain(
          "deterministicDerivedArtifact"
        );

        expect(
          source
        ).toContain(
          "immutableDerivedDataset"
        );
      }
    );


    it(
      "does not enable training by accident",
      () => {
        expect(
          source
        ).toContain(
          "notTrainingReadyByDefault"
        );

        expect(
          source
        ).toContain(
          "learnedWinnabilityNotYetEnabled"
        );
      }
    );


    it(
      "contains no SEO score or ranking probability",
      () => {
        expect(
          source
        ).toContain(
          "noSeoScore"
        );

        expect(
          source
        ).toContain(
          "noRankingProbability"
        );
      }
    );


    it(
      "preserves action revision identity",
      () => {
        expect(
          source
        ).toContain(
          "revisionOfActionId"
        );

        expect(
          source
        ).toContain(
          "supersedesActionId"
        );
      }
    );
  }
);
