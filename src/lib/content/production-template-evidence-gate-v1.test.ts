import {
  describe,
  expect,
  it,
} from "vitest";

import {
  ARTICLE_TEMPLATE_POLICIES_V1,
} from "./article-template-policy-v1";

import type {
  OriginalValueAsset,
} from "./original-value";

import {
  ProductionTemplateEvidenceGateErrorV1,
  assertProductionTemplateEvidenceGateV1,
} from "./production-template-evidence-gate-v1";


const coverage = {
  version:
    "TEMPLATE_COVERAGE_V1" as const,

  status:
    "PASS" as const,

  templateId:
    "EXPLAINER_GUIDE" as const,

  coveredRoles:
    [],

  missingRequiredRoles:
    [],

  unsupportedEvidenceSensitiveRoles:
    [],
};


function realTest():
OriginalValueAsset {
  return {
    id:
      "asset-test",

    type:
      "REAL_TEST",

    title:
      "Hands-on test",

    description:
      "Real first-party product test.",

    firstParty:
      true,

    verified:
      false,
  };
}


describe(
  "Production Template Evidence Gate V1",
  () => {
    it(
      "blocks ranked list without real ranking methodology evidence",
      () => {
        expect(
          () =>
            assertProductionTemplateEvidenceGateV1({
              policy:
                ARTICLE_TEMPLATE_POLICIES_V1
                  .RANKED_LIST,

              templateCoverage: {
                ...coverage,

                templateId:
                  "RANKED_LIST",
              },

              rankingEvidenceAvailable:
                false,

              location:
                "Calgary",

              originalValueAssets:
                [],
            })
        ).toThrow(
          ProductionTemplateEvidenceGateErrorV1
        );
      }
    );


    it(
      "blocks product review without planned first-party experience",
      () => {
        expect(
          () =>
            assertProductionTemplateEvidenceGateV1({
              policy:
                ARTICLE_TEMPLATE_POLICIES_V1
                  .PRODUCT_REVIEW,

              templateCoverage: {
                ...coverage,

                templateId:
                  "PRODUCT_REVIEW",
              },

              rankingEvidenceAvailable:
                false,

              location:
                null,

              originalValueAssets:
                [],
            })
        ).toThrow(
          ProductionTemplateEvidenceGateErrorV1
        );
      }
    );


    it(
      "allows product review planning when real first-party experience is represented",
      () => {
        expect(
          () =>
            assertProductionTemplateEvidenceGateV1({
              policy:
                ARTICLE_TEMPLATE_POLICIES_V1
                  .PRODUCT_REVIEW,

              templateCoverage: {
                ...coverage,

                templateId:
                  "PRODUCT_REVIEW",
              },

              rankingEvidenceAvailable:
                false,

              location:
                null,

              originalValueAssets: [
                realTest(),
              ],
            })
        ).not.toThrow();
      }
    );


    it(
      "blocks local directory without a real location",
      () => {
        expect(
          () =>
            assertProductionTemplateEvidenceGateV1({
              policy:
                ARTICLE_TEMPLATE_POLICIES_V1
                  .LOCAL_DIRECTORY,

              templateCoverage: {
                ...coverage,

                templateId:
                  "LOCAL_DIRECTORY",
              },

              rankingEvidenceAvailable:
                false,

              location:
                "",

              originalValueAssets: [
                {
                  id:
                    "directory-data",

                  type:
                    "FIRST_PARTY_DATASET",

                  title:
                    "Verified directory",

                  description:
                    "Local directory dataset.",

                  firstParty:
                    true,

                  verified:
                    false,
                },
              ],
            })
        ).toThrow(
          ProductionTemplateEvidenceGateErrorV1
        );
      }
    );
  }
);
