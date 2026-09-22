import type {
  SectionGenerationContractV1,
} from "./article-generation-contract";


function authoritativeContext(
  contract:
    Readonly<SectionGenerationContractV1>
): string {
  /**
   * Stage 9C deliberately keeps the authoritative objects
   * structured all the way to the provider boundary.
   *
   * A later optimization may slice large graphs to only
   * section-relevant nodes, but it must preserve the same
   * evidence/claim/query authority boundaries.
   */
  return JSON.stringify(
    {
      section:
        contract.blueprint,

      mission:
        contract.mission,

      searchBlueprint:
        contract.searchBlueprint,

      queryGraph:
        contract.queryGraph,

      expectedCoverage:
        contract.expectedCoverage,

      gaps:
        contract.gaps,

      originalValue:
        contract.originalValue,

      evidenceGraph:
        contract.evidenceGraph,

      claimLedger:
        contract.claimLedger,

      internalLinkPlan:
        contract.internalLinkPlan,

      styleRules:
        contract.styleRules,

      hardRules:
        contract.hardRules,
    },
    null,
    2
  );
}


export function buildMasterSectionPrompt(
  contract:
    Readonly<SectionGenerationContractV1>
): string {
  return [
    "You are the section writer inside a high-integrity search publishing system.",
    "",
    "You are writing EXACTLY ONE approved article section.",
    "",
    "The deterministic system — not you — owns:",
    "- the article H1",
    "- the section H2",
    "- section ordering",
    "- search intent",
    "- query assignments",
    "- required and forbidden claims",
    "- approved evidence",
    "- internal-link assignments",
    "- original-value asset assignments",
    "",
    "AUTHORITATIVE SECTION CONTRACT:",
    authoritativeContext(
      contract
    ),
    "",
    "NON-NEGOTIABLE RULES:",
    "1. Write only the body underneath the assigned section H2.",
    "2. Do NOT output an H1.",
    "3. Do NOT output an H2.",
    "4. H3 headings are allowed only when they materially improve this section.",
    "5. Do not create headings to hit a count or pad length.",
    "6. Do not invent facts, metrics, statistics, dates, studies, citations, sources, product capabilities, legal claims, financial claims, comparisons, guarantees, awards, datasets, customers, rankings, or superlatives.",
    "7. Use factual claims only when permitted by the assigned claim/evidence context.",
    "8. Every required claim assigned to this section must be represented accurately.",
    "9. Never use a forbidden claim.",
    "10. Never claim to have used a query, claim, evidence item, internal link, or original-value asset that is not assigned to this section.",
    "11. If assigned evidence does not support stronger wording, narrow the wording instead of inventing support.",
    "12. Write for the user's information need first. Do not keyword-stuff.",
    "13. Do not imitate competitor wording.",
    "14. Do not write an introduction or conclusion for the whole article unless this section contract specifically requires that information job.",
    "15. Do not mention this contract, IDs, SEO instructions, or internal system concepts in reader-facing prose.",
    "",
    "OUTPUT CONTRACT:",
    "Return JSON only with exactly this shape:",
    "{",
    '  "bodyMarkdown": "markdown body for this one section; no H1 or H2",',
    '  "coveredQueryNodeIds": ["only assigned query node IDs actually covered"],',
    '  "referencedClaimIds": ["every assigned required claim ID actually represented"],',
    '  "referencedEvidenceIds": ["only assigned evidence IDs actually relied upon"],',
    '  "usedInternalLinks": ["only assigned internal-link targets actually used"],',
    '  "assetUsed": "assigned asset ID if actually used, otherwise null"',
    "}",
    "",
    "Do not include markdown fences around the JSON.",
    "Do not add fields outside this schema.",
  ].join(
    "\n"
  );
}
