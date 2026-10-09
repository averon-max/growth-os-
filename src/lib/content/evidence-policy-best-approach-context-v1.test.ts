import {
  describe,
  expect,
  it,
} from "vitest";

import {
  auditExternalEvidenceClaims,
} from "./evidence-policy";


function rankingFindings(
  sentence:
    string
) {
  return auditExternalEvidenceClaims(
    {
      title:
        "Credit Monitoring Guide",

      metaDescription:
        "Practical credit monitoring guidance.",

      h1:
        "Credit Monitoring",

      bodyMarkdown:
        `## Test\n\n${sentence}`,
    },
    []
  ).filter(
    (
      finding
    ) =>
      finding.code ===
      "EXTERNAL_RANKING_REQUIRES_EVIDENCE"
  );
}


describe(
  "best approach publication-policy context",
  () => {
    it(
      "allows the exact current advisory sentence",
      () => {
        expect(
          rankingFindings(
            "The best approach is one you can understand and follow consistently."
          )
        ).toEqual(
          []
        );
      }
    );


    it(
      "allows generic needs-dependent approach wording",
      () => {
        expect(
          rankingFindings(
            "The best approach depends on your needs and priorities."
          )
        ).toEqual(
          []
        );
      }
    );


    it(
      "still requires evidence for an actual best-service ranking",
      () => {
        expect(
          rankingFindings(
            "Acme is the best credit monitoring service."
          ).length
        ).toBeGreaterThan(
          0
        );
      }
    );


    it(
      "still requires evidence for top-N ranking claims",
      () => {
        expect(
          rankingFindings(
            "These are the top 3 credit monitoring services."
          ).length
        ).toBeGreaterThan(
          0
        );
      }
    );


    it(
      "strong external ranking language still wins",
      () => {
        expect(
          rankingFindings(
            "Acme is widely recognized as the best approach for consumers."
          ).length
        ).toBeGreaterThan(
          0
        );
      }
    );
  }
);
