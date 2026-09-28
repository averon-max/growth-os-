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
  "article outcome bottleneck production boundary",
  () => {
    const engine =
      read(
        "src/lib/keywords/outcome-bottleneck-engine.ts"
      );

    const route =
      read(
        "src/app/api/content/articles/[id]/analytics/route.ts"
      );

    const workspace =
      read(
        "src/components/dashboard/article-workspace.tsx"
      );


    it(
      "combines longitudinal and query-level evidence",
      () => {
        expect(
          engine
        ).toContain(
          "longitudinal"
        );

        expect(
          engine
        ).toContain(
          "queryOutcome"
        );
      }
    );


    it(
      "does not auto apply an intervention",
      () => {
        expect(
          engine
        ).toContain(
          "noAutoApply:"
        );

        expect(
          engine
        ).toContain(
          "noNewArticleByDefault:"
        );
      }
    );


    it(
      "is exposed through article analytics",
      () => {
        expect(
          route
        ).toContain(
          "buildOutcomeBottleneckDecisionV1"
        );

        expect(
          route
        ).toContain(
          "learningDecision,"
        );
      }
    );


    it(
      "renders primary bottleneck and next best action",
      () => {
        expect(
          workspace
        ).toContain(
          "Primary bottleneck"
        );

        expect(
          workspace
        ).toContain(
          "Next best action"
        );

        expect(
          workspace
        ).toContain(
          "No causal inference"
        );
      }
    );
  }
);
