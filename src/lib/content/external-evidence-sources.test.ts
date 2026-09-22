import {
  describe,
  expect,
  it,
} from "vitest";

import {
  EXTERNAL_EVIDENCE_VERSION,
  externalEvidenceSourceId,
  extractExternalEvidenceSources,
  findExternalEvidenceSupport,
  withExternalEvidenceSources,
  type ExternalEvidenceSource,
} from "./external-evidence-sources";

import {
  auditExternalEvidenceClaims,
} from "./evidence-policy";

function verifiedSource({
  excerpt,
  url =
    "https://www.consumerfinance.gov/example",
}: {
  excerpt:
    string;

  url?:
    string;
}): ExternalEvidenceSource {
  return {
    id:
      externalEvidenceSourceId(
        url
      ),

    url,

    domain:
      "consumerfinance.gov",

    title:
      "Government guidance",

    excerpt,

    evidenceLevel:
      "VERIFIED_EXCERPT",

    authority:
      "GOVERNMENT",

    discoveredBy: [
      "VERIFIED_RESEARCH",
    ],
  };
}

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
  "External Evidence V1",
  () => {
    it(
      "derives stable source records from immutable SERP evidence",
      () => {
        const plan = {
          serpSnapshot: {
            organic: [
              {
                url:
                  "https://www.consumerfinance.gov/ask-cfpb/example/",

                domain:
                  "www.consumerfinance.gov",

                title:
                  "Credit monitoring",

                description:
                  "A credit monitoring service can alert you to changes.",
              },
            ],
          },

          searchFeatures: {
            aiOverviewReferences: [
              {
                url:
                  "https://www.consumerfinance.gov/ask-cfpb/example/",

                domain:
                  "www.consumerfinance.gov",

                title:
                  "Credit monitoring",
              },

              {
                url:
                  "https://www.example.com/reference",

                domain:
                  "example.com",

                title:
                  "Reference only",
              },
            ],
          },
        };

        const first =
          extractExternalEvidenceSources(
            plan
          );

        const second =
          extractExternalEvidenceSources(
            plan
          );

        expect(
          first
        ).toHaveLength(
          2
        );

        expect(
          first[0]?.id
        ).toBe(
          second[0]?.id
        );

        expect(
          first[0]
            ?.evidenceLevel
        ).toBe(
          "SEARCH_SNIPPET"
        );

        expect(
          first[0]
            ?.discoveredBy
        ).toContain(
          "AI_OVERVIEW_REFERENCE"
        );

        expect(
          first[1]
            ?.evidenceLevel
        ).toBe(
          "REFERENCE_ONLY"
        );
      }
    );

    it(
      "embeds provenance into future immutable plan snapshots",
      () => {
        const plan =
          withExternalEvidenceSources({
            serpSnapshot: {
              organic: [
                {
                  url:
                    "https://example.com/a",

                  domain:
                    "example.com",

                  title:
                    "Example",

                  description:
                    "Example search snippet.",
                },
              ],
            },
          });

        expect(
          plan.externalEvidenceVersion
        ).toBe(
          EXTERNAL_EVIDENCE_VERSION
        );

        expect(
          plan.externalEvidenceSources
        ).toHaveLength(
          1
        );
      }
    );

    it(
      "does not allow search snippets to authorize sensitive claims",
      () => {
        const sources =
          extractExternalEvidenceSources({
            serpSnapshot: {
              organic: [
                {
                  url:
                    "https://www.consumerfinance.gov/example",

                  domain:
                    "consumerfinance.gov",

                  title:
                    "FCRA",

                  description:
                    "Under the Fair Credit Reporting Act, a permissible purpose is required.",
                },
              ],
            },
          });

        const support =
          findExternalEvidenceSupport({
            sentence:
              "Under the Fair Credit Reporting Act, a permissible purpose is required.",

            code:
              "EXTERNAL_LEGAL_REQUIRES_EVIDENCE",

            sources,
          });

        expect(
          support.supported
        ).toBe(
          false
        );
      }
    );

    it(
      "allows a legal claim only from a verified government excerpt",
      () => {
        const source =
          verifiedSource({
            excerpt:
              "Under the Fair Credit Reporting Act, a permissible purpose is required before obtaining a consumer report.",
          });

        const support =
          findExternalEvidenceSupport({
            sentence:
              "Under the Fair Credit Reporting Act, a permissible purpose is required before obtaining a consumer report.",

            code:
              "EXTERNAL_LEGAL_REQUIRES_EVIDENCE",

            sources: [
              source,
            ],
          });

        expect(
          support.supported
        ).toBe(
          true
        );

        expect(
          support.sourceId
        ).toBe(
          source.id
        );
      }
    );

    it(
      "requires exact monetary values for price support",
      () => {
        const source =
          verifiedSource({
            url:
              "https://example.com/pricing",

            excerpt:
              "The service costs between $10 and $30 per month.",
          });

        expect(
          findExternalEvidenceSupport({
            sentence:
              "The service costs between $10 and $30 per month.",

            code:
              "EXTERNAL_PRICE_REQUIRES_EVIDENCE",

            sources: [
              source,
            ],
          }).supported
        ).toBe(
          true
        );

        expect(
          findExternalEvidenceSupport({
            sentence:
              "The service costs between $20 and $50 per month.",

            code:
              "EXTERNAL_PRICE_REQUIRES_EVIDENCE",

            sources: [
              source,
            ],
          }).supported
        ).toBe(
          false
        );
      }
    );

    it(
      "does not treat a question heading as a ranking claim",
      () => {
        const findings =
          auditExternalEvidenceClaims(
            article(
              "## What Are the Top 3 Credit Monitoring Services?"
            )
          );

        expect(
          findings
        ).toEqual(
          []
        );
      }
    );

    it(
      "removes an external legal blocker when verified source evidence exists",
      () => {
        const source =
          verifiedSource({
            excerpt:
              "Under the Fair Credit Reporting Act, a permissible purpose is required before obtaining a consumer report.",
          });

        const findings =
          auditExternalEvidenceClaims(
            article(
              "Under the Fair Credit Reporting Act, a permissible purpose is required before obtaining a consumer report."
            ),
            [
              source,
            ]
          );

        expect(
          findings
        ).toEqual(
          []
        );
      }
    );
  }
);
