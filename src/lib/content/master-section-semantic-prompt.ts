import type {
  SectionGenerationContractV1,
} from "./article-generation-contract";

import type {
  GeneratedSectionV1,
} from "./master-article-generator";

import {
  extractSectionSemanticProseUnitsV1,
} from "./master-section-semantic-verifier";


export function buildMasterSectionSemanticVerificationPrompt({
  contract,
  section,
}: {
  contract:
    Readonly<SectionGenerationContractV1>;

  section:
    Readonly<GeneratedSectionV1>;
}): string {
  const units =
    extractSectionSemanticProseUnitsV1({
      sectionIndex:
        contract.sectionIndex,

      bodyMarkdown:
        section.bodyMarkdown,
    });


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


  const context =
    JSON.stringify(
      {
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
      },
      null,
      2
    );


  return [
    "You are an independent factual-claim verifier inside a high-integrity publishing system.",
    "",
    "You are NOT the writer.",
    "Do NOT repair or rewrite the prose.",
    "Do NOT invent facts, claims, sources, evidence, IDs, or citations.",
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
    "- Pure transition, navigation, framing, question, instruction, opinion, or non-factual connective language.",
    "- matchedClaimId must be null.",
    "- evidenceIds must be empty.",
    "",
    "SUPPORTED",
    "- The prose unit makes a factual assertion materially supported by an approved required claim.",
    "- matchedClaimId must be that approved claim ID.",
    "- Include only assigned evidence IDs actually supporting the classification.",
    "- At least one cited evidence record must be SUPPORTS + VERIFIED_EXCERPT.",
    "",
    "NARROWER",
    "- The prose unit is a materially narrower or more cautious statement than an approved required claim and does not exceed it.",
    "- matchedClaimId must be the approved required claim ID.",
    "- Include only assigned supporting evidence.",
    "",
    "UNSUPPORTED",
    "- The prose unit makes a factual assertion that cannot be justified by an approved required claim and its assigned evidence.",
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
    "2. Numbers, percentages, dates, prices, legal statements, rankings, guarantees, product capabilities, comparisons, named third-party capabilities, dataset claims, security claims, and superlatives require explicit support.",
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
