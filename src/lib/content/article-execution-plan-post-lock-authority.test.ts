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
  "ArticleExecutionPlan post-lock structural authority",
  () => {
    it(
      "keeps the legacy evidence-aware outline diagnostic only",
      () => {
        expect(
          service
        ).toContain(
          "LEGACY_EVIDENCE_OUTLINE_DIAGNOSTIC_ONLY_V1"
        );

        expect(
          service
        ).toContain(
          "[content legacy evidence-aware outline diagnostic]"
        );
      }
    );

    it(
      "derives effective deferred sections from persisted ArticleExecutionPlan",
      () => {
        expect(
          service
        ).toContain(
          "ARTICLE_EXECUTION_PLAN_POST_LOCK_DEFER_AUTHORITY_V1"
        );

        expect(
          service
        ).toMatch(
          /section\.state\s*===\s*"DEFERRED_NO_EVIDENCE"/
        );
      }
    );

    it(
      "derives Writer section filtering from ArticleExecutionPlan state",
      () => {
        expect(
          service
        ).toContain(
          "ARTICLE_EXECUTION_PLAN_POST_LOCK_STRUCTURE_V1"
        );

        expect(
          service
        ).toMatch(
          /section\.state\s*===\s*"WRITABLE"/
        );
      }
    );

    it(
      "fails closed if runtime section identity drifts",
      () => {
        expect(
          service
        ).toContain(
          "ARTICLE_EXECUTION_PLAN_RUNTIME_SECTION_COUNT_DRIFT"
        );

        expect(
          service
        ).toContain(
          "ARTICLE_EXECUTION_PLAN_RUNTIME_HEADING_DRIFT"
        );
      }
    );

    it(
      "does not silently allow publication evidence to remove a writable section",
      () => {
        expect(
          service
        ).toContain(
          "ARTICLE_EXECUTION_PLAN_POST_LOCK_EVIDENCE_CONFLICT"
        );
      }
    );

    it(
      "binds locked structure before Master Writer execution",
      () => {
        const lock =
          service.indexOf(
            "ARTICLE_EXECUTION_PLAN_POST_LOCK_STRUCTURE_V1"
          );

        const bind =
          service.indexOf(
            "bindArticleExecutionPlanToGenerationContractV1({",
            lock
          );

        const writer =
          service.indexOf(
            "executeMasterWriterV1({",
            bind
          );

        expect(lock).toBeGreaterThanOrEqual(0);
        expect(bind).toBeGreaterThan(lock);
        expect(writer).toBeGreaterThan(bind);
      }
    );
  }
);
