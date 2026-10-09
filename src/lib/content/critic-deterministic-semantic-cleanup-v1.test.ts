import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";


const source =
  readFileSync(
    new URL(
      "./master-section-repair.ts",
      import.meta.url
    ),
    "utf8"
  );


const start =
  source.indexOf(
    "export async function verifyGeneratedSectionOnlyV1"
  );


const end =
  source.indexOf(
    "export async function verifyAndRepairGeneratedSectionV1",
    start
  );


const verifyOnly =
  source.slice(
    start,
    end
  );


describe(
  "critic deterministic semantic cleanup V1",
  () => {
    it(
      "never performs a second LLM repair",
      () => {
        expect(
          verifyOnly
        ).not.toContain(
          ".repairSection("
        );
      }
    );


    it(
      "allows exactly one deterministic semantic deletion pass",
      () => {
        expect(
          verifyOnly
        ).toContain(
          "CRITIC_VERIFY_ONLY_DETERMINISTIC_SEMANTIC_CLEANUP_V1"
        );

        expect(
          verifyOnly.match(
            /deterministicSemanticDeleteRepairV1\(\{/g
          )?.length
        ).toBe(
          1
        );
      }
    );


    it(
      "reconciles and semantically reverifies after deterministic cleanup",
      () => {
        expect(
          verifyOnly
        ).toContain(
          "cleanedReconciliation"
        );

        expect(
          verifyOnly
        ).toContain(
          "cleanedSemantic"
        );

        expect(
          verifyOnly
        ).toContain(
          "assertSectionClaimReconciliationPassed"
        );

        expect(
          verifyOnly
        ).toContain(
          "assertSectionSemanticVerificationPassed"
        );
      }
    );
  }
);
