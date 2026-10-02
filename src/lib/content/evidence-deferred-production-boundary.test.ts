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

const budget =
  readFileSync(
    new URL(
      "./master-article-semantic-critic-budget.ts",
      import.meta.url
    ),
    "utf8"
  );

const prompt =
  readFileSync(
    new URL(
      "./master-article-semantic-critic-prompt.ts",
      import.meta.url
    ),
    "utf8"
  );


const start =
  service.indexOf(
    "export async function generateArticleFromBrief("
  );

const generation =
  service.slice(
    start
  );


describe(
  "evidence-deferred production boundary",
  () => {
    it(
      "builds the writer contract after evidence-aware planning",
      () => {
        const outline =
          generation.indexOf(
            "const articleOutlinePlan ="
          );

        const effectiveRuntime =
          generation.indexOf(
            "const effectiveMasterRuntime ="
          );

        const contract =
          generation.indexOf(
            "const articleGenerationContract ="
          );


        expect(
          outline
        ).toBeGreaterThanOrEqual(
          0
        );

        expect(
          effectiveRuntime
        ).toBeGreaterThan(
          outline
        );

        expect(
          contract
        ).toBeGreaterThan(
          effectiveRuntime
        );
      }
    );


    it(
      "rebuilds rather than filtering stale section contracts",
      () => {
        expect(
          generation
        ).toContain(
          "buildArticleGenerationContractV1(\n      effectiveMasterRuntime"
        );

        expect(
          generation
        ).toContain(
          "effectiveMasterSections"
        );
      }
    );


    it(
      "passes explicit deferred scope to semantic critics",
      () => {
        expect(
          generation
        ).toContain(
          "EVIDENCE_DEFERRED_CRITIC_SCOPE_V1"
        );

        expect(
          generation
        ).toContain(
          "evidenceDeferredMasterScope"
        );
      }
    );


    it(
      "uses same runtime scope for SERP replay",
      () => {
        expect(
          generation
        ).toContain(
          "runtime:\n              effectiveMasterRuntime,"
        );
      }
    );


    it(
      "serializes and explains deferred scope without weakening evidence",
      () => {
        expect(
          budget
        ).toContain(
          "EVIDENCE_DEFERRED_SEMANTIC_BUDGET_V1"
        );

        expect(
          prompt
        ).toContain(
          "EVIDENCE_DEFERRED_INTENT_SCOPE_V1"
        );

        expect(
          prompt
        ).toContain(
          "Deferred scope does NOT authorize facts."
        );
      }
    );
  }
);
