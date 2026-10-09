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


function rankingFindings(
  bodyMarkdown:
    string
) {
  return auditExternalEvidenceClaims(
    article(
      bodyMarkdown
    )
  ).filter(
    (
      finding
    ) =>
      finding.code ===
      "EXTERNAL_RANKING_REQUIRES_EVIDENCE"
  );
}


describe(
  "negated generic best is not a ranking claim",
  () => {
    it(
      "allows a sentence that denies a universally best option",
      () => {
        expect(
          rankingFindings(
            "The goal is not to find a universally best option; it is to choose an approach whose coverage and operating details match your needs and expectations."
          )
        ).toHaveLength(
          0
        );
      }
    );


    it(
      "allows not necessarily one best option",
      () => {
        expect(
          rankingFindings(
            "There is not necessarily one best option for every household."
          )
        ).toHaveLength(
          0
        );
      }
    );


    it(
      "still blocks a plain unsupported best claim",
      () => {
        expect(
          rankingFindings(
            "ExampleCo is the best credit monitoring service."
          ).length
        ).toBeGreaterThan(
          0
        );
      }
    );


    it(
      "still blocks a second best claim hidden next to a negation",
      () => {
        expect(
          rankingFindings(
            "This is not a universally best option, yet ExampleCo is the best service."
          ).length
        ).toBeGreaterThan(
          0
        );
      }
    );


    it(
      "still blocks a concrete ranking marker next to a negation",
      () => {
        expect(
          rankingFindings(
            "It is not a universally best option, but ExampleCo is the leading service."
          ).length
        ).toBeGreaterThan(
          0
        );
      }
    );


    it(
      "does not exempt an affirmative universal best claim",
      () => {
        expect(
          rankingFindings(
            "ExampleCo is universally best for every consumer."
          ).length
        ).toBeGreaterThan(
          0
        );
      }
    );
  }
);
