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

import {
  normalizeProductionClaimCategoryV2,
} from "./production-claim-category-normalization-v2";


describe(
  "production claim category normalization V2",
  () => {
    it(
      "turns the real insurance coverage claim into PRODUCT",
      () => {
        expect(
          normalizeProductionClaimCategoryV2({
            category:
              "LEGAL",

            text:
              "Identity theft protection insurance can reimburse certain costs and provide specialists who restore your identity.",
          })
        ).toBe(
          "PRODUCT"
        );
      }
    );


    it(
      "keeps an actual legal assertion LEGAL",
      () => {
        expect(
          normalizeProductionClaimCategoryV2({
            category:
              "LEGAL",

            text:
              "Federal law requires this disclosure.",
          })
        ).toBe(
          "LEGAL"
        );
      }
    );


    it(
      "legal language wins even when insurance is mentioned",
      () => {
        expect(
          normalizeProductionClaimCategoryV2({
            category:
              "LEGAL",

            text:
              "State law regulates identity theft insurance coverage.",
          })
        ).toBe(
          "LEGAL"
        );
      }
    );


    it(
      "keeps ambiguous LEGAL fail closed",
      () => {
        expect(
          normalizeProductionClaimCategoryV2({
            category:
              "LEGAL",

            text:
              "Consumers have specific protections.",
          })
        ).toBe(
          "LEGAL"
        );
      }
    );


    it(
      "never changes an already non-LEGAL category",
      () => {
        expect(
          normalizeProductionClaimCategoryV2({
            category:
              "PRICE",

            text:
              "The service costs $10.",
          })
        ).toBe(
          "PRICE"
        );

        expect(
          normalizeProductionClaimCategoryV2({
            category:
              "FACT",

            text:
              "Monitoring watches for certain changes.",
          })
        ).toBe(
          "FACT"
        );
      }
    );


    it(
      "is wired into production Stage 7 and prompt",
      () => {
        const source =
          readFileSync(
            join(
              process.cwd(),
              "src/lib/content/production-master-live-stage-planner.ts"
            ),
            "utf8"
          );

        expect(
          source
        ).toContain(
          'from "./production-claim-category-normalization-v2"'
        );

        expect(
          source
        ).toContain(
          "normalizeProductionClaimCategoryV2({"
        );

        expect(
          source
        ).toContain(
          "LEGAL is ONLY for actual law, regulation"
        );

        expect(
          source
        ).toContain(
          "Insurance coverage, reimbursement, plan scope"
        );
      }
    );
  }
);
