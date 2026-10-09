import {
  describe,
  expect,
  it,
} from "vitest";

import {
  isSafeClaimReconciliationCandidateV1,
  rankEvidenceRecoveryExcerptsV1,
} from "./live-evidence-verification";

import {
  readFileSync,
} from "node:fs";

import {
  join,
} from "node:path";


describe(
  "evidence-grounded claim reconciliation V1",
  () => {
    it(
      "permits a conservative same-polarity restatement",
      () => {
        expect(
          isSafeClaimReconciliationCandidateV1({
            originalText:
              "Checking your own credit information does not create a hard inquiry.",

            candidateText:
              "Checking your own credit report does not create a hard inquiry.",
          })
        ).toBe(
          true
        );
      }
    );


    it(
      "rejects polarity changes",
      () => {
        expect(
          isSafeClaimReconciliationCandidateV1({
            originalText:
              "Checking your own credit report does not create a hard inquiry.",

            candidateText:
              "Checking your own credit report creates a hard inquiry.",
          })
        ).toBe(
          false
        );
      }
    );


    it(
      "rejects numeric drift",
      () => {
        expect(
          isSafeClaimReconciliationCandidateV1({
            originalText:
              "The service checks 3 credit bureaus.",

            candidateText:
              "The service checks 2 credit bureaus.",
          })
        ).toBe(
          false
        );
      }
    );


    it(
      "rejects negative-target drift",
      () => {
        expect(
          isSafeClaimReconciliationCandidateV1({
            originalText:
              "Checking your own credit report does not create a hard inquiry.",

            candidateText:
              "Checking your own credit report does not change account information.",
          })
        ).toBe(
          false
        );
      }
    );


    it(
      "ranks real-page near matches without converting them into verified evidence",
      () => {
        const candidates =
          rankEvidenceRecoveryExcerptsV1({
            claimText:
              "Checking your own credit report does not create a hard inquiry.",

            bodyText:
              [
                "This unrelated sentence talks about budgeting and saving money.",
                "Checking your own credit report does not result in a hard inquiry and is generally treated differently from a lender credit check.",
                "Another unrelated sentence appears here for testing.",
              ].join(
                " "
              ),
          });

        expect(
          candidates.length
        ).toBeGreaterThan(
          0
        );

        expect(
          candidates[0]
            ?.excerpt
        ).toContain(
          "hard inquiry"
        );
      }
    );


    it(
      "keeps reconciliation bounded and requires strict re-verification",
      () => {
        const planner =
          readFileSync(
            join(
              process.cwd(),
              "src/lib/content/production-master-live-stage-planner.ts"
            ),
            "utf8"
          );

        expect(
          planner
        ).toContain(
          "EVIDENCE_GROUNDED_CLAIM_RECONCILIATION_V1"
        );

        expect(
          planner
        ).toContain(
          "collectEvidenceClaimRecoveryCandidatesV1({"
        );

        expect(
          planner
        ).toContain(
          "isSafeClaimReconciliationCandidateV1({"
        );

        expect(
          planner
        ).toContain(
          "const reconciledEvidenceGraph"
        );

        expect(
          planner
        ).toContain(
          "await enrichLiveEvidenceGraphV1({"
        );

        expect(
          planner
        ).toContain(
          "[content evidence claim reconciliation]"
        );

        expect(
          planner
        ).not.toContain(
          "CLAIM_RECONCILIATION_LOWER_THRESHOLD"
        );
      }
    );
  }
);
