import {
  describe,
  expect,
  it,
} from "vitest";

import {
  deriveContentRiskProfileV1,
} from "./content-risk-profile-v1";


describe(
  "Content Risk Profile V1",
  () => {
    it(
      "keeps normal content standard",
      () => {
        expect(
          deriveContentRiskProfileV1({
            query:
              "how freeze drying works",
          })
        ).toBe(
          "STANDARD"
        );
      }
    );


    it(
      "detects health independently from article type",
      () => {
        expect(
          deriveContentRiskProfileV1({
            query:
              "protein nutrition for athletes",
          })
        ).toBe(
          "YMYL_HEALTH"
        );
      }
    );


    it(
      "detects finance independently from article type",
      () => {
        expect(
          deriveContentRiskProfileV1({
            query:
              "what is credit monitoring",
          })
        ).toBe(
          "YMYL_FINANCE"
        );
      }
    );


    it(
      "detects legal independently from article type",
      () => {
        expect(
          deriveContentRiskProfileV1({
            query:
              "how contract law works",
          })
        ).toBe(
          "YMYL_LEGAL"
        );
      }
    );


    it(
      "detects safety independently from article type",
      () => {
        expect(
          deriveContentRiskProfileV1({
            query:
              "electrical safety guide",
          })
        ).toBe(
          "YMYL_SAFETY"
        );
      }
    );


    it(
      "uses explicit mission risk context too",
      () => {
        expect(
          deriveContentRiskProfileV1({
            query:
              "basic overview",
            riskClass:
              "HEALTH",
          })
        ).toBe(
          "YMYL_HEALTH"
        );
      }
    );
  }
);
