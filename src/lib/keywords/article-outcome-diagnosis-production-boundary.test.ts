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
  "article outcome diagnosis production wiring",
  () => {
    const route =
      read(
        "src/app/api/content/articles/[id]/analytics/route.ts"
      );

    const workspace =
      read(
        "src/components/dashboard/article-workspace.tsx"
      );


    it(
      "uses the existing deterministic longitudinal engine",
      () => {
        expect(
          route
        ).toContain(
          "buildLongitudinalOutcomeDiagnosisV1"
        );
      }
    );


    it(
      "uses persisted action baseline instead of manufacturing one",
      () => {
        expect(
          route
        ).toContain(
          "baselineLiveRank"
        );

        expect(
          route
        ).toContain(
          "baselineImpressions"
        );

        expect(
          route
        ).toContain(
          "baselineClicks"
        );

        expect(
          route
        ).toContain(
          "baselineAveragePosition"
        );
      }
    );


    it(
      "does not feed BASELINE back as a post-action checkpoint",
      () => {
        expect(
          route
        ).toMatch(
          /checkpoint\s*===\s*"BASELINE"/
        );
      }
    );


    it(
      "rejects baseline provenance on post-action checkpoints",
      () => {
        expect(
          route
        ).toContain(
          'source ==='
        );

        expect(
          route
        ).toContain(
          '"ACTION_BASELINE"'
        );

        expect(
          route
        ).toContain(
          "POST_ACTION_OUTCOME_HAS_BASELINE_SOURCE"
        );
      }
    );


    it(
      "returns diagnosis through article analytics",
      () => {
        expect(
          route
        ).toContain(
          "diagnosis:"
        );

        expect(
          route
        ).toContain(
          "longitudinalDiagnosis"
        );
      }
    );


    it(
      "renders diagnosis in Article Workspace",
      () => {
        expect(
          workspace
        ).toContain(
          "Observed diagnosis"
        );

        expect(
          workspace
        ).toContain(
          "Next action"
        );

        expect(
          workspace
        ).toContain(
          "No causal inference"
        );

        expect(
          workspace
        ).toContain(
          "No SEO score or"
        );
      }
    );


    it(
      "does not introduce ranking probability or an SEO score",
      () => {
        expect(
          route
        ).not.toContain(
          "rankingProbability:"
        );

        expect(
          route
        ).not.toContain(
          "seoScore:"
        );
      }
    );
  }
);
