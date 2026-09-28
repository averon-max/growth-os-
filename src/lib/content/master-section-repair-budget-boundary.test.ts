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
      "./master-section-repair-prompt.ts",
      import.meta.url
    ),
    "utf8"
  );


describe(
  "targeted repair prompt budget boundary",
  () => {
    it(
      "keeps section-scoped authority",
      () => {
        expect(
          repair
        ).toContain(
          "buildSectionScopedAuthorityContextV1"
        );

        expect(
          repair
        ).toContain(
          "SECTION_REPAIR_COMPACT_CONTEXT_V2"
        );
      }
    );


    it(
      "sends only semantic blockers to repair",
      () => {
        expect(
          repair
        ).toContain(
          "blockingSemanticUnits"
        );

        expect(
          repair
        ).toContain(
          '"UNSUPPORTED"'
        );

        expect(
          repair
        ).toContain(
          '"CONTRADICTED"'
        );
      }
    );


    it(
      "does not serialize the complete semantic verification object",
      () => {
        expect(
          repair
        ).not.toContain(
          "semanticVerification:\\n        semanticVerification"
        );
      }
    );


    it(
      "does not expose article-global evidence authority",
      () => {
        expect(
          repair
        ).not.toContain(
          "authoritativeEvidence:\\n          contract.evidenceGraph"
        );

        expect(
          repair
        ).not.toContain(
          "authoritativeClaims:\\n          contract.claimLedger"
        );
      }
    );
  }
);
