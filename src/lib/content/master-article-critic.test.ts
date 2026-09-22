import {
  describe,
  expect,
  it,
} from "vitest";

import {
  MASTER_ARTICLE_CRITIC_IDS,
  aggregateMasterArticleCriticSuiteV1,
  assertMasterArticleCriticSuitePassed,
  createMasterArticleCriticFindingV1,
  finalizeMasterArticleCriticResultV1,
  type MasterArticleCriticId,
} from "./master-article-critic";


function pass(
  criticId:
    MasterArticleCriticId
) {
  return finalizeMasterArticleCriticResultV1({
    criticId,

    findings:
      [],

    modelName:
      null,
  });
}


function completePassResults() {
  return MASTER_ARTICLE_CRITIC_IDS
    .map(
      (
        criticId
      ) =>
        pass(
          criticId
        )
    );
}


describe(
  "Master Article Multi-Critic V1",
  () => {
    it(
      "has the exact required critic roster",
      () => {
        expect(
          MASTER_ARTICLE_CRITIC_IDS
        ).toEqual([
          "INTENT",
          "COVERAGE",
          "EVIDENCE_YMYL",
          "ORIGINALITY",
          "EDITORIAL",
          "SEMANTIC_DRIFT",
          "CANNIBALIZATION",
          "INTERNAL_LINKS",
          "TECHNICAL_SEO",
        ]);
      }
    );


    it(
      "passes only when every required critic is present and clean",
      () => {
        const suite =
          aggregateMasterArticleCriticSuiteV1({
            results:
              completePassResults(),
          });

        expect(
          suite.status
        ).toBe(
          "PASS"
        );

        expect(
          suite.counts.critics
        ).toBe(
          9
        );

        expect(
          suite.counts.passedCritics
        ).toBe(
          9
        );

        expect(
          suite.counts.findings
        ).toBe(
          0
        );
      }
    );


    it(
      "aggregates WARN without inventing an overall score",
      () => {
        const finding =
          createMasterArticleCriticFindingV1({
            criticId:
              "EDITORIAL",

            code:
              "LONG_PARAGRAPH",

            severity:
              "WARN",

            location: {
              scope:
                "SECTION",

              sectionIndex:
                2,

              sectionNumber:
                3,

              heading:
                "How Monitoring Works",
            },

            message:
              "Paragraph density is higher than desired.",

            recommendation:
              "Split the paragraph without changing claims.",

            repairScope:
              "SECTION",
          });


        const results =
          completePassResults()
            .map(
              (result) =>
                result.criticId ===
                "EDITORIAL"
                  ? finalizeMasterArticleCriticResultV1({
                      criticId:
                        "EDITORIAL",

                      findings: [
                        finding,
                      ],

                      modelName:
                        "critic-model",
                    })
                  : result
            );


        const suite =
          aggregateMasterArticleCriticSuiteV1({
            results,
          });


        expect(
          suite.status
        ).toBe(
          "WARN"
        );

        expect(
          suite.counts.warnedCritics
        ).toBe(
          1
        );

        expect(
          suite.counts.sectionRepairableFindings
        ).toBe(
          1
        );

        expect(
          "score" in suite
        ).toBe(
          false
        );
      }
    );


    it(
      "BLOCK dominates the suite",
      () => {
        const finding =
          createMasterArticleCriticFindingV1({
            criticId:
              "EVIDENCE_YMYL",

            code:
              "UNSUPPORTED_FINANCIAL_ASSERTION",

            severity:
              "BLOCK",

            location: {
              scope:
                "SECTION",

              sectionIndex:
                1,

              sectionNumber:
                2,

              heading:
                "Credit Monitoring Limits",
            },

            message:
              "A financial assertion exceeds approved evidence.",

            recommendation:
              "Remove or narrow the unsupported assertion.",

            repairScope:
              "SECTION",

            evidence: {
              claimIds: [
                "claim-7",
              ],

              evidenceIds:
                [],

              queryNodeIds:
                [],

              sourceIds:
                [],
            },
          });


        const results =
          completePassResults()
            .map(
              (result) =>
                result.criticId ===
                "EVIDENCE_YMYL"
                  ? finalizeMasterArticleCriticResultV1({
                      criticId:
                        "EVIDENCE_YMYL",

                      findings: [
                        finding,
                      ],

                      modelName:
                        "critic-model",
                    })
                  : result
            );


        const suite =
          aggregateMasterArticleCriticSuiteV1({
            results,
          });


        expect(
          suite.status
        ).toBe(
          "BLOCK"
        );

        expect(
          suite.counts.blockedCritics
        ).toBe(
          1
        );

        expect(
          suite.counts.blockFindings
        ).toBe(
          1
        );

        expect(
          () =>
            assertMasterArticleCriticSuitePassed(
              suite
            )
        ).toThrow(
          "MASTER_ARTICLE_CRITIC_SUITE_BLOCKED:EVIDENCE_YMYL:UNSUPPORTED_FINANCIAL_ASSERTION:SECTION_1"
        );
      }
    );


    it(
      "fails closed when any required critic is missing",
      () => {
        const incomplete =
          completePassResults()
            .filter(
              (result) =>
                result.criticId !==
                "TECHNICAL_SEO"
            );


        expect(
          () =>
            aggregateMasterArticleCriticSuiteV1({
              results:
                incomplete,
            })
        ).toThrow(
          "MASTER_CRITIC_SUITE_INCOMPLETE:TECHNICAL_SEO"
        );
      }
    );


    it(
      "rejects duplicate critics",
      () => {
        const results = [
          ...completePassResults(),
          pass(
            "INTENT"
          ),
        ];


        expect(
          () =>
            aggregateMasterArticleCriticSuiteV1({
              results,
            })
        ).toThrow(
          "MASTER_CRITIC_DUPLICATE:INTENT"
        );
      }
    );


    it(
      "does not trust a forged result status",
      () => {
        const finding =
          createMasterArticleCriticFindingV1({
            criticId:
              "COVERAGE",

            code:
              "MISSING_EXPECTED_QUERY",

            severity:
              "BLOCK",

            location: {
              scope:
                "ARTICLE",
            },

            message:
              "Expected query coverage is missing.",

            recommendation:
              "Resolve coverage before publication.",

            repairScope:
              "NONE",
          });


        const forged = {
          ...finalizeMasterArticleCriticResultV1({
            criticId:
              "COVERAGE",

            findings: [
              finding,
            ],
          }),

          status:
            "PASS" as const,
        };


        const results =
          completePassResults()
            .map(
              (result) =>
                result.criticId ===
                "COVERAGE"
                  ? forged
                  : result
            );


        expect(
          () =>
            aggregateMasterArticleCriticSuiteV1({
              results,
            })
        ).toThrow(
          "MASTER_CRITIC_STATUS_MISMATCH:COVERAGE"
        );
      }
    );


    it(
      "requires SECTION repair findings to identify one exact section",
      () => {
        expect(
          () =>
            createMasterArticleCriticFindingV1({
              criticId:
                "EDITORIAL",

              code:
                "REPAIR_ME",

              severity:
                "WARN",

              location: {
                scope:
                  "ARTICLE",
              },

              message:
                "Issue.",

              recommendation:
                "Fix only the affected section.",

              repairScope:
                "SECTION",
            })
        ).toThrow(
          "MASTER_CRITIC_SECTION_REPAIR_REQUIRES_SECTION_LOCATION"
        );
      }
    );


    it(
      "preserves explicit claim/evidence/query/source provenance",
      () => {
        const finding =
          createMasterArticleCriticFindingV1({
            criticId:
              "SEMANTIC_DRIFT",

            code:
              "SECTION_DRIFT",

            severity:
              "WARN",

            location: {
              scope:
                "SECTION",

              sectionIndex:
                0,

              sectionNumber:
                1,

              heading:
                "Overview",
            },

            message:
              "Section wording drifts beyond its assigned claim.",

            recommendation:
              "Narrow the affected statement.",

            repairScope:
              "SECTION",

            evidence: {
              claimIds: [
                "claim-1",
                "claim-1",
              ],

              evidenceIds: [
                "ev-1",
              ],

              queryNodeIds: [
                "query-1",
              ],

              sourceIds: [
                "source-1",
              ],
            },
          });


        expect(
          finding.evidence
            .claimIds
        ).toEqual([
          "claim-1",
        ]);

        expect(
          finding.evidence
            .evidenceIds
        ).toEqual([
          "ev-1",
        ]);

        expect(
          finding.evidence
            .queryNodeIds
        ).toEqual([
          "query-1",
        ]);

        expect(
          finding.evidence
            .sourceIds
        ).toEqual([
          "source-1",
        ]);
      }
    );


    it(
      "freezes critic results and the complete suite",
      () => {
        const result =
          pass(
            "INTENT"
          );

        const suite =
          aggregateMasterArticleCriticSuiteV1({
            results:
              completePassResults(),
          });


        expect(
          Object.isFrozen(
            result
          )
        ).toBe(
          true
        );

        expect(
          Object.isFrozen(
            result.findings
          )
        ).toBe(
          true
        );

        expect(
          Object.isFrozen(
            suite
          )
        ).toBe(
          true
        );

        expect(
          Object.isFrozen(
            suite.results
          )
        ).toBe(
          true
        );

        expect(
          Object.isFrozen(
            suite.findings
          )
        ).toBe(
          true
        );

        expect(
          Object.isFrozen(
            suite.counts
          )
        ).toBe(
          true
        );
      }
    );
  }
);
