import {
  countExactPhrase,
} from "./article-analyzer";

import type {
  ArticleGenerationContractV1,
  SectionGenerationContractV1,
} from "./article-generation-contract";

import type {
  MasterWriterRunV1,
} from "./master-writer-orchestrator";

import {
  createMasterArticleCriticFindingV1,
  finalizeMasterArticleCriticResultV1,
  type MasterArticleCriticEvidenceV1,
  type MasterArticleCriticFindingV1,
  type MasterArticleCriticResultV1,
} from "./master-article-critic";


export const DETERMINISTIC_MASTER_CRITIC_IDS = [
  "INTENT",
  "COVERAGE",
  "EVIDENCE_YMYL",
  "INTERNAL_LINKS",
  "TECHNICAL_SEO",
] as const;


function unique(
  values:
    readonly string[]
): readonly string[] {
  return Array.from(
    new Set(
      values
        .map(
          (value) =>
            value.trim()
        )
        .filter(
          Boolean
        )
    )
  );
}


function sectionLocation(
  contract:
    Readonly<SectionGenerationContractV1>
) {
  return {
    scope:
      "SECTION" as const,

    sectionIndex:
      contract.sectionIndex,

    sectionNumber:
      contract.sectionNumber,

    heading:
      contract.blueprint
        .heading,
  };
}


function emptyEvidence():
MasterArticleCriticEvidenceV1 {
  return {
    claimIds:
      [],

    evidenceIds:
      [],

    queryNodeIds:
      [],

    sourceIds:
      [],
  };
}


function sourceIdsForEvidence({
  contract,
  evidenceIds,
}: {
  contract:
    Readonly<SectionGenerationContractV1>;

  evidenceIds:
    readonly string[];
}): readonly string[] {
  const wanted =
    new Set(
      evidenceIds
    );

  return unique(
    contract.evidenceGraph
      .claimEvidence
      .filter(
        (evidence) =>
          wanted.has(
            evidence.id
          )
      )
      .map(
        (evidence) =>
          evidence.sourceId
      )
  );
}


function result(
  criticId:
    "INTENT" |
    "COVERAGE" |
    "EVIDENCE_YMYL" |
    "INTERNAL_LINKS" |
    "TECHNICAL_SEO",

  findings:
    readonly Readonly<
      MasterArticleCriticFindingV1
    >[]
):
Readonly<MasterArticleCriticResultV1> {
  return finalizeMasterArticleCriticResultV1({
    criticId,

    findings,

    modelName:
      null,
  });
}


export function runDeterministicIntentCriticV1({
  contract,
  run,
}: {
  contract:
    Readonly<ArticleGenerationContractV1>;

  run:
    Readonly<MasterWriterRunV1>;
}): Readonly<
  MasterArticleCriticResultV1
> {
  const findings:
    Readonly<
      MasterArticleCriticFindingV1
    >[] =
      [];


  if (
    contract.sectionContracts
      .length !==
    run.sections.length
  ) {
    findings.push(
      createMasterArticleCriticFindingV1({
        criticId:
          "INTENT",

        code:
          "SECTION_CARDINALITY_DRIFT",

        severity:
          "BLOCK",

        location: {
          scope:
            "ARTICLE",
        },

        message:
          "Generated article section count no longer matches the approved article contract.",

        recommendation:
          "Regenerate from the approved ArticleGenerationContract without adding or removing sections.",

        repairScope:
          "NONE",

        evidence:
          emptyEvidence(),
      })
    );
  }


  if (
    !contract.h1Mission
      .trim()
  ) {
    findings.push(
      createMasterArticleCriticFindingV1({
        criticId:
          "INTENT",

        code:
          "H1_MISSION_MISSING",

        severity:
          "BLOCK",

        location: {
          scope:
            "ARTICLE",
        },

        message:
          "The approved article contract has no H1 mission.",

        recommendation:
          "Do not publish until the article mission is explicit.",

        repairScope:
          "NONE",
      })
    );
  }


  contract.sectionContracts
    .forEach(
      (
        sectionContract,
        index
      ) => {
        const generated =
          run.sections[
            index
          ];

        if (!generated) {
          return;
        }


        if (
          generated.heading !==
          sectionContract
            .blueprint
            .heading
        ) {
          findings.push(
            createMasterArticleCriticFindingV1({
              criticId:
                "INTENT",

              code:
                "CANONICAL_SECTION_HEADING_DRIFT",

              severity:
                "BLOCK",

              location:
                sectionLocation(
                  sectionContract
                ),

              message:
                "Generated section heading differs from the approved canonical section heading.",

              recommendation:
                "Restore the exact approved section heading.",

              repairScope:
                "NONE",
            })
          );
        }


        if (
          !generated
            .bodyMarkdown
            .trim()
        ) {
          findings.push(
            createMasterArticleCriticFindingV1({
              criticId:
                "INTENT",

              code:
                "EMPTY_SECTION",

              severity:
                "BLOCK",

              location:
                sectionLocation(
                  sectionContract
                ),

              message:
                "An approved section has no reader-facing content.",

              recommendation:
                "Regenerate only this section from its approved section contract.",

              repairScope:
                "SECTION",
            })
          );
        }
      }
    );


  return result(
    "INTENT",
    findings
  );
}


