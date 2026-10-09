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
        "A practical guide.",

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
  "ranking evidence context",
  () => {
    it(
      "allows exact current best-fit false positive",
      () => {
        expect(
          rankingFindings(
            "The lowest stated price is not necessarily the best fit if the scope or process does not match your needs."
          )
        ).toEqual(
          []
        );
      }
    );


    it(
      "allows best-understood explanatory wording",
      () => {
        expect(
          rankingFindings(
            "Monitoring is best understood as an awareness tool."
          )
        ).toEqual(
          []
        );
      }
    );


    it(
      "allows process-oriented best-way wording",
      () => {
        expect(
          rankingFindings(
            "The best way to compare plans is to start with the features you need."
          )
        ).toEqual(
          []
        );
      }
    );


    it(
      "allows best-practice wording",
      () => {
        expect(
          rankingFindings(
            "These best practices can make comparisons easier."
          )
        ).toEqual(
          []
        );
      }
    );


    it(
      "still blocks a real best-service claim",
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
      "still blocks top-N rankings",
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
      "still blocks third-party recognition",
      () => {
        expect(
          rankingFindings(
            "Acme is a widely recognized leading monitoring platform."
          ).length
        ).toBeGreaterThan(
          0
        );
      }
    );


    it(
      "strong ranking wording overrides best-fit idiom",
      () => {
        expect(
          rankingFindings(
            "Acme is widely recognized as the best fit for consumers."
          ).length
        ).toBeGreaterThan(
          0
        );
      }
    );
  }
);
