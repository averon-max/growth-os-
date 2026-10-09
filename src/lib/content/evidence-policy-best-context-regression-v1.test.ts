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
  "ranking evidence lexical context regression",
  () => {
    it(
      "does not mistake best understood for an external ranking",
      () => {
        const findings =
          auditExternalEvidenceClaims(
            article(
              "Monitoring is best understood as an awareness tool."
            )
          );

        expect(
          findings.some(
            (
              finding
            ) =>
              finding.code ===
              "EXTERNAL_RANKING_REQUIRES_EVIDENCE"
          )
        ).toBe(false);
      }
    );


    it(
      "does not mistake contextual best choice language for a universal ranking",
      () => {
        const findings =
          auditExternalEvidenceClaims(
            article(
              "The best monitoring service depends on the scope you want, rather than on a universal top three."
            )
          );

        expect(
          findings.some(
            (
              finding
            ) =>
              finding.code ===
              "EXTERNAL_RANKING_REQUIRES_EVIDENCE"
          )
        ).toBe(false);
      }
    );


    it(
      "still blocks a real unsupported best-product claim",
      () => {
        const findings =
          auditExternalEvidenceClaims(
            article(
              "ExampleCo is the best credit monitoring service."
            )
          );

        expect(
          findings.some(
            (
              finding
            ) =>
              finding.code ===
              "EXTERNAL_RANKING_REQUIRES_EVIDENCE"
          )
        ).toBe(true);
      }
    );
  }
);
