import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";


const repair =
  readFileSync(
    new URL(
      "./master-section-repair.ts",
      import.meta.url
    ),
    "utf8"
  );


const deterministic =
  readFileSync(
    new URL(
      "./deterministic-semantic-repair.ts",
      import.meta.url
    ),
    "utf8"
  );


describe(
  "deterministic semantic repair boundary",
  () => {
    it(
      "does not call generative repair for semantic trigger",
      () => {
        expect(
          repair
        ).toContain(
          "SEMANTIC_REPAIR_DETERMINISTIC_V1"
        );

        expect(
          repair
        ).toContain(
          "deterministicSemanticDeleteRepairV1"
        );
      }
    );


    it(
      "removes only verifier-blocked classifications",
      () => {
        expect(
          deterministic
        ).toContain(
          '"UNSUPPORTED"'
        );

        expect(
          deterministic
        ).toContain(
          '"CONTRADICTED"'
        );

        expect(
          deterministic
        ).toContain(
          "SECTION_DETERMINISTIC_SEMANTIC_TARGET_NOT_FOUND"
        );
      }
    );


    it(
      "requires required claims to survive as supported or narrower",
      () => {
        expect(
          deterministic
        ).toContain(
          '"SUPPORTED"'
        );

        expect(
          deterministic
        ).toContain(
          '"NARROWER"'
        );

        expect(
          deterministic
        ).toContain(
          "SECTION_DETERMINISTIC_SEMANTIC_REQUIRED_CLAIM_NOT_SURVIVING"
        );
      }
    );
  }
);
