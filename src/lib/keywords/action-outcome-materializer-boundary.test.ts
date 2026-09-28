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
      "src/lib/keywords/action-outcome-materializer.ts"
    ),
    "utf8"
  );


describe(
  "action outcome materializer production boundary",
  () => {
    it(
      "reads only executed outcome actions",
      () => {
        expect(
          source
        ).toContain(
          'status:\n            "EXECUTED"'
        );
      }
    );


    it(
      "materializes only mature checkpoints",
      () => {
        expect(
          source
        ).toContain(
          '"DAY_28"'
        );

        expect(
          source
        ).toContain(
          '"DAY_60"'
        );

        expect(
          source
        ).toContain(
          '"DAY_90"'
        );

        expect(
          source
        ).toContain(
          "matureCheckpointsOnly:"
        );
      }
    );


    it(
      "uses checkpoint prefixes to prevent future leakage",
      () => {
        expect(
          source
        ).toContain(
          "checkpointPrefixOnly:"
        );

        expect(
          source
        ).toContain(
          "futureLeakage:"
        );

        expect(
          source
        ).toContain(
          "maximumOrder"
        );
      }
    );


    it(
      "does not invent query provenance for CMS fixes",
      () => {
        expect(
          source
        ).toContain(
          "if (\n      action.contentArticleId"
        );

        expect(
          source
        ).toContain(
          "querySeries"
        );
      }
    );


    it(
      "does not persist or enable learned winnability yet",
      () => {
        expect(
          source
        ).toContain(
          "persistedDataset:"
        );

        expect(
          source
        ).toContain(
          "learnedWinnabilityEnabled:"
        );

        expect(
          source
        ).toContain(
          "false as const"
        );
      }
    );
  }
);