export function runDeterministicCoverageCriticV1({
  contract,
  run,
  rankReadyKeywords,
}: {
  contract:
    Readonly<ArticleGenerationContractV1>;

  run:
    Readonly<MasterWriterRunV1>;

  rankReadyKeywords?:
    readonly string[];
}): Readonly<
  MasterArticleCriticResultV1
> {
  const findings:
    Readonly<
      MasterArticleCriticFindingV1
    >[] =
      [];


  contract.sectionContracts
    .forEach(
      (
        sectionContract,
        index
      ) => {
        const generated =
          run.sections[
            index
          ];

        if (!generated) {
          return;
        }


        const expected =
          unique(
            sectionContract
              .blueprint
              .queryNodeIds ??
            []
          );

        const covered =
          unique(
            generated
              .coveredQueryNodeIds
          );

        const expectedSet =
          new Set(
            expected
          );

        const coveredSet =
          new Set(
            covered
          );


        const outside =
          covered.filter(
            (queryNodeId) =>
              !expectedSet.has(
                queryNodeId
              )
          );


        if (
          outside.length >
          0
        ) {
          findings.push(
            createMasterArticleCriticFindingV1({
              criticId:
                "COVERAGE",

              code:
                "OUT_OF_CONTRACT_QUERY_COVERAGE",

              severity:
                "BLOCK",

              location:
                sectionLocation(
                  sectionContract
                ),

              message:
                `Section declares query coverage outside its approved contract: ${outside.join(", ")}.`,

              recommendation:
                "Remove out-of-contract query targeting or regenerate only this section.",

              repairScope:
                "SECTION",

              evidence: {
                claimIds:
                  [],

                evidenceIds:
                  [],

                queryNodeIds:
                  outside,

                sourceIds:
                  [],
              },
            })
          );
        }


        const missing =
          expected.filter(
            (queryNodeId) =>
              !coveredSet.has(
                queryNodeId
              )
          );


        if (
          expected.length >
            0 &&
          covered.filter(
            (queryNodeId) =>
              expectedSet.has(
                queryNodeId
              )
          ).length ===
            0
        ) {
          findings.push(
            createMasterArticleCriticFindingV1({
              criticId:
                "COVERAGE",

              code:
                "SECTION_EXPECTED_COVERAGE_MISSING",

              severity:
                "BLOCK",

              location:
                sectionLocation(
                  sectionContract
                ),

              message:
                "Section covers none of its assigned query nodes.",

              recommendation:
                "Repair only this section so it fulfills its approved query coverage job.",

              repairScope:
                "SECTION",

              evidence: {
                claimIds:
                  [],

                evidenceIds:
                  [],

                queryNodeIds:
                  expected,

                sourceIds:
                  [],
              },
            })
          );

          return;
        }


        if (
          missing.length >
          0
        ) {
          findings.push(
            createMasterArticleCriticFindingV1({
              criticId:
                "COVERAGE",

              code:
                "SECTION_PARTIAL_QUERY_COVERAGE",

              severity:
                "WARN",

              location:
                sectionLocation(
                  sectionContract
                ),

              message:
                `Section does not declare coverage of all assigned query nodes: ${missing.join(", ")}.`,

              recommendation:
                "Review whether the missing query nodes require a targeted section repair.",

              repairScope:
                "SECTION",

              evidence: {
                claimIds:
                  [],

                evidenceIds:
                  [],

                queryNodeIds:
                  missing,

                sourceIds:
                  [],
              },
            })
          );
        }
      }
    );



  /*
   * RANK_READY_KEYWORD_EXECUTION_V1
   *
   * A planned keyword must occur naturally at least once in
   * reader-facing BODY PROSE.
   *
   * H1/H2/H3-only occurrence does not count.
   *
   * This is deliberately NOT a density rule.
   */
  const rankReadyProse =
    run.article
      .bodyMarkdown
      .split(
        /\r?\n/
      )
      .filter(
        (line) =>
          !/^#{1,6}\s+/.test(
            line.trim()
          )
      )
      .join(
        "\n"
      );


  const rankReadySeen =
    new Set<string>();


  for (
    const rawKeyword
    of rankReadyKeywords ??
      []
  ) {
    const keyword =
      rawKeyword.trim();

    const dedupeKey =
      keyword
        .toLocaleLowerCase(
          "en-US"
        );

    if (
      keyword.length ===
        0 ||
      rankReadySeen.has(
        dedupeKey
      )
    ) {
      continue;
    }


    rankReadySeen.add(
      dedupeKey
    );


    if (
      countExactPhrase(
        rankReadyProse,
        keyword
      ) >
      0
    ) {
      continue;
    }


    /*
     * Localize the repair to the most relevant EXISTING section.
     *
     * Never create a heading or section merely for a keyword.
     */
    const keywordTokens =
      dedupeKey
        .split(
          /[^a-z0-9]+/
        )
        .filter(
          Boolean
        );


    let targetSection =
      contract
        .sectionContracts[
          0
        ] ??
      null;


    let targetScore =
      -1;


    for (
      const section
      of contract
        .sectionContracts
    ) {
      const blueprint =
        section.blueprint as
          unknown as
          Record<
            string,
            unknown
          >;


      const sectionRecord =
        section as
          unknown as
          Record<
            string,
            unknown
          >;


      const mission =
        typeof blueprint
          .mission ===
        "string"
          ? blueprint
              .mission
          : "";


      const planningText =
        [
          section
            .blueprint
            .heading,

          mission,

          JSON.stringify(
            sectionRecord
              .executionPlanAuthority ??
            {}
          ),
        ].join(
          "\n"
        );


      const planningLower =
        planningText
          .toLocaleLowerCase(
            "en-US"
          );


      const score =
        keywordTokens
          .reduce(
            (
              total,
              token
            ) =>
              total +
              (
                planningLower
                  .includes(
                    token
                  )
                  ? 1
                  : 0
              ),
            0
          ) +
        (
          countExactPhrase(
            planningText,
            keyword
          ) >
          0
            ? 100
            : 0
        );


      if (
        score >
        targetScore
      ) {
        targetSection =
          section;

        targetScore =
          score;
      }
    }


    if (!targetSection) {
      continue;
    }


    findings.push(
      createMasterArticleCriticFindingV1({
        criticId:
          "COVERAGE",

        code:
          "RANK_READY_PLANNED_KEYWORD_MISSING",

        severity:
          "BLOCK",

        location:
          sectionLocation(
            targetSection
          ),

        message:
          `Production-planned keyword "${keyword}" is missing from reader-facing article prose.`,

        recommendation:
          `Integrate "${keyword}" naturally once inside this existing section's information job. Do not add a section, do not pad, and do not repeat it for density.`,

        repairScope:
          "SECTION",

        evidence: {
          claimIds:
            [],

          evidenceIds:
            [],

          queryNodeIds:
            [],

          sourceIds:
            [],
        },
      })
    );
  }


  return result(
    "COVERAGE",
    findings
  );
}


