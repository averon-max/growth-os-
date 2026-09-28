import type {
  SectionGenerationContractV1,
} from "./article-generation-contract";

import {
  serializeSectionScopedAuthorityContextV1,
} from "./master-section-context";


function authoritativeContext(
  contract:
    Readonly<SectionGenerationContractV1>
): string {
  /*
   * SECTION_SCOPED_PROMPT_CONTEXT_V1
   *
   * The immutable runtime stays complete.
   * Only provider context is projected to this section.
   */
  return serializeSectionScopedAuthorityContextV1(
    contract
  );
}

export function buildMasterSectionPrompt(
  contract:
    Readonly<SectionGenerationContractV1>
): string {
  /*
   * NO_EVIDENCE_SECTION_MODE_V1
   *
   * When the deterministic contract assigns no claims/evidence,
   * the writer must stay inside safe explanatory prose instead
   * of inventing material external facts.
   */
  const noEvidenceSectionMode =
    [
      "NO-EVIDENCE SECTION MODE V1:",
      "- Apply these rules when requiredClaims and evidenceIds are both empty.",
      "- Write only high-level definitional framing, ordinary explanation, transitions, and reader guidance.",
      "- Do NOT add named companies, named credit bureaus, numbers, statistics, studies, rankings, specific alert-type lists, timing/frequency claims, coverage claims, product capabilities, price claims, guarantees, legal conclusions, financial outcomes, security outcomes, or free-vs-paid comparisons.",
      "- Do not turn a high-level definition into a detailed mechanism claim unless the exact claim and publication-grade evidence are assigned.",
      "- If useful detail would require unassigned factual authority, omit that detail rather than inventing, assuming, extrapolating, or generalizing it.",
      "- Reader guidance may explain what a reader should consider without asserting unsupported external facts.",
      "- A direct answer may be concise. Never add unsupported specifics merely to increase length.",
    ].join(
      "\\n"
    );


  return [
    noEvidenceSectionMode,
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
    "MASTER WRITER V3 ADAPTIVE SEO RULES:",
    "- There is no arbitrary word-count target. Write only the depth needed to fully satisfy this section mission.",
    "- There is no keyword-density target. Never repeat an exact query phrase merely to increase its frequency.",
    "- Use assigned search terminology explicitly where it improves reader clarity, but never force exact-match wording.",
    "- Closely overlapping query variants represent one semantic information need and must be answered once.",
    "- Do not create additional sections, paragraphs, or headings merely to cover keyword variants.",
    "- Live competitor word counts are descriptive context only and never become minimums, maximums, quotas, or publication gates.",
    "- A shorter section is correct when it completely satisfies its information job.",
    "- Additional depth is justified only by distinct reader needs, verified evidence, useful examples, necessary distinctions, or assigned original value.",
    "",
    "SEMANTIC_COMPLETION_STOP_RULE_V3:",
    "- Every paragraph must add distinct reader utility.",
    "- Continue only while an assigned information job remains materially incomplete.",
    "- Cover assigned query needs substantively rather than merely repeating their wording.",
    "- Represent every assigned required claim accurately when publication-grade evidence authorizes it.",
    "- Integrate assigned original-value assets and internal links only where they genuinely improve the section.",
    "- STOP writing the section when the section mission, expected outcome, assigned query needs, required claims, and required assets are satisfied.",
    "- After semantic completion, do not add filler, repeated definitions, redundant examples, generic summaries, repeated keyword variants, or decorative headings.",
    "- Prefer the shortest complete version that preserves clarity, evidence, usefulness, and necessary distinctions.",
    "",
    "DYNAMIC WRITER V2 MATERIAL CLAIM RULES:",
    "- Required blueprint claims are material claims and must still be represented accurately when assigned.",
    "- Ordinary explanation, transitions, framing, reader guidance, and non-material synthesis do NOT need artificial claim IDs.",
    "- Never invent a claim ID or evidence ID for explanatory prose.",
    "- Never add a new material factual assertion unless it is authorized by an assigned claim and publication-grade assigned evidence.",
    "- Numbers, prices, statistics, dates or current facts, financial, medical, legal, security, product-capability, comparison, ranking, study, guarantee, and superlative claims are material.",
    "- When uncertain whether a factual proposition is material, omit it or stay within the exact supported claim.",
    "",
    "OUTPUT CONTRACT:",
    "Return JSON only with exactly this shape:",
    "{",
    '  "bodyMarkdown": "markdown body for this one section; no H1 or H2",',
    '  "coveredQueryNodeIds": ["only assigned query node IDs actually covered"],',
    '  "referencedClaimIds": ["every assigned required claim ID actually represented; never invent claim IDs for ordinary explanatory prose"],',
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
