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


const evidence =
  readFileSync(
    new URL(
      "./live-evidence-verification.ts",
      import.meta.url
    ),
    "utf8"
  );


describe(
  "publication evidence execution scope",
  () => {
    it(
      "preserves semantic claim ownership independently of evidence",
      () => {
        expect(
          evidence
        ).toContain(
          "CLAIM_OWNERSHIP_PUBLICATION_AUTHORITY_SPLIT_V1"
        );

        expect(
          evidence
        ).toContain(
          "requiredClaims.push"
        );
      }
    );


    it(
      "defers unverified required claims before writer contract execution",
      () => {
        expect(
          service
        ).toContain(
          "PUBLICATION_EVIDENCE_DEFERRED_SCOPE_V1"
        );

        expect(
          service
        ).toContain(
          "resolvePublicationEvidenceSectionScopeV1"
        );

        expect(
          service
        ).toContain(
          "effectiveEvidenceDeferredSections"
        );
      }
    );


    it(
      "passes the same defer explanation into semantic critic context",
      () => {
        expect(
          service
        ).toContain(
          "evidenceDeferredSections:\n            effectiveEvidenceDeferredSections"
        );
      }
    );    it(
      "uses the merged defer set to decide whether runtime is filtered",
      () => {
        expect(
          service
        ).toContain(
          "MERGED_DEFER_INDEXES_EFFECTIVE_RUNTIME_V1"
        );

        expect(
          service
        ).toContain(
          "deferredMasterIndexes\n      .size ==="
        );

        expect(
          service
        ).not.toContain(
          "evidenceDeferredMasterScope\n      .deferredIndexes\n      .length ===\n    0\n      ? masterRuntimeInspection"
        );
      }
    );


  }
);