export function runDeterministicEvidenceYmylCriticV1({
  contract,
  run,
}: {
  contract:
    Readonly<ArticleGenerationContractV1>;

  run:
    Readonly<MasterWriterRunV1>;
}): Readonly<
  MasterArticleCriticResultV1
> {
  const findings:
    Readonly<
      MasterArticleCriticFindingV1
    >[] =
      [];


  contract.sectionContracts
    .forEach(
      (
        sectionContract,
        index
      ) => {
        const reconciliation =
          run.reconciliations[
            index
          ];

        const semantic =
          run.semanticVerifications[
            index
          ];


        if (!reconciliation) {
          findings.push(
            createMasterArticleCriticFindingV1({
              criticId:
                "EVIDENCE_YMYL",

              code:
                "RECONCILIATION_ARTIFACT_MISSING",

              severity:
                "BLOCK",

              location:
                sectionLocation(
                  sectionContract
                ),

              message:
                "Section has no deterministic claim/evidence reconciliation artifact.",

              recommendation:
                "Do not publish; rerun the master writer verification pipeline.",

              repairScope:
                "NONE",
            })
          );

          return;
        }


        if (!semantic) {
          findings.push(
            createMasterArticleCriticFindingV1({
              criticId:
                "EVIDENCE_YMYL",

              code:
                "SEMANTIC_VERIFICATION_ARTIFACT_MISSING",

              severity:
                "BLOCK",

              location:
                sectionLocation(
                  sectionContract
                ),

              message:
                "Section has no semantic prose verification artifact.",

              recommendation:
                "Do not publish; rerun semantic verification.",

              repairScope:
                "NONE",
            })
          );

          return;
        }


        if (
          reconciliation.status ===
          "BLOCK"
        ) {
          findings.push(
            createMasterArticleCriticFindingV1({
              criticId:
                "EVIDENCE_YMYL",

              code:
                "RECONCILIATION_BLOCK_PRESENT",

              severity:
                "BLOCK",

              location:
                sectionLocation(
                  sectionContract
                ),

              message:
                "A section entering critic review still contains a blocking deterministic evidence finding.",

              recommendation:
                "Fail closed and repair the affected section only.",

              repairScope:
                "SECTION",
            })
          );
        }


        if (
          semantic.status ===
          "BLOCK"
        ) {
          findings.push(
            createMasterArticleCriticFindingV1({
              criticId:
                "EVIDENCE_YMYL",

              code:
                "SEMANTIC_BLOCK_PRESENT",

              severity:
                "BLOCK",

              location:
                sectionLocation(
                  sectionContract
                ),

              message:
                "A section entering critic review still contains unsupported or contradicted prose.",

              recommendation:
                "Fail closed and repair the affected section only.",

              repairScope:
                "SECTION",
            })
          );
        }


        if (
          reconciliation.status ===
          "WARN"
        ) {
          const warningClaimIds =
            unique(
              reconciliation
                .findings
                .filter(
                  (finding) =>
                    finding.severity ===
                    "WARN"
                )
                .map(
                  (finding) =>
                    finding.claimId ??
                    ""
                )
            );

          const warningEvidenceIds =
            unique(
              reconciliation
                .findings
                .filter(
                  (finding) =>
                    finding.severity ===
                    "WARN"
                )
                .map(
                  (finding) =>
                    finding.evidenceId ??
                    ""
                )
            );

          findings.push(
            createMasterArticleCriticFindingV1({
              criticId:
                "EVIDENCE_YMYL",

              code:
                "CLAIM_EVIDENCE_WARNING",

              severity:
                "WARN",

              location:
                sectionLocation(
                  sectionContract
                ),

              message:
                "Section passed publication blocking rules but retains claim/evidence warnings.",

              recommendation:
                "Review or narrow the affected statements before publication where practical.",

              repairScope:
                "SECTION",

              evidence: {
                claimIds:
                  warningClaimIds,

                evidenceIds:
                  warningEvidenceIds,

                queryNodeIds:
                  [],

                sourceIds:
                  sourceIdsForEvidence({
                    contract:
                      sectionContract,

                    evidenceIds:
                      warningEvidenceIds,
                  }),
              },
            })
          );
        }


        if (
          semantic.status ===
          "WARN"
        ) {
          const narrower =
            semantic.units
              .filter(
                (unit) =>
                  unit.classification ===
                  "NARROWER"
              );

          findings.push(
            createMasterArticleCriticFindingV1({
              criticId:
                "EVIDENCE_YMYL",

              code:
                "SEMANTIC_NARROWER_THAN_LEDGER",

              severity:
                "WARN",

              location:
                sectionLocation(
                  sectionContract
                ),

              message:
                "One or more factual prose units are narrower than their approved claims.",

              recommendation:
                "Preserve the cautious wording unless broader wording is explicitly supported.",

              repairScope:
                "SECTION",

              evidence: {
                claimIds:
                  unique(
                    narrower.map(
                      (unit) =>
                        unit.matchedClaimId ??
                        ""
                    )
                  ),

                evidenceIds:
                  unique(
                    narrower.flatMap(
                      (unit) =>
                        unit.evidenceIds
                    )
                  ),

                queryNodeIds:
                  [],

                sourceIds:
                  sourceIdsForEvidence({
                    contract:
                      sectionContract,

                    evidenceIds:
                      unique(
                        narrower.flatMap(
                          (unit) =>
                            unit.evidenceIds
                        )
                      ),
                  }),
              },
            })
          );
        }


        const supportByClaim =
          new Map(
            reconciliation
              .verifiedSupport
              .map(
                (support) =>
                  [
                    support.claimId,
                    support,
                  ] as const
              )
          );


        for (
          const requiredClaimId
          of sectionContract
            .blueprint
            .requiredClaims ??
          []
        ) {
          const claim =
            sectionContract
              .claimLedger
              .claims
              .find(
                (candidate) =>
                  candidate.id ===
                  requiredClaimId
              );


          if (!claim) {
            findings.push(
              createMasterArticleCriticFindingV1({
                criticId:
                  "EVIDENCE_YMYL",

                code:
                  "REQUIRED_CLAIM_MISSING_FROM_LEDGER",

                severity:
                  "BLOCK",

                location:
                  sectionLocation(
                    sectionContract
                  ),

                message:
                  `Required claim ${requiredClaimId} is absent from the authoritative Claim Ledger.`,

                recommendation:
                  "Do not publish until the Research Pack is rebuilt correctly.",

                repairScope:
                  "NONE",

                evidence: {
                  claimIds: [
                    requiredClaimId,
                  ],

                  evidenceIds:
                    [],

                  queryNodeIds:
                    [],

                  sourceIds:
                    [],
                },
              })
            );

            continue;
          }


          if (
            claim.status ===
              "CONTRADICTED" ||
            claim.status ===
              "JURISDICTION_MISMATCH" ||
            (
              claim.status ===
                "UNSUPPORTED" &&
              claim.risk ===
                "HIGH"
            ) ||
            (
              claim.status ===
                "STALE" &&
              (
                claim.category ===
                  "FINANCIAL" ||
                claim.category ===
                  "LEGAL"
              )
            )
          ) {
            findings.push(
              createMasterArticleCriticFindingV1({
                criticId:
                  "EVIDENCE_YMYL",

                code:
                  "BLOCKING_REQUIRED_CLAIM_STATUS",

                severity:
                  "BLOCK",

                location:
                  sectionLocation(
                    sectionContract
                  ),

                message:
                  `Required claim ${claim.id} has blocking status ${claim.status}.`,

                recommendation:
                  "Remove the claim from publication scope or rebuild authoritative evidence.",

                repairScope:
                  "NONE",

                evidence: {
                  claimIds: [
                    claim.id,
                  ],

                  evidenceIds:
                    claim.evidenceIds,

                  queryNodeIds:
                    [],

                  sourceIds:
                    sourceIdsForEvidence({
                      contract:
                        sectionContract,

                      evidenceIds:
                        claim.evidenceIds,
                    }),
                },
              })
            );
          }


          if (
            claim.status ===
              "VERIFIED" &&
            !supportByClaim.has(
              claim.id
            )
          ) {
            findings.push(
              createMasterArticleCriticFindingV1({
                criticId:
                  "EVIDENCE_YMYL",

                code:
                  "VERIFIED_CLAIM_WITHOUT_RECONCILED_SUPPORT",

                severity:
                  "BLOCK",

                location:
                  sectionLocation(
                    sectionContract
                  ),

                message:
                  `Verified claim ${claim.id} has no accepted section-level verified support provenance.`,

                recommendation:
                  "Fail closed and repair only the affected section.",

                repairScope:
                  "SECTION",

                evidence: {
                  claimIds: [
                    claim.id,
                  ],

                  evidenceIds:
                    claim.evidenceIds,

                  queryNodeIds:
                    [],

                  sourceIds:
                    sourceIdsForEvidence({
                      contract:
                        sectionContract,

                      evidenceIds:
                        claim.evidenceIds,
                    }),
                },
              })
            );
          }
        }
      }
    );


  return result(
    "EVIDENCE_YMYL",
    findings
  );
}


