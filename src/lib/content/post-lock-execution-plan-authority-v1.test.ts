import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";


const service =
  readFileSync(
    new URL(
      "./service.ts",
      import.meta.url
    ),
    "utf8"
  );


describe(
  "post-lock ArticleExecutionPlan authority V1",
  () => {
    it(
      "projects contracted required claims and evidence into runtime section scope",
      () => {
        expect(
          service
        ).toContain(
          "ARTICLE_EXECUTION_PLAN_POST_LOCK_SCOPE_PROJECTION_V1"
        );

        expect(
          service
        ).toContain(
          "requiredClaims:"
        );

        expect(
          service
        ).toContain(
          "...executionSection"
        );

        expect(
          service
        ).toContain(
          ".requiredClaimIds"
        );

        expect(
          service
        ).toContain(
          ".evidenceIds"
        );
      }
    );


    it(
      "keeps real fail-closed evidence validation after projection",
      () => {
        expect(
          service
        ).toContain(
          "ARTICLE_EXECUTION_PLAN_POST_LOCK_EVIDENCE_CONFLICT"
        );

        expect(
          service
        ).toContain(
          "MISSING_VERIFIED_EVIDENCE"
        );

        expect(
          service
        ).toContain(
          "INVALID_EVIDENCE_BINDING"
        );

        expect(
          service
        ).toContain(
          '"VERIFIED_EXCERPT"'
        );

        expect(
          service
        ).toContain(
          '"SUPPORTS"'
        );
      }
    );


    it(
      "uses persisted execution plan as the only structural defer authority",
      () => {
        expect(
          service
        ).toContain(
          "ARTICLE_EXECUTION_PLAN_POST_LOCK_DEFER_AUTHORITY_V1"
        );

        expect(
          service
        ).toMatch(
          /persistedArticleExecutionPlan[\s\S]{0,500}\.sections[\s\S]{0,500}DEFERRED_NO_EVIDENCE/
        );
      }
    );


    it(
      "always builds generation runtime from post-lock projected sections",
      () => {
        expect(
          service
        ).toContain(
          "POST_LOCK_PROJECTED_RUNTIME_V1"
        );

        expect(
          service
        ).toMatch(
          /sections:\s*Object\.freeze\(\[\s*\.\.\.effectiveMasterSections/
        );
      }
    );


    it(
      "keeps legacy evidence resolvers diagnostic-only",
      () => {
        expect(
          service
        ).toContain(
          "LEGACY_EVIDENCE_OUTLINE_DIAGNOSTIC_ONLY_V1"
        );

        expect(
          service
        ).toContain(
          "publicationEvidenceDeferredScope"
        );

        expect(
          service
        ).toContain(
          "Diagnostics can explain WHY"
        );
      }
    );
  }
);
