import {
  describe,
  expect,
  it,
} from "vitest";

import {
  geminiGenerator,
} from "./gemini-generator";

import {
  supportsMasterSectionRepairGenerator,
} from "./master-section-repair";


describe(
  "Gemini targeted section repair capability",
  () => {
    it(
      "exposes targeted repairSection",
      () => {
        expect(
          supportsMasterSectionRepairGenerator(
            geminiGenerator
          )
        ).toBe(
          true
        );

        expect(
          typeof geminiGenerator
            .repairSection
        ).toBe(
          "function"
        );
      }
    );
  }
);
