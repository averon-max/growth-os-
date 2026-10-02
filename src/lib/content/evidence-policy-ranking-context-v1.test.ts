import {
  describe,
  expect,
  it,
} from "vitest";

import {
  auditExternalEvidenceClaims,
} from "./evidence-policy";


function article(
  sentence:
    string
) {
  return {
    title:
      "Neutral title",

    metaDescription:
      "Neutral description.",

    h1:
      "Neutral heading",

    bodyMarkdown:
      sentence,
  } as any;
}


function rankingFindings(
  sentence:
    string
) {
  return auditExternalEvidenceClaims(
    article(
      sentence
    ),
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
  "ranking evidence contextual classification V1",
  () => {
    it(
      "allows the exact production false-positive sentence",
      () => {
        expect(
          rankingFindings(
            "The best monitoring service depends on the scope you want, rather than on a universal top three."
          )
        ).toHaveLength(
          0
        );
      }
    );


    it(
      "allows explicit no-universal-best language",
      () => {
        const allowed = [
          "There is no universal best credit monitoring service.",
          "There is no single best provider for everyone.",
          "No single service is the best for every user.",
          "The best option depends on your needs.",
          "The best choice depends on the features you actually need.",
          "Choose based on your needs rather than a universal top 3.",
          "This is not the best option for everyone.",
        ];

        for (
          const sentence
          of allowed
        ) {
          expect(
            rankingFindings(
              sentence
            ),
            sentence
          ).toHaveLength(
            0
          );
        }
      }
    );


    it(
      "still blocks positive best-of claims without evidence",
      () => {
        const blocked = [
          "Acme is the best credit monitoring service.",
          "Acme is the best option for credit monitoring.",
          "These are the top 3 credit monitoring services.",
          "Acme is a leading credit monitoring provider.",
          "Acme is the most popular monitoring platform.",
          "Acme is the highest-rated monitoring service.",
          "Acme is the number one monitoring service.",
          "Acme is widely recognized as a leading provider.",
        ];

        for (
          const sentence
          of blocked
        ) {
          expect(
            rankingFindings(
              sentence
            ),
            sentence
          ).toHaveLength(
            1
          );
        }
      }
    );


    it(
      "does not weaken other external-evidence policies",
      () => {
        const findings =
          auditExternalEvidenceClaims(
            article(
              [
                "The service costs $29 per month.",
                "Federal law requires a permissible purpose.",
                "The service sends an immediate alert.",
              ].join(
                " "
              )
            ),
            []
          );

        const codes =
          findings.map(
            (
              finding
            ) =>
              finding.code
          );

        expect(
          codes
        ).toContain(
          "EXTERNAL_PRICE_REQUIRES_EVIDENCE"
        );

        expect(
          codes
        ).toContain(
          "EXTERNAL_LEGAL_REQUIRES_EVIDENCE"
        );

        expect(
          codes
        ).toContain(
          "EXTERNAL_ABSOLUTE_CLAIM_REQUIRES_EVIDENCE"
        );
      }
    );
  }
);
