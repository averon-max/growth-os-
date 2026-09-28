import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";


const generator =
  readFileSync(
    new URL(
      "./gemini-generator.ts",
      import.meta.url
    ),
    "utf8"
  );


const prompt =
  readFileSync(
    new URL(
      "./master-section-semantic-prompt.ts",
      import.meta.url
    ),
    "utf8"
  );


describe(
  "semantic unit continuation boundary",
  () => {
    it(
      "supports deterministic missing-unit prompts",
      () => {
        expect(
          prompt
        ).toContain(
          "unitIds?"
        );

        expect(
          prompt
        ).toContain(
          "requestedUnitIds"
        );

        expect(
          prompt
        ).toContain(
          "SECTION_SEMANTIC_PROMPT_UNKNOWN_UNIT_ID"
        );
      }
    );


    it(
      "uses one bounded continuation only for count mismatch",
      () => {
        expect(
          generator
        ).toContain(
          "SECTION_SEMANTIC_UNIT_CONTINUATION_V1"
        );

        expect(
          generator
        ).toContain(
          'message !==\n        "SECTION_SEMANTIC_UNIT_COUNT_MISMATCH"'
        );

        expect(
          generator
        ).toContain(
          "missingUnitIds"
        );

        expect(
          generator
        ).toContain(
          "continuationPrompt"
        );

        expect(
          generator
        ).toContain(
          "mergedCandidate"
        );
      }
    );


    it(
      "still delegates final authority to the canonical finalizer",
      () => {
        const finalizerCalls =
          generator.match(
            /finalizeSectionSemanticVerificationV1/g
          ) ??
          [];


        expect(
          finalizerCalls.length
        ).toBeGreaterThan(
          1
        );


        expect(
          generator
        ).toContain(
          "return finalize("
        );
      }
    );


    it(
      "does not synthesize classifications for missing units",
      () => {
        expect(
          generator
        ).not.toContain(
          'classification: "NOT_A_FACT",\n          rationale: "auto'
        );

        expect(
          generator
        ).not.toContain(
          'classification: "SUPPORTED",\n          rationale: "auto'
        );
      }
    );
  }
);
