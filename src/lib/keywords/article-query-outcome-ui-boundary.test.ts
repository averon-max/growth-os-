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


function read(
  file:
    string
) {
  return readFileSync(
    join(
      process.cwd(),
      file
    ),
    "utf8"
  );
}


describe(
  "query outcome diagnosis production UI",
  () => {
    const diagnosis =
      read(
        "src/lib/keywords/outcome-query-diagnosis.ts"
      );

    const service =
      read(
        "src/lib/keywords/outcome-query-series-service.ts"
      );

    const workspace =
      read(
        "src/components/dashboard/article-workspace.tsx"
      );


    it(
      "uses the five deterministic observed statuses",
      () => {
        for (
          const status
          of [
            "WINNING",
            "EMERGING",
            "STRIKING_DISTANCE",
            "DECAYING",
            "LOST",
          ]
        ) {
          expect(
            diagnosis
          ).toContain(
            `"${status}"`
          );
        }
      }
    );


    it(
      "does not claim causality or ranking probability",
      () => {
        expect(
          diagnosis
        ).toContain(
          "noCausalInference"
        );

        expect(
          diagnosis
        ).toContain(
          "noSeoScore"
        );

        expect(
          diagnosis
        ).toContain(
          "noRankingProbability"
        );
      }
    );


    it(
      "attaches diagnosis to persisted query outcome series",
      () => {
        expect(
          service
        ).toContain(
          "buildQueryOutcomeDiagnosisV1"
        );

        expect(
          service
        ).toContain(
          "diagnosis:"
        );
      }
    );


    it(
      "renders query outcome groups in Article Workspace",
      () => {
        expect(
          workspace
        ).toContain(
          "Query outcome groups"
        );

        expect(
          workspace
        ).toContain(
          "Striking distance"
        );

        expect(
          workspace
        ).toContain(
          "publication caused the change"
        );
      }
    );
  }
);
