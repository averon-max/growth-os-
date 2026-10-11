import type {
  SectionGenerationContractV1,
} from "./article-generation-contract";

import type {
  GeneratedSectionV1,
} from "./master-article-generator";

import {
  extractSectionSemanticProseUnitsV1,
} from "./master-section-semantic-verifier";

import {
  materialClaimPolicyPromptV2,
  materialClaimPolicySummaryV2,
} from "./material-claim-policy";


export function buildMasterSectionSemanticVerificationPrompt({
  contract,
  section,
  unitIds,
}: {
  contract:
    Readonly<SectionGenerationContractV1>;

  section:
    Readonly<GeneratedSectionV1>;

  /*
   * Optional deterministic continuation boundary.
   *
   * When supplied, the verifier sees ONLY these already-extracted
   * unit IDs. It cannot create, renumber, or silently omit units.
   */
  unitIds?:
    readonly string[];
}): string {
  const allUnits =
    extractSectionSemanticProseUnitsV1({
      sectionIndex:
        contract.sectionIndex,

      bodyMarkdown:
        section.bodyMarkdown,
    });


  const requestedUnitIds =
    unitIds
      ? new Set(
          unitIds
        )
      : null;


  const units =
    requestedUnitIds ===
      null
      ? allUnits
      : allUnits.filter(
          (
            unit
          ) =>
            requestedUnitIds.has(
              unit.id
            )
        );


  if (
    requestedUnitIds !==
      null &&
    units.length !==
      requestedUnitIds.size
  ) {
    throw new Error(
      "SECTION_SEMANTIC_PROMPT_UNKNOWN_UNIT_ID"
    );
  }


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


  const claims =
    contract.claimLedger
      .claims
      .filter(
        (claim) =>
          allowedClaimIds.has(
            claim.id
          )
      );


  const assignedEvidenceIds =
    new Set(
      contract.blueprint
        .evidenceIds ??
      []
    );


  const evidence =
    contract.evidenceGraph
      .claimEvidence
      .filter(
        (item) =>
          assignedEvidenceIds.has(
            item.id
          )
      );


  const sourceIds =
    new Set(
      evidence.map(
        (item) =>
          item.sourceId
      )
    );


  const sources =
    contract.evidenceGraph
      .sources
      .filter(
        (source) =>
          sourceIds.has(
            source.id
          )
      );


  const materialClaimPolicy =
    materialClaimPolicySummaryV2();


  const context =
    JSON.stringify(
      {
        materialClaimPolicy,

        section: {
          index:
            contract.sectionIndex,

          number:
            contract.sectionNumber,

          heading:
            contract.blueprint
              .heading,

          mission:
            contract.blueprint
              .mission,

          requiredClaims:
            contract.blueprint
              .requiredClaims ??
            [],

          forbiddenClaims:
            contract.blueprint
              .forbiddenClaims ??
            [],

          assignedEvidenceIds:
            contract.blueprint
              .evidenceIds ??
            [],
        },

        claims,

        evidence,

        sources,

        proseUnits:
          units,
      }
    );


  return [
    "You are an independent factual-claim verifier inside a high-integrity publishing system.",
    "",
    "You are NOT the writer.",
    "Do NOT repair or rewrite the prose.",
    "Do NOT invent facts, claims, sources, evidence, IDs, or citations.",
    "",
    ...materialClaimPolicyPromptV2(),
    "",
    "Your task is to classify EVERY supplied prose unit.",
    "You may not omit a prose unit.",
    "You may not merge prose units.",
    "You may not create new prose units.",
    "",
    "AUTHORITATIVE CONTEXT:",
    context,
    "",
    "CLASSIFICATIONS:",
    "",
    "NOT_A_FACT",
    "- Legacy classification name used for NON-MATERIAL prose.",
    "- Includes transition, navigation, framing, question, instruction, opinion, reader guidance, and ordinary grounded explanation that introduces no material externally verifiable proposition.",
    "- A definition or explanatory sentence may use NOT_A_FACT only when it does not add a material factual assertion beyond the supplied authoritative context.",
    "- matchedClaimId must be null.",
    "- evidenceIds must be empty.",
    "",
    "SUPPORTED",
    "- The prose unit makes a factual assertion materially supported by an approved required claim.",
    "- matchedClaimId must be that approved claim ID.",
    "- Include only assigned evidence IDs actually supporting the classification.",
    "- At least one cited evidence record must be SUPPORTS + VERIFIED_EXCERPT.",
    "",
    "MULTI_CLAIM_PROSE_VERIFIER_RULE_V1:",
    "- One prose unit may contain more than one approved required claim owned by this same section.",
    "- matchedClaimId identifies the primary claim.",
    "- evidenceIds may additionally contain assigned SUPPORTS + VERIFIED_EXCERPT evidence for another VERIFIED required claim expressed by the same prose unit.",
    "- Never attach evidence for an unrelated claim, forbidden claim, or claim outside this section.",
    "- The primary matched claim must still have its own supporting publication-grade evidence.",
    "",
    "NARROWER",
    "- The prose unit is a materially narrower or more cautious statement than an approved required claim and does not exceed it.",
    "- matchedClaimId must be the approved required claim ID.",
    "- Include only assigned supporting evidence.",
    "",
    "UNSUPPORTED",
    "- The prose unit makes a MATERIAL factual assertion that cannot be justified by an approved required claim and its assigned evidence.",
    "- Do not rescue it using general knowledge.",
    "- Do not infer missing evidence.",
    "- matchedClaimId may be null, or may identify the closest approved/forbidden claim when useful.",
    "",
    "CONTRADICTED",
    "- The prose unit conflicts with an authoritative claim/evidence record or asserts a forbidden claim contradicted by the evidence.",
    "- matchedClaimId must identify the relevant approved or forbidden claim.",
    "",
    "CRITICAL RULES:",
    "1. Evaluate the exact meaning of the prose, not keyword overlap.",
    "2. Numbers, percentages, dates, prices, legal statements, medical or health assertions, financial assertions, rankings, guarantees, product capabilities, comparisons, named third-party capabilities, dataset claims, security claims, and superlatives require explicit support.",
    "2A. Ordinary grounded explanatory prose does not require a claim ID merely because it explains a concept.",
    "2A1. Declarative wording alone does not make a prose unit material. A unit may be NOT_A_FACT when it only explains, organizes, connects, or cautiously synthesizes the supplied authoritative section context without adding a new material externally verifiable proposition.",
    "2A2. Do not require a claim ID merely because a sentence explains the generic concept represented by the supplied section mission. The section mission may ground ordinary explanation, but it is NOT evidence for a material factual assertion.",
    "2A3. Do not classify useful explanatory prose as UNSUPPORTED solely because no claim ID exists. UNSUPPORTED is reserved for a MATERIAL factual assertion that exceeds the supplied claim/evidence authority.",
    "2B. Never classify a material factual assertion as NOT_A_FACT merely because it is written in explanatory language.",
    "2C. If a prose unit combines explanation and a material fact, the material fact controls classification.",
    "3. Do not call a claim SUPPORTED merely because it sounds plausible.",
    "4. SEARCH_SNIPPET or REFERENCE_ONLY evidence is not publication-grade support.",
    "5. Only SUPPORTS + VERIFIED_EXCERPT may authorize SUPPORTED/NARROWER.",
    "6. Never use a claim ID or evidence ID absent from the supplied authoritative context.",
    "7. A forbidden claim can never be classified SUPPORTED or NARROWER.",
    "8. Return exactly one result for every supplied unitId.",
    "",
    "RETURN JSON ONLY:",
    "{",
    '  "units": [',
    "    {",
    '      "unitId": "exact supplied unit ID",',
    '      "classification": "NOT_A_FACT | SUPPORTED | NARROWER | UNSUPPORTED | CONTRADICTED",',
    '      "matchedClaimId": "approved claim ID or null",',
    '      "evidenceIds": ["assigned evidence IDs actually relied upon"],',
    '      "rationale": "brief semantic reason"',
    "    }",
    "  ]",
    "}",
    "",
    "Do not include markdown fences.",
    "Do not return additional fields.",
  ].join(
    "\n"
  );
}
