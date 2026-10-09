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


function rankingFinding(
  bodyMarkdown:
    string
): boolean {
  return auditExternalEvidenceClaims(
    article(
      bodyMarkdown
    )
  ).some(
    (
      finding
    ) =>
      finding.code ===
        "EXTERNAL_RANKING_REQUIRES_EVIDENCE"
  );
}


describe(
  "interpretive passive best context V1",
  () => {
    it(
      "does not flag the exact AUTO runtime sentence",
      () => {
        expect(
          rankingFinding(
            "A displayed score is best read together with the report information and the description of the score being displayed."
          )
        ).toBe(
          false
        );
      }
    );


    it(
      "allows equivalent interpretive language",
      () => {
        expect(
          rankingFinding(
            "The result is best interpreted in context with the underlying report."
          )
        ).toBe(
          false
        );
      }
    );


    it(
      "still blocks a real best-service ranking claim",
      () => {
        expect(
          rankingFinding(
            "Example Monitor is the best credit monitoring service."
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "strong ranking markers still override interpretive language",
      () => {
        expect(
          rankingFinding(
            "Example Monitor is a top 3 provider, and its score is best read together with the report."
          )
        ).toBe(
          true
        );
      }
    );
  }
);
