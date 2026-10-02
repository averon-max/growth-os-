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


const prompt =
  readFileSync(
    new URL(
      "./master-section-prompt.ts",
      import.meta.url
    ),
    "utf8"
  );


describe(
  "production ArticleExecutionPlan -> Master Writer boundary",
  () => {
    it(
      "loads the persisted execution plan instead of reconstructing it from brief outline",
      () => {
        expect(
          service
        ).toContain(
          "LOAD_PERSISTED_ARTICLE_EXECUTION_PLAN_V1"
        );

        expect(
          service
        ).toContain(
          "parsePersistedArticleExecutionPlanV1("
        );

        expect(
          service
        ).toContain(
          "generationPlanRecord"
        );
      }
    );


    it(
      "binds the persisted plan to the existing ArticleGenerationContract before Writer execution",
      () => {
        const binding =
          service.indexOf(
            "ARTICLE_EXECUTION_PLAN_WRITER_BINDING_V1"
          );

        const writer =
          service.indexOf(
            "executeMasterWriterV1({"
          );


        expect(
          binding
        ).toBeGreaterThanOrEqual(
          0
        );

        expect(
          writer
        ).toBeGreaterThan(
          binding
        );


        expect(
          service
        ).toContain(
          "buildArticleGenerationContractV1("
        );

        expect(
          service
        ).toContain(
          "bindArticleExecutionPlanToGenerationContractV1({"
        );
      }
    );


    it(
      "keeps targetWords soft and forbids padding",
      () => {
        expect(
          prompt
        ).toContain(
          "ARTICLE_EXECUTION_PLAN_DEPTH_POLICY_V1"
        );

        expect(
          prompt
        ).toContain(
          "SOFT editorial depth budget"
        );

        expect(
          prompt
        ).toContain(
          "Never pad"
        );

        expect(
          prompt
        ).not.toMatch(
          /must\s+write\s+exactly\s+\d+/i
        );
      }
    );


    it(
      "does not introduce another Writer",
      () => {
        expect(
          service
        ).toContain(
          "executeMasterWriterV1({"
        );

        expect(
          service
        ).not.toContain(
          "executeArticleExecutionPlanWriter"
        );

        expect(
          service
        ).not.toContain(
          "WriterV4"
        );
      }
    );
  }
);
