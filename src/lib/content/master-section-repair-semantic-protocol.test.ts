import {
  describe,
  expect,
  it,
} from "vitest";

import fs from "node:fs";
import path from "node:path";


describe(
  "Master Section Repair semantic BLOCK protocol",
  () => {
    const source =
      fs.readFileSync(
        path.join(
          process.cwd(),
          "src/lib/content/master-section-repair-prompt.ts"
        ),
        "utf8"
      );


    it(
      "requires unsupported semantic meaning to be removed",
      () => {
        expect(
          source
        ).toContain(
          "SEMANTIC BLOCK REPAIR PROTOCOL:"
        );

        expect(
          source
        ).toContain(
          "UNSUPPORTED or CONTRADICTED"
        );

        expect(
          source
        ).toContain(
          "remove that MATERIAL proposition"
        );
      }
    );


    it(
      "forbids paraphrasing unsupported meaning",
      () => {
        expect(
          source
        ).toContain(
          "Do not preserve the same unsupported meaning by paraphrasing it"
        );
      }
    );


    it(
      "keeps verified evidence as the authority boundary",
      () => {
        expect(
          source
        ).toContain(
          "publication-grade assigned evidence"
        );

        expect(
          source
        ).toContain(
          "assigned VERIFIED_EXCERPT support"
        );
      }
    );
  }
);