export function runDeterministicInternalLinksCriticV1({
  contract,
  run,
}: {
  contract:
    Readonly<ArticleGenerationContractV1>;

  run:
    Readonly<MasterWriterRunV1>;
}): Readonly<
  MasterArticleCriticResultV1
> {
  const findings:
    Readonly<
      MasterArticleCriticFindingV1
    >[] =
      [];


  contract.sectionContracts
    .forEach(
      (
        sectionContract,
        index
      ) => {
        const generated =
          run.sections[
            index
          ];

        if (!generated) {
          return;
        }


        const planned =
          unique(
            sectionContract
              .blueprint
              .internalLinks ??
            []
          );

        const used =
          unique(
            generated
              .usedInternalLinks
          );


        const plannedSet =
          new Set(
            planned
          );

        const usedSet =
          new Set(
            used
          );


        const outside =
          used.filter(
            (link) =>
              !plannedSet.has(
                link
              )
          );


        if (
          outside.length >
          0
        ) {
          findings.push(
            createMasterArticleCriticFindingV1({
              criticId:
                "INTERNAL_LINKS",

              code:
                "UNAPPROVED_INTERNAL_LINK",

              severity:
                "BLOCK",

              location:
                sectionLocation(
                  sectionContract
                ),

              message:
                `Section uses internal links not assigned by its contract: ${outside.join(", ")}.`,

              recommendation:
                "Remove unapproved links or regenerate this section from the approved internal-link plan.",

              repairScope:
                "SECTION",
            })
          );
        }


        const missing =
          planned.filter(
            (link) =>
              !usedSet.has(
                link
              )
          );


        if (
          missing.length >
          0
        ) {
          findings.push(
            createMasterArticleCriticFindingV1({
              criticId:
                "INTERNAL_LINKS",

              code:
                "PLANNED_INTERNAL_LINK_UNUSED",

              severity:
                "WARN",

              location:
                sectionLocation(
                  sectionContract
                ),

              message:
                `Section did not use all approved internal-link opportunities: ${missing.join(", ")}.`,

              recommendation:
                "Add only the planned links that fit naturally; do not force links into irrelevant prose.",

              repairScope:
                "SECTION",
            })
          );
        }
      }
    );


  return result(
    "INTERNAL_LINKS",
    findings
  );
}


