import {
  describe,
  expect,
  it,
} from "vitest";

import {
  evaluateClaimPublicationGate,
} from "./claim-publication-gate";

import type {
  Claim,
  ClaimLedger,
} from "./claim-ledger";


function ledger(
  claims:
    Claim[]
): ClaimLedger {
  const counts = {
    VERIFIED:
      0,

    PARTIAL:
      0,

    UNSUPPORTED:
      0,

    CONTRADICTED:
      0,

    STALE:
      0,

    JURISDICTION_MISMATCH:
      0,
  };

  for (
    const claim
    of claims
  ) {
    counts[
      claim.status
    ] +=
      1;
  }

  return {
    version:
      "CLAIM_LEDGER_V1",

    claims,

    counts,

    verified:
      counts.VERIFIED,

    unsupported:
      counts.UNSUPPORTED,

    blockingCandidateCount:
      0,
  };
}


function claim(
  input:
    Partial<Claim> &
    Pick<
      Claim,
      | "id"
      | "status"
    >
): Claim {
  return {
    id:
      input.id,

    text:
      input.text ??
      "Test claim",

    category:
      input.category ??
      "FACT",

    risk:
      input.risk ??
      "LOW",

    jurisdiction:
      input.jurisdiction,

    evidenceIds:
      input.evidenceIds ??
      [],

    status:
      input.status,
  };
}


describe(
  "Claim Publication Gate V1",
  () => {
    it(
      "blocks unsupported high-risk claims",
      () => {
        const gate =
          evaluateClaimPublicationGate(
            ledger([
              claim({
                id:
                  "c1",

                status:
                  "UNSUPPORTED",

                risk:
                  "HIGH",

                category:
                  "FINANCIAL",
              }),
            ])
          );

        expect(
          gate.pass
        ).toBe(
          false
        );

        expect(
          gate.blockers[0]
            ?.code
        ).toBe(
          "UNSUPPORTED_HIGH_RISK_CLAIM"
        );
      }
    );


    it(
      "blocks contradicted claims",
      () => {
        const gate =
          evaluateClaimPublicationGate(
            ledger([
              claim({
                id:
                  "c1",

                status:
                  "CONTRADICTED",
              }),
            ])
          );

        expect(
          gate.pass
        ).toBe(
          false
        );

        expect(
          gate.blockers[0]
            ?.code
        ).toBe(
          "CONTRADICTED_CLAIM"
        );
      }
    );


    it(
      "blocks stale financial or legal claims",
      () => {
        const gate =
          evaluateClaimPublicationGate(
            ledger([
              claim({
                id:
                  "c1",

                status:
                  "STALE",

                category:
                  "LEGAL",

                risk:
                  "HIGH",
              }),
            ])
          );

        expect(
          gate.pass
        ).toBe(
          false
        );

        expect(
          gate.blockers[0]
            ?.code
        ).toBe(
          "STALE_FINANCIAL_OR_LEGAL_CLAIM"
        );
      }
    );


    it(
      "blocks jurisdiction mismatch",
      () => {
        const gate =
          evaluateClaimPublicationGate(
            ledger([
              claim({
                id:
                  "c1",

                status:
                  "JURISDICTION_MISMATCH",
              }),
            ])
          );

        expect(
          gate.pass
        ).toBe(
          false
        );

        expect(
          gate.blockers[0]
            ?.code
        ).toBe(
          "JURISDICTION_MISMATCH"
        );
      }
    );


    it(
      "keeps partial and lower-risk unsupported claims visible as warnings",
      () => {
        const gate =
          evaluateClaimPublicationGate(
            ledger([
              claim({
                id:
                  "partial",

                status:
                  "PARTIAL",

                risk:
                  "MEDIUM",
              }),

              claim({
                id:
                  "low",

                status:
                  "UNSUPPORTED",

                risk:
                  "LOW",
              }),
            ])
          );

        expect(
          gate.pass
        ).toBe(
          true
        );

        expect(
          gate.warnings
        ).toEqual(
          expect.arrayContaining([
            "PARTIAL_CLAIM:partial",
            "UNSUPPORTED_NON_HIGH_RISK_CLAIM:low",
          ])
        );
      }
    );
  }
);
