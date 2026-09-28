import {
  describe,
  expect,
  it,
} from "vitest";

import fs from "node:fs";
import path from "node:path";


function read(
  file:
    string
): string {
  return fs.readFileSync(
    path.join(
      process.cwd(),
      "src/lib/content",
      file
    ),
    "utf8"
  );
}


describe(
  "Dynamic Writer V2 boundary",
  () => {
    const semantic =
      read(
        "master-section-semantic-prompt.ts"
      );

    const writer =
      read(
        "master-section-prompt.ts"
      );

    const repair =
      read(
        "master-section-repair-prompt.ts"
      );

    const reconciliation =
      read(
        "section-claim-reconciliation.ts"
      );


    it(
      "allows ordinary explanation without artificial claim IDs",
      () => {
        expect(
          semantic
        ).toContain(
          "Ordinary grounded explanatory prose does not require a claim ID"
        );

        expect(
          writer
        ).toContain(
          "Ordinary explanation, transitions, framing, reader guidance, and non-material synthesis do NOT need artificial claim IDs."
        );

        expect(
          repair
        ).toContain(
          "Ordinary grounded explanation does not need an artificial claim ID."
        );
      }
    );


    it(
      "keeps required blueprint claims strict",
      () => {
        expect(
          reconciliation
        ).toContain(
          "REQUIRED_CLAIM_NOT_REFERENCED"
        );

        expect(
          reconciliation
        ).toContain(
          "Required claims must exist and must be declared as used."
        );
      }
    );


    it(
      "keeps material facts evidence-gated",
      () => {
        expect(
          semantic
        ).toContain(
          "MATERIAL factual assertion"
        );

        expect(
          semantic
        ).toContain(
          "SEARCH_SNIPPET or REFERENCE_ONLY evidence is not publication-grade support."
        );

        expect(
          semantic
        ).toContain(
          "Only SUPPORTS + VERIFIED_EXCERPT may authorize SUPPORTED/NARROWER."
        );
      }
    );


    it(
      "prevents NOT_A_FACT evidence bypass",
      () => {
        expect(
          semantic
        ).toContain(
          "Never classify a material factual assertion as NOT_A_FACT"
        );

        expect(
          semantic
        ).toContain(
          "the material fact controls classification"
        );
      }
    );


    it(
      "preserves semantic enum compatibility",
      () => {
        expect(
          semantic
        ).toContain(
          "NOT_A_FACT | SUPPORTED | NARROWER | UNSUPPORTED | CONTRADICTED"
        );

        expect(
          semantic
        ).not.toContain(
          '"GROUNDED_EXPLANATION |'
        );
      }
    );
  }
);
