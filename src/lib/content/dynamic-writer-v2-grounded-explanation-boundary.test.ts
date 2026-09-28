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


const repairPrompt =
  readFileSync(
    join(
      process.cwd(),
      "src/lib/content/master-section-repair-prompt.ts"
    ),
    "utf8"
  );


const semanticPrompt =
  readFileSync(
    join(
      process.cwd(),
      "src/lib/content/master-section-semantic-prompt.ts"
    ),
    "utf8"
  );


describe(
  "Dynamic Writer V2 grounded explanation boundary",
  () => {
    it(
      "keeps material facts evidence-strict",
      () => {
        expect(
          repairPrompt
        ).toContain(
          "MATERIAL factual assertion"
        );

        expect(
          repairPrompt
        ).toContain(
          "SUPPORTS + VERIFIED_EXCERPT"
        );

        expect(
          repairPrompt
        ).toContain(
          "NEVER authorize numbers"
        );
      }
    );


    it(
      "does not require artificial claim IDs for ordinary explanation",
      () => {
        expect(
          repairPrompt
        ).toContain(
          "Ordinary grounded explanation may remain without a claim ID"
        );

        expect(
          semanticPrompt
        ).toContain(
          "Do not require a claim ID merely because a sentence explains the generic concept"
        );
      }
    );


    it(
      "does not treat declarative prose as automatically material",
      () => {
        expect(
          repairPrompt
        ).toContain(
          "Declarative wording alone does not make prose material"
        );

        expect(
          semanticPrompt
        ).toContain(
          "Declarative wording alone does not make a prose unit material"
        );
      }
    );


    it(
      "reserves unsupported for material factual assertions",
      () => {
        expect(
          semanticPrompt
        ).toContain(
          "UNSUPPORTED is reserved for a MATERIAL factual assertion"
        );
      }
    );


    it(
      "removes the old overbroad repair instruction",
      () => {
        expect(
          repairPrompt
        ).not.toContain(
          "Any factual sentence that cannot be traced"
        );

        expect(
          repairPrompt
        ).not.toContain(
          "REMOVE the entire factual proposition"
        );
      }
    );
  }
);
