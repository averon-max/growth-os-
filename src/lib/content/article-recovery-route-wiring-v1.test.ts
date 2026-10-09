import {
  readFileSync,
} from "node:fs";

import {
  join,
} from "node:path";

import {
  describe,
  expect,
  it,
} from "vitest";


const route =
  readFileSync(
    join(
      process.cwd(),
      "src/app/api/content/briefs/[id]/generate-article/route.ts"
    ),
    "utf8"
  );


describe(
  "article recovery route wiring V1",
  () => {
    it(
      "runs generation through the recovery orchestrator",
      () => {
        expect(
          route
        ).toContain(
          "executeArticleRecoveryOrchestratorV1({"
        );

        expect(
          route
        ).toContain(
          "generateArticleFromBrief("
        );

        expect(
          route
        ).toContain(
          "[content article recovery]"
        );
      }
    );


    it(
      "does not treat terminal REJECTED as HTTP creation success",
      () => {
        expect(
          route
        ).toContain(
          'article.status ==='
        );

        expect(
          route
        ).toContain(
          '"REJECTED"'
        );

        expect(
          route
        ).toContain(
          '"ARTICLE_RECOVERY_EXHAUSTED"'
        );

        expect(
          route
        ).toMatch(
          /ARTICLE_RECOVERY_EXHAUSTED[\s\S]{0,1800}?status:\s*422/
        );
      }
    );


    it(
      "preserves the pre-writer evidence fail-closed surface",
      () => {
        expect(
          route
        ).toContain(
          "ArticlePreWriterEvidenceGateErrorV1"
        );

        expect(
          route
        ).toContain(
          "ARTICLE_PREWRITER_BLOCKED_SURFACE_V1"
        );
      }
    );
  }
);
