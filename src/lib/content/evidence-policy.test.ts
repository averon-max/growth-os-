import {
  describe,
  expect,
  it,
} from "vitest";

import {
  auditExternalEvidenceClaims,
} from "./evidence-policy";

function article(
  bodyMarkdown:
    string
) {
  return {
    title:
      "Credit Monitoring Guide",

    metaDescription:
      "A factual guide to credit monitoring.",

    h1:
      "Credit Monitoring Guide",

    bodyMarkdown,
  };
}

describe(
  "external evidence policy",
  () => {
    it(
      "does not flag ordinary explanatory prose",
      () => {
        expect(
          auditExternalEvidenceClaims(
            article(
              "Credit monitoring can help people notice changes reported to a credit file."
            )
          )
        ).toEqual(
          []
        );
      }
    );

    it(
      "flags external pricing",
      () => {
        const result =
          auditExternalEvidenceClaims(
            article(
              "Premium services typically cost between $10 and $30 per month."
            )
          );

        expect(
          result.some(
            (finding) =>
              finding.code ===
              "EXTERNAL_PRICE_REQUIRES_EVIDENCE"
          )
        ).toBe(
          true
        );
      }
    );

    it(
      "flags legal claims",
      () => {
        const result =
          auditExternalEvidenceClaims(
            article(
              "Under the Fair Credit Reporting Act, a company must have a permissible purpose."
            )
          );

        expect(
          result.some(
            (finding) =>
              finding.code ===
              "EXTERNAL_LEGAL_REQUIRES_EVIDENCE"
          )
        ).toBe(
          true
        );
      }
    );

    it(
      "leaves ScanMyCreds claims to the verified product claim gate",
      () => {
        expect(
          auditExternalEvidenceClaims(
            article(
              "ScanMyCreds provides a free scan."
            )
          )
        ).toEqual(
          []
        );
      }
    );
  }
);


describe(
  "evidence markdown normalization",
  () => {
    it(
      "preserves word boundaries around markdown links",
      () => {
        const findings =
          auditExternalEvidenceClaims({
            title:
              "Credit Monitoring",

            metaDescription:
              "Credit monitoring overview.",

            h1:
              "Credit Monitoring",

            bodyMarkdown:
              [
                "Under the Fair Credit Reporting Act (FCRA),",
                "a[loan](https://example.com/loan) application",
                "requires a permissible purpose under federal law.",
              ].join(
                " "
              ),
          });

        expect(
          findings.length
        ).toBeGreaterThan(
          0
        );

        const combined =
          findings
            .map(
              (finding) =>
                finding.sentence
            )
            .join(
              " "
            );

        expect(
          combined
        ).toContain(
          "a loan application"
        );

        expect(
          combined
        ).not.toContain(
          "aloan"
        );
      }
    );
  }
);