function markdownH1s(
  body:
    string
): readonly string[] {
  return body
    .split(
      /\r?\n/
    )
    .map(
      (line) =>
        line.trim()
    )
    .filter(
      (line) =>
        /^#\s+/.test(
          line
        )
    )
    .map(
      (line) =>
        line.replace(
          /^#\s+/,
          ""
        ).trim()
    );
}


function markdownH2s(
  body:
    string
): readonly string[] {
  return body
    .split(
      /\r?\n/
    )
    .map(
      (line) =>
        line.trim()
    )
    .filter(
      (line) =>
        /^##\s+/.test(
          line
        )
    )
    .map(
      (line) =>
        line.replace(
          /^##\s+/,
          ""
        ).trim()
    );
}


export function runDeterministicTechnicalSeoCriticV1({
  contract,
  run,
}: {
  contract:
    Readonly<ArticleGenerationContractV1>;

  run:
    Readonly<MasterWriterRunV1>;
}): Readonly<
  MasterArticleCriticResultV1
> {
  const findings:
    Readonly<
      MasterArticleCriticFindingV1
    >[] =
      [];


  if (
    !run.article.title
      .trim()
  ) {
    findings.push(
      createMasterArticleCriticFindingV1({
        criticId:
          "TECHNICAL_SEO",

        code:
          "TITLE_MISSING",

        severity:
          "BLOCK",

        location: {
          scope:
            "SHELL",

          field:
            "TITLE",
        },

        message:
          "Generated article title is empty.",

        recommendation:
          "Regenerate the article shell from the approved contract.",

        repairScope:
          "NONE",
      })
    );
  }


  if (
    !run.article
      .metaDescription
      .trim()
  ) {
    findings.push(
      createMasterArticleCriticFindingV1({
        criticId:
          "TECHNICAL_SEO",

        code:
          "META_DESCRIPTION_MISSING",

        severity:
          "BLOCK",

        location: {
          scope:
            "SHELL",

          field:
            "META_DESCRIPTION",
        },

        message:
          "Generated meta description is empty.",

        recommendation:
          "Regenerate the article shell from the approved contract.",

        repairScope:
          "NONE",
      })
    );
  }


  if (
    !run.article.h1
      .trim()
  ) {
    findings.push(
      createMasterArticleCriticFindingV1({
        criticId:
          "TECHNICAL_SEO",

        code:
          "CANONICAL_H1_MISSING",

        severity:
          "BLOCK",

        location: {
          scope:
            "SHELL",

          field:
            "H1",
        },

        message:
          "Canonical article H1 is empty.",

        recommendation:
          "Regenerate the article shell before publication.",

        repairScope:
          "NONE",
      })
    );
  }


  const bodyH1s =
    markdownH1s(
      run.article
        .bodyMarkdown
    );


  if (
    bodyH1s.length >
    0
  ) {
    findings.push(
      createMasterArticleCriticFindingV1({
        criticId:
          "TECHNICAL_SEO",

        code:
          "BODY_H1_PRESENT",

        severity:
          "BLOCK",

        location: {
          scope:
            "ARTICLE",
        },

        message:
          "Article body contains one or more H1 headings even though the canonical H1 is owned by the article shell.",

        recommendation:
          "Remove body-level H1 headings; preserve exactly one canonical article H1.",

        repairScope:
          "NONE",
      })
    );
  }


  const expectedH2s =
    contract.sectionContracts
      .map(
        (section) =>
          section.blueprint
            .heading
            .trim()
      );


  const actualH2s =
    markdownH2s(
      run.article
        .bodyMarkdown
    );


  if (
    JSON.stringify(
      actualH2s
    ) !==
    JSON.stringify(
      expectedH2s
    )
  ) {
    findings.push(
      createMasterArticleCriticFindingV1({
        criticId:
          "TECHNICAL_SEO",

        code:
          "CANONICAL_H2_SEQUENCE_MISMATCH",

        severity:
          "BLOCK",

        location: {
          scope:
            "ARTICLE",
        },

        message:
          "Rendered article H2 sequence differs from the approved section blueprint order.",

        recommendation:
          "Do not publish; deterministic composition must preserve the approved H2 sequence exactly.",

        repairScope:
          "NONE",
      })
    );
  }


  return result(
    "TECHNICAL_SEO",
    findings
  );
}


export function runDeterministicMasterArticleCriticsV1({
  contract,
  run,
  rankReadyKeywords,
}: {
  contract:
    Readonly<ArticleGenerationContractV1>;

  run:
    Readonly<MasterWriterRunV1>;

  rankReadyKeywords?:
    readonly string[];
}): readonly Readonly<
  MasterArticleCriticResultV1
>[] {
  return Object.freeze([
    runDeterministicIntentCriticV1({
      contract,
      run,
    }),

    runDeterministicCoverageCriticV1({
      contract,
      run,

      rankReadyKeywords:
        rankReadyKeywords,
    }),

    runDeterministicEvidenceYmylCriticV1({
      contract,
      run,
    }),

    runDeterministicInternalLinksCriticV1({
      contract,
      run,
    }),

    runDeterministicTechnicalSeoCriticV1({
      contract,
      run,
    }),
  ]);
}
