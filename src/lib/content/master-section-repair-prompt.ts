import type {
  SectionRepairInputV1,
} from "./master-section-repair";

import {
  buildSectionScopedAuthorityContextV1,
} from "./master-section-context";


export function buildMasterSectionRepairPrompt(
  input:
    Readonly<SectionRepairInputV1>
): string {
  const {
    contract,
    section,
    reconciliation,
    semanticVerification,
  } =
    input;


  /*
   * SECTION_REPAIR_COMPACT_CONTEXT_V2
   *
   * Local repair does NOT need the complete semantic audit.
   * The original prose is already present below, so serializing
   * every PASS / NOT_A_FACT unit duplicates the same content and
   * can consume the provider request budget.
   *
   * Authority remains fail-closed:
   * - only section-assigned claims
   * - only section-assigned evidence
   * - only sources backing that evidence
   * - only actual BLOCK semantic findings
   * - deterministic reconciliation findings remain visible
   */
  const scopedAuthority =
    buildSectionScopedAuthorityContextV1(
      contract
    );


  const allowedClaimIds =
    new Set([
      ...(
        contract.blueprint
          .requiredClaims ??
        []
      ),

      ...(
        contract.blueprint
          .forbiddenClaims ??
        []
      ),
    ]);


  const assignedEvidenceIds =
    new Set(
      contract.blueprint
        .evidenceIds ??
      []
    );


  const claims =
    contract.claimLedger
      .claims
      .filter(
        (
          claim
        ) =>
          allowedClaimIds.has(
            claim.id
          )
      );


  const evidence =
    contract.evidenceGraph
      .claimEvidence
      .filter(
        (
          item
        ) =>
          assignedEvidenceIds.has(
            item.id
          )
      );


  const sourceIds =
    new Set(
      evidence.map(
        (
          item
        ) =>
          item.sourceId
      )
    );


  const sources =
    contract.evidenceGraph
      .sources
      .filter(
        (
          source
        ) =>
          sourceIds.has(
            source.id
          )
      );


  const blockingSemanticUnits =
    semanticVerification
      ? semanticVerification
          .units
          .filter(
            (
              unit
            ) =>
              unit.classification ===
                "UNSUPPORTED" ||
              unit.classification ===
                "CONTRADICTED"
          )
          .map(
            (
              unit
            ) => ({
              unitId:
                unit.unitId,

              classification:
                unit.classification,

              matchedClaimId:
                unit.matchedClaimId,

              evidenceIds:
                unit.evidenceIds,

              rationale:
                unit.rationale,
            })
          )
      : [];


  const context =
    JSON.stringify({
      sectionAuthority: {
        version:
          scopedAuthority.version,

        sectionIndex:
          contract.sectionIndex,

        sectionNumber:
          contract.sectionNumber,

        totalSections:
          contract.totalSections,

        blueprint:
          contract.blueprint,

        claims,

        evidence,

        sources,

        styleRules:
          contract.styleRules,

        hardRules:
          contract.hardRules,
      },

      originalSection: {
        bodyMarkdown:
          section.bodyMarkdown,

        coveredQueryNodeIds:
          section
            .coveredQueryNodeIds,

        referencedClaimIds:
          section
            .referencedClaimIds,

        referencedEvidenceIds:
          section
            .referencedEvidenceIds,

        usedInternalLinks:
          section
            .usedInternalLinks,

        assetUsed:
          section.assetUsed,
      },

      deterministicReconciliation: {
        status:
          reconciliation.status,

        requiredClaimIds:
          reconciliation
            .requiredClaimIds,

        referencedClaimIds:
          reconciliation
            .referencedClaimIds,

        referencedEvidenceIds:
          reconciliation
            .referencedEvidenceIds,

        findings:
          reconciliation
            .findings,
      },

      semanticVerification:
        semanticVerification
          ? {
              status:
                semanticVerification
                  .status,

              counts:
                semanticVerification
                  .counts,

              blockingUnits:
                blockingSemanticUnits,
            }
          : null,
    });

  const criticFindings =
    input.criticFindings ??
    [];


  const criticFindingsBlock =
    criticFindings.length >
    0
      ? [
          "",
          "FINAL ARTICLE CRITIC FINDINGS FOR THIS SECTION:",
          JSON.stringify(
            criticFindings.map(
              (finding) => ({
                criticId:
                  finding.criticId,

                code:
                  finding.code,

                severity:
                  finding.severity,

                location:
                  finding.location,

                message:
                  finding.message,

                recommendation:
                  finding.recommendation,

                repairScope:
                  finding.repairScope,

                evidence:
                  finding.evidence,
              })
            ),
            null,
            2
          ),
          "",
          "CRITIC REPAIR RULES:",
          "- Repair ONLY this section.",
          "- Resolve the supplied localized critic findings.",
          "- Preserve correct material that is unrelated to those findings.",
          "- Do not change the canonical H2 heading.",
          "- Do not create new query IDs, claim IDs, evidence IDs, source IDs, metrics, facts, or links.",
          "- Critic findings are repair instructions, NOT new factual authority.",
          "- Existing SectionGenerationContract remains authoritative.",
          "- If a finding cannot be solved using the existing contract/evidence authority, remove or narrow the problematic prose rather than inventing support.",
        ]
      : [];


  const competitiveReplayFindings =
    input.competitiveReplayFindings ??
    [];


  const competitiveReplayFindingsBlock =
    competitiveReplayFindings.length >
    0
      ? [
          "",
          "COMPETITIVE SERP REPLAY FINDINGS FOR THIS SECTION:",
          JSON.stringify(
            competitiveReplayFindings,
            null,
            2
          ),
          "",
          "COMPETITIVE REPLAY REPAIR RULES:",
          "- These findings identify competitive weakness only; they are NOT factual authority.",
          "- Repair ONLY this section and only within its existing SectionGenerationContract.",
          "- Use only already-assigned query IDs, claim IDs, evidence IDs, links, and assets.",
          "- Do not copy competitor wording, headings, structure, examples, claims, or style.",
          "- Do not invent facts merely to become stronger than a competitor.",
          "- Do not increase word count or heading count merely because a competitor is longer.",
          "- Improve clarity, coverage, usefulness, synthesis, or supported evidence presentation only when the existing authority permits it.",
          "- If a weakness cannot be solved from existing authority, preserve factual rigor instead of fabricating an improvement.",
        ]
      : [];


  return [
    ...criticFindingsBlock,
    ...competitiveReplayFindingsBlock,

    "You are repairing EXACTLY ONE article section inside a contract-bound publishing system.",
    "",
    "You are NOT rewriting the article.",
    "You are NOT allowed to change any other section.",
    "You are NOT allowed to change the article title, meta description, H1, or this section's canonical H2.",
    "",
    "AUTHORITATIVE INPUT:",
    context,
    "",
    "REPAIR GOAL:",
    "Resolve the supplied reconciliation and/or semantic BLOCK findings while preserving all already-correct useful prose.",
    "",
    "SEMANTIC BLOCK REPAIR PROTOCOL:",
    "1. If semanticVerification contains any unit classified UNSUPPORTED or CONTRADICTED, that unit is a mandatory repair target.",
    "2. Locate the exact reader-facing proposition represented by every blocked semantic unit.",
    "3. If the blocked unit contains a MATERIAL factual proposition that is not supported by an assigned claim plus publication-grade assigned evidence, remove that MATERIAL proposition. Do not delete ordinary grounded explanation merely because it is declarative prose.",
    "4. Do not preserve the same unsupported meaning by paraphrasing it with different words.",
    "5. Do not replace an unsupported MATERIAL proposition with another MATERIAL factual proposition unless that replacement is explicitly supported by the assigned section authority.",
    "6. If a blocked sentence mixes supported and unsupported meaning, keep only the supported portion and delete the unsupported portion.",
    "7. CONTRADICTED meaning must be removed; never soften it into another version of the same contradicted claim.",
    "8. For UNSUPPORTED meaning with no assigned VERIFIED_EXCERPT support, deletion is preferred over speculation.",
    "9. After rewriting, inspect EVERY sentence in bodyMarkdown. Any MATERIAL factual assertion that cannot be traced to the section's assigned claim/evidence authority must be removed or narrowed. Ordinary grounded explanation may remain without a claim ID when it introduces no new material proposition.",
    "10. A successful repair must eliminate the unsupported MATERIAL meaning of every BLOCK unit, not merely change its wording.",
    "11. Before deleting prose, distinguish MATERIAL_FACT from GROUNDED_EXPLANATION using Material Claim Policy V2. Declarative wording alone does not make prose material.",
    "12. A GROUNDED_EXPLANATION may explain, organize, connect, or cautiously synthesize the supplied section mission and authoritative context without an artificial claim ID, provided it adds no new material externally verifiable proposition.",
    "13. Section mission and contextual framing may ground ordinary explanation, but they NEVER authorize numbers, prices, dates, named third-party capabilities, comparisons, rankings, health, legal, financial, security, guarantee, study, dataset, or other material factual assertions.",
    "",
    "HARD RULES:",
    "1. Return body content for this one section only.",
    "2. Do NOT output an H1.",
    "3. Do NOT output an H2.",
    "4. H3 is allowed only when materially useful inside this section.",
    "5. Preserve the section's information job and expected outcome.",
    "6. Preserve every required claim that can be stated accurately.",
    "7. Never state a forbidden claim.",
    "8. Never invent a fact, statistic, date, price, law, study, citation, ranking, comparison, capability, guarantee, award, dataset, customer, security property, or source.",
    "9. Never invent claim IDs, evidence IDs, query node IDs, internal links, or asset IDs.",
    "10. Use only claim/evidence IDs assigned by the section contract.",
    "11. If a blocked factual sentence cannot be supported, remove it or narrow it instead of fabricating support.",
    "12. SUPPORTS + VERIFIED_EXCERPT is the only publication-grade evidence for factual support.",
    "13. Do not use SEARCH_SNIPPET or REFERENCE_ONLY material as factual authorization.",
    "14. Do not keyword-stuff.",
    "15. Do not add headings or prose to hit a length target.",
    "16. Do not mention repair instructions, contracts, IDs, critics, or verification machinery in reader-facing prose.",
    "",
    "DYNAMIC WRITER V2 REPAIR POLICY:",
    "- Repair material factual failures without destroying valid ordinary explanatory prose.",
    "- Ordinary grounded explanation does not need an artificial claim ID.",
    "- Never invent a claim or evidence ID to make verification pass.",
    "- UNSUPPORTED material meaning must be deleted or narrowed to explicitly supported meaning.",
    "- CONTRADICTED material meaning must be removed.",
    "- Preserve useful explanation when it introduces no unsupported material proposition.",
    "",
    "OUTPUT JSON ONLY:",
    "{",
    '  "bodyMarkdown": "repaired body for this section only; no H1 or H2",',
    '  "coveredQueryNodeIds": ["only assigned query IDs actually covered"],',
    '  "referencedClaimIds": ["only assigned required claim IDs actually represented; never invent claim IDs for ordinary explanatory prose"],',
    '  "referencedEvidenceIds": ["only assigned evidence IDs actually relied upon"],',
    '  "usedInternalLinks": ["only assigned internal links actually used"],',
    '  "assetUsed": "assigned asset ID if actually used, otherwise null"',
    "}",
    "",
    "Do not add any other fields.",
    "Do not include markdown fences around the JSON.",
  ].join(
    "\n"
  );
}
