import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";


function source(
  name:
    string
): string {
  return readFileSync(
    new URL(
      name,
      import.meta.url
    ),
    "utf8"
  );
}


describe(
  "Master Runtime URL Ownership wiring",
  () => {
    it(
      "stores URL ownership on normalized MasterRuntime",
      () => {
        const text =
          source(
            "./master-runtime-adapter.ts"
          );

        expect(
          text
        ).toContain(
          "urlOwnership?:"
        );

        expect(
          text
        ).toContain(
          "normalizeMasterRuntimeUrlOwnershipV1("
        );

        expect(
          text
        ).toContain(
          "urlOwnership.missionId"
        );

        expect(
          text
        ).toMatch(
          /const runtime:[\s\S]*urlOwnership,/
        );
      }
    );


    it(
      "orchestrator forwards ownership instead of deriving it",
      () => {
        const text =
          source(
            "./master-runtime-orchestrator.ts"
          );

        expect(
          text
        ).toContain(
          "artifacts.urlOwnership ??"
        );

        expect(
          text
        ).not.toContain(
          "evaluateUrlOwnership("
        );
      }
    );


    it(
      "production artifact builder persists supplied ownership",
      () => {
        const text =
          source(
            "./production-master-artifact-builders.ts"
          );

        expect(
          text
        ).toContain(
          "urlOwnership?:"
        );

        expect(
          text
        ).toContain(
          "input.urlOwnership ??"
        );

        expect(
          text
        ).not.toContain(
          "evaluateUrlOwnership("
        );
      }
    );


    it(
      "keeps historical snapshots explicit instead of inventing an owner",
      () => {
        const text =
          source(
            "./master-runtime-url-ownership.ts"
          );

        expect(
          text
        ).toContain(
          "return null;"
        );

        expect(
          text
        ).not.toContain(
          "CREATE_CANDIDATE\" as const"
        );
      }
    );
  }
);
