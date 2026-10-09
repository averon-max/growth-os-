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
      "Credit Monitoring",

    metaDescription:
      "Credit monitoring guide.",

    h1:
      "Credit Monitoring",

    bodyMarkdown,
  };
}


function rankingFinding(
  body:
    string
) {
  return auditExternalEvidenceClaims(
    article(
      body
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
  "advisory best false-positive closure V2",
  () => {
    it(
      "allows exact personal-fit sentence from production incident",
      () => {
        expect(
          rankingFinding(
            "Choose the service that best matches your priorities after comparing coverage, alert clarity, report access, privacy terms, and cancellation conditions."
          )
        ).toBe(
          false
        );
      }
    );


    it(
      "allows exact anti-ranking sentence from production incident",
      () => {
        expect(
          rankingFinding(
            "Avoid relying on a generic “best” label without checking whether the service fits your situation."
          )
        ).toBe(
          false
        );
      }
    );


    it(
      "still blocks a genuine best-provider assertion",
      () => {
        expect(
          rankingFinding(
            "Acme is the best credit monitoring service."
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "still blocks strong top-N ranking language",
      () => {
        expect(
          rankingFinding(
            "These are the top 3 credit monitoring services."
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "strong ranking marker wins even when fit wording also exists",
      () => {
        expect(
          rankingFinding(
            "Our top 3 services best match your priorities."
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "still blocks highest-rated language",
      () => {
        expect(
          rankingFinding(
            "Acme is the highest-rated monitoring provider."
          )
        ).toBe(
          true
        );
      }
    );
  }
);
