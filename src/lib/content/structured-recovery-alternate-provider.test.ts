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


const generatorSource =
  readFileSync(
    join(
      process.cwd(),
      "src/lib/content/gemini-generator.ts"
    ),
    "utf8"
  );

const plannerSource =
  readFileSync(
    join(
      process.cwd(),
      "src/lib/content/production-master-live-stage-planner.ts"
    ),
    "utf8"
  );


describe(
  "structured recovery alternate provider boundary",
  () => {
    it(
      "keeps normal structured generation on the configured primary provider",
      () => {
        expect(
          generatorSource
        ).toContain(
          "const primary ="
        );

        expect(
          generatorSource
        ).toContain(
          "resolveContentAiProvider()"
        );
      }
    );


    it(
      "supports an explicit alternate-provider recovery path",
      () => {
        expect(
          generatorSource
        ).toContain(
          "STRUCTURED_RECOVERY_ALTERNATE_PROVIDER_V1"
        );

        expect(
          generatorSource
        ).toContain(
          "forceAlternateProvider"
        );

        expect(
          generatorSource
        ).toContain(
          "structured recovery forcing alternate provider: Gemini"
        );

        expect(
          generatorSource
        ).toContain(
          "structured recovery forcing alternate provider: Groq"
        );
      }
    );


    it(
      "uses alternate provider only in Stage Plan completeness recovery",
      () => {
        const retryStart =
          plannerSource.indexOf(
            "STAGE_PLAN_COMPLETENESS_RETRY_V4:"
          );

        expect(
          retryStart
        ).toBeGreaterThanOrEqual(
          0
        );

        const retryBlock =
          plannerSource.slice(
            retryStart,
            retryStart + 5000
          );

        expect(
          retryBlock
        ).toContain(
          "completenessRetryPrompt"
        );

        expect(
          retryBlock
        ).toContain(
          "forceAlternateProvider"
        );

        expect(
          retryBlock
        ).toContain(
          "true"
        );
      }
    );


    it(
      "does not synthesize missing Stage Plan semantics",
      () => {
        expect(
          plannerSource
        ).not.toContain(
          "plan.claims ="
        );

        expect(
          plannerSource
        ).not.toContain(
          "plan.sections ="
        );

        expect(
          plannerSource
        ).not.toContain(
          "plan.topics ="
        );

        expect(
          plannerSource
        ).toContain(
          "LIVE_STAGE_PLAN_MODEL_OUTPUT_INCOMPLETE"
        );
      }
    );
  }
);
