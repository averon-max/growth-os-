import {
  describe,
  expect,
  it,
} from "vitest";

import fs from "node:fs";
import path from "node:path";


describe(
  "Section repair scoped authority boundary",
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
      "uses the canonical section-scoped authority projector",
      () => {
        expect(
          source
        ).toContain(
          "buildSectionScopedAuthorityContextV1"
        );

        expect(
          source
        ).toContain(
          "SECTION_REPAIR_SCOPED_AUTHORITY_V1"
        );
      }
    );


    it(
      "does not expose the full article claim ledger to repair",
      () => {
        expect(
          source
        ).not.toContain(
          "contract.claimLedger"
        );
      }
    );


    it(
      "does not expose the full article evidence graph to repair",
      () => {
        expect(
          source
        ).not.toContain(
          "contract.evidenceGraph"
        );
      }
    );


    it(
      "retains local repair diagnostics",
      () => {
        expect(
          source
        ).toContain(
          "deterministicReconciliation"
        );

        expect(
          source
        ).toContain(
          "semanticVerification"
        );

        expect(
          source
        ).toContain(
          "originalSection"
        );
      }
    );
  }
);
