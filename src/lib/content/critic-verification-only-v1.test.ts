import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";


const sectionRepair =
  readFileSync(
    new URL(
      "./master-section-repair.ts",
      import.meta.url
    ),
    "utf8"
  );


const criticExecution =
  readFileSync(
    new URL(
      "./master-article-critic-repair-execution.ts",
      import.meta.url
    ),
    "utf8"
  );


const repairPrompt =
  readFileSync(
    new URL(
      "./master-section-repair-prompt.ts",
      import.meta.url
    ),
    "utf8"
  );


describe(
  "critic verification-only transaction V1",
  () => {
    it(
      "provides a transaction that cannot invoke model repair",
      () => {
        const start =
          sectionRepair.indexOf(
            "SECTION_VERIFY_ONLY_TRANSACTION_V1"
          );

        const end =
          sectionRepair.indexOf(
            "export async function verifyAndRepairGeneratedSectionV1",
            start
          );

        expect(
          start
        ).toBeGreaterThanOrEqual(
          0
        );

        expect(
          end
        ).toBeGreaterThan(
          start
        );

        const block =
          sectionRepair.slice(
            start,
            end
          );

        expect(
          block
        ).toContain(
          "verifyGeneratedSectionOnlyV1"
        );

        expect(
          block
        ).toContain(
          "reconciliationFor"
        );

        expect(
          block
        ).toContain(
          "semanticVerify"
        );

        expect(
          block
        ).toContain(
          "assertSectionSemanticVerificationPassed"
        );

        expect(
          block
        ).not.toContain(
          ".repairSection("
        );
      }
    );


    it(
      "critic stage uses one model rewrite followed by verify-only",
      () => {
        expect(
          criticExecution
        ).toContain(
          "verifyGeneratedSectionOnlyV1({"
        );

        expect(
          criticExecution
        ).toContain(
          "verifyGeneratedSectionOnlyV1({"
        );

        expect(
          criticExecution
        ).toContain(
          "generator:\n            repairGenerator"
        );

        expect(
          criticExecution
        ).not.toContain(
          "verificationOnlyGenerator"
        );

        expect(
          criticExecution
        ).not.toContain(
          "MASTER_CRITIC_REPAIR_SECOND_PASS_FORBIDDEN"
        );
      }
    );


    it(
      "critic prompt preserves claims evidence and useful depth",
      () => {
        expect(
          repairPrompt
        ).toContain(
          "CRITIC_SINGLE_PASS_CONTRACT_PRESERVATION_V2"
        );

        expect(
          repairPrompt
        ).toContain(
          "Preserve every required claim"
        );

        expect(
          repairPrompt
        ).toContain(
          "Preserve publication-grade evidence provenance"
        );

        expect(
          repairPrompt
        ).toContain(
          "Preserve useful section depth"
        );

        expect(
          repairPrompt
        ).toContain(
          "Do not rely on a later model repair"
        );
      }
    );
  }
);
