import {
  describe,
  expect,
  it,
} from "vitest";

import {
  MATERIAL_CLAIM_POLICY_VERSION,
  materialClaimPolicyPromptV2,
  materialClaimPolicySummaryV2,
} from "./material-claim-policy";


describe(
  "Material Claim Policy V2",
  () => {
    it(
      "keeps material facts fail closed",
      () => {
        const policy =
          materialClaimPolicySummaryV2();

        expect(
          policy.version
        ).toBe(
          MATERIAL_CLAIM_POLICY_VERSION
        );

        expect(
          policy.rules
            .materialFactsRequireClaimAndEvidence
        ).toBe(
          true
        );

        expect(
          policy.rules
            .unsupportedMaterialFactsAllowed
        ).toBe(
          false
        );

        expect(
          policy.rules
            .contradictedMaterialFactsAllowed
        ).toBe(
          false
        );
      }
    );


    it(
      "does not require fake claim IDs for explanation",
      () => {
        expect(
          materialClaimPolicySummaryV2()
            .rules
            .groundedExplanationRequiresArtificialClaimId
        ).toBe(
          false
        );
      }
    );


    it(
      "fails closed when materiality is uncertain",
      () => {
        expect(
          materialClaimPolicySummaryV2()
            .rules
            .uncertaintyFailsClosed
        ).toBe(
          true
        );
      }
    );


    it(
      "covers high-risk material classes",
      () => {
        const prompt =
          materialClaimPolicyPromptV2()
            .join(
              "\n"
            )
            .toLowerCase();

        for (
          const term
          of [
            "prices",
            "medical",
            "financial",
            "legal",
            "product capabilities",
            "comparisons",
            "rankings",
          ]
        ) {
          expect(
            prompt
          ).toContain(
            term
          );
        }
      }
    );
  }
);
