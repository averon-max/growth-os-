import {
  describe,
  expect,
  it,
} from "vitest";

import {
  normalizeMasterArticleSemanticCriticCandidateV1,
} from "./master-article-semantic-critics";

import {
  readFileSync,
} from "node:fs";


describe(
  "semantic critic reference self-heal V1",
  () => {
    it(
      "removes untrusted critic ids without expanding article authority",
      () => {
        const contract = {
          sectionContracts: [
            {
              claimLedger: {
                claims: [
                  {
                    id:
                      "claim-1",
                  },
                ],
              },

              evidenceGraph: {
                claimEvidence: [
                  {
                    id:
                      "verified-excerpt-real",
                  },
                ],

                sources: [
                  {
                    id:
                      "source-1",
                  },
                ],
              },

              blueprint: {
                queryNodeIds: [
                  "query-1",
                ],
              },
            },
          ],
        };


        const candidate = {
          reviews: [
            {
              reviewId:
                "DEEP_INTENT",

              findings: [
                {
                  code:
                    "TEST",

                  severity:
                    "WARN",

                  location: {
                    scope:
                      "ARTICLE",
                  },

                  message:
                    "test",

                  recommendation:
                    "test",

                  repairScope:
                    "ARTICLE",

                  claimIds: [
                    "claim-1",
                    "fake-claim",
                  ],

                  evidenceIds: [
                    "verified-excerpt-real",
                    "verified-excerpt-fake",
                  ],

                  queryNodeIds: [
                    "query-1",
                    "fake-query",
                  ],

                  sourceIds: [
                    "source-1",
                    "fake-source",
                  ],
                },
              ],
            },
          ],
        };


        const normalized =
          normalizeMasterArticleSemanticCriticCandidateV1({
            contract:
              contract as never,

            candidate:
              candidate as never,
          });


        const finding =
          normalized
            .reviews[0]!
            .findings[0]!;


        expect(
          finding.claimIds
        ).toEqual([
          "claim-1",
        ]);

        expect(
          finding.evidenceIds
        ).toEqual([
          "verified-excerpt-real",
        ]);

        expect(
          finding.queryNodeIds
        ).toEqual([
          "query-1",
        ]);

        expect(
          finding.sourceIds
        ).toEqual([
          "source-1",
        ]);

        expect(
          finding.severity
        ).toBe(
          "WARN"
        );
      }
    );


    it(
      "wires self-heal before strict critic finalization and checkpoints Writer output",
      () => {
        const generator =
          readFileSync(
            new URL(
              "./gemini-generator.ts",
              import.meta.url
            ),
            "utf8"
          );

        const service =
          readFileSync(
            new URL(
              "./service.ts",
              import.meta.url
            ),
            "utf8"
          );


        const reviewStart =
          generator.indexOf(
            "async reviewMasterArticleSemantics("
          );

        const reviewEnd =
          generator.indexOf(
            "async compareSerpReplayPair(",
            reviewStart
          );

        const reviewSource =
          generator.slice(
            reviewStart,
            reviewEnd
          );

        const finalize =
          reviewSource.indexOf(
            "finalizeMasterArticleSemanticCriticRunV1({"
          );

        const normalize =
          reviewSource.indexOf(
            "normalizeMasterArticleSemanticCriticCandidateV1({",
            finalize
          );


        expect(
          reviewStart
        ).toBeGreaterThanOrEqual(
          0
        );

        expect(
          reviewEnd
        ).toBeGreaterThan(
          reviewStart
        );

        expect(
          finalize
        ).toBeGreaterThanOrEqual(
          0
        );

        /*
         * normalize() is intentionally INSIDE finalize({...}),
         * therefore it appears textually AFTER finalize.
         */
        expect(
          normalize
        ).toBeGreaterThan(
          finalize
        );

        expect(
          generator
        ).toContain(
          "normalizeMasterArticleSemanticCriticCandidateV1"
        );

        expect(
          service
        ).toContain(
          "POST_WRITER_ARTICLE_CHECKPOINT_V1"
        );

        expect(
          service
        ).toContain(
          "bodyMarkdown:\n          masterWriterRun\n            .article\n            .bodyMarkdown"
        );
      }
    );
  }
);
