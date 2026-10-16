import type {
  SectionGenerationContractV1,
} from "./article-generation-contract";

import {
  serializeSectionScopedAuthorityContextV1,
} from "./master-section-context";
import {
  ARTICLE_TEMPLATE_POLICIES_V1,
  type ArticleTemplateIdV1,
} from "./article-template-policy-v1";

/*
 * The Stage Planner has already selected an article template.
 * The Writer must not reconstruct a new outline or claim authority.
 * This advisory context is only activated for a recognizable persisted
 * pageType; otherwise the approved section mission remains the authority.
 */
const TEMPLATE_SECTION_EDITORIAL_GUIDANCE_V1:
  Readonly<Record<ArticleTemplateIdV1, string>> = Object.freeze({
    EXPLAINER_GUIDE:
      "Explain the assigned concept, mechanism or limitation with a direct answer, source-supported distinctions and concrete practical implications.",
    HOW_TO:
      "Make the assigned step actionable: explain prerequisites, sequence, checks, common failure modes or outcomes only when they belong to this section.",
    LOCAL_SERVICE_GUIDE:
      "Connect the assigned service question to genuine local context, practical selection criteria and documented business facts; never fabricate local experience.",
    SERVICE_LANDING:
      "Address the assigned service benefit, suitability, process or objection with verifiable first-party facts; do not turn every paragraph into promotion.",
    COMPARISON:
      "Compare the assigned alternatives using matched decision criteria, meaningful tradeoffs and applicable limitations; never manufacture a winner.",
    RANKED_LIST:
      "Explain the assigned selection criteria and individual item differences; never imply testing, ranks or scoring unsupported by real methodology.",
    CURATED_LIST:
      "Explain why assigned options belong and how they differ, without inventing personal use, popularity or performance.",
    PRODUCT_DETAIL_EDUCATION:
      "Clarify the assigned product use, features, compatibility and limitations using verified product information.",
    PRODUCT_REVIEW:
      "Distinguish verified product specifications from actual first-party experience; never claim hands-on testing unless documented.",
    COMMERCIAL_CATEGORY:
      "Help the reader choose between the assigned product types with useful criteria and verified differences, not generic sales language.",
    LOCAL_DIRECTORY:
      "Describe only verified local businesses, locations or comparison criteria owned by this section; no fabricated listings or local claims.",
    AUDIENCE_USE_CASE:
      "Solve the assigned audience-specific situation with concrete, relevant steps and boundaries rather than generic persona filler.",
    IDEAS_USE_CASES:
      "Develop the assigned idea into a workable scenario with verified limitations; do not pad with interchangeable list entries.",
    PROBLEM_SOLUTION:
      "Connect the assigned symptom or problem to plausible causes, diagnostic steps and source-supported remedies without invented certainty.",
    BRAND_SHOP_HUB:
      "Explain the assigned brand or assortment decision using verified offerings and clear navigation; do not invent inventory, reviews or awards.",
  });

function templateEditorialContextV1(
  contract: Readonly<SectionGenerationContractV1>
): string {
  const pageType = contract.searchBlueprint.pageType;
  const normalized = typeof pageType === "string"
    ? pageType.trim().toUpperCase().replace(/[\s-]+/g, "_")
    : "";
  // The Stage Plan can persist descriptive page types, such as "explainer"
  // or "how-to", instead of the matching 15-template identifier.
  const aliases: Readonly<Record<string, ArticleTemplateIdV1>> = {
    EXPLAINER: "EXPLAINER_GUIDE",
    HOW_TO_GUIDE: "HOW_TO",
    LOCAL_SERVICE: "LOCAL_SERVICE_GUIDE",
    IDEAS: "IDEAS_USE_CASES",
    BRAND_SHOP: "BRAND_SHOP_HUB",
  };
  const candidate = aliases[normalized] ?? normalized;
  if (!Object.prototype.hasOwnProperty.call(
    ARTICLE_TEMPLATE_POLICIES_V1, candidate
  )) {
    return [
      "No confirmed 15-template identifier is available in the saved pageType.",
      "Follow only the assigned section mission, claims, evidence and structure.",
      "Do not guess an article template or add unsupported sections.",
    ].join("\n");
  }
  const id = candidate as ArticleTemplateIdV1;
  const policy = ARTICLE_TEMPLATE_POLICIES_V1[id];
  return [
    "Selected article template: " + id,
    "Template-specific editorial approach: " +
      TEMPLATE_SECTION_EDITORIAL_GUIDANCE_V1[id],
    "ARTICLE-LEVEL role vocabulary, NOT extra obligations for this section: " +
      policy.requiredRoles.join(", "),
    "Evidence-sensitive roles: " + policy.evidenceSensitiveRoles.join(", "),
    "This section may cover ONLY its approved blueprint mission, question",
    "ownership and supported claims. Do not attempt the whole template here.",
    "Template heading ranges are planning guidance, never H3 or word quotas.",
    "Use examples and decision criteria only when supported by the approved",
    "evidence. Do not create new sources, first-party experiences, offers,",
    "rankings, local claims, prices, or unsupported comparisons.",
  ].join("\n");
}



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
    "ARTICLE TEMPLATE EDITORIAL CONTEXT (not a second outline authority):",
    templateEditorialContextV1(contract),
    "",

    "NON-NEGOTIABLE RULES:",
    "1. Write only the body underneath the assigned section H2.",
    "2. Do NOT output an H1.",
    "3. Do NOT output an H2.",
    "4. H3 headings are allowed only when they materially improve this section.",
    "4a. If this H2 owns two or more meaningfully distinct, evidence-supported reader subquestions or decision criteria, organize their answers with descriptive H3 headings (###) rather than one unbroken block. Use no H3 when the section has only one indivisible information job.",
    "4b. Every H3 must own at least one substantive, non-repeated answer paragraph; preserve assigned H2 and section order. Never add a decorative H3 or an unassigned topic.",
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
    "MEDIA_REQUIREMENTS_V1:",
    "- mediaRequirements come only from the assigned existing Original Value asset.",
    "- READY means the upstream asset is verified and may be referenced only if it is actually used.",
    "- REQUIRES_VERIFICATION means the asset is still planned/unverified: do not claim it exists, do not describe it as observed proof, and return assetUsed: null.",
    "- Never invent screenshot contents, chart values, diagram findings, visual evidence, image captions, test results, or video evidence.",
    "- Never transform an unverified dataset/research/telemetry asset into chart data.",
    "- assetUsed must remain the exact assigned asset ID when used; never invent another asset ID.",
    "",

    "ARTICLE_EXECUTION_PLAN_DEPTH_POLICY_V1:",
    "- When executionPlanAuthority is present, every required topic owned by this section must be substantively covered.",
    "- Every required question owned by this section must receive a useful answer in this section.",
    "- Required entities must be used only when contextually useful and factually permitted.",
    "- targetWords is a SOFT editorial depth budget derived from information load, not an SEO quota and not a ranking guarantee.",
    "- Aim near targetWords.preferred when useful coverage genuinely requires that depth.",
    "- Never pad, repeat keywords, invent facts, add empty H3s, or restate the same answer merely to hit targetWords.",
    "- Do not stop early while an assigned information job remains materially unanswered.",
    "- Complete every assigned information job with sufficient depth. Approach targetWords.preferred when supported by the assigned facts and evidence.",
    "- For comprehensive informational guides, explain the verified mechanism, scope, alternatives, limitations and practical reader decisions ONLY where those jobs are assigned to this section; use short examples or comparison criteria where they genuinely add new insight.",
    "- Detailed does not mean repetitive: if assigned verified evidence is exhausted, stop rather than producing generic filler to reach a length target.",
    "",
    "MASTER WRITER V3 ADAPTIVE SEO RULES:",
    "- When executionPlanAuthority.targetWords exists, aim to satisfy its minimum through distinct, useful, evidence-supported explanation. This is not permission to pad or invent facts.",
    "- There is no keyword-density target. Never repeat an exact query phrase merely to increase its frequency.",
    "- Use assigned search terminology explicitly where it improves reader clarity, but never force exact-match wording.",
    "- The approved queryGraph.nodes and executionPlanAuthority requiredTopics/requiredQuestions are the ONLY authority for additional same-intent long-tail terminology; integrate varied wording naturally where it helps explain different supported information jobs.",
    "- Represent meaningful distinct assigned search intents in prose instead of relying on just the two or three explicit planned keywords in the brief. A keyword is not a new fact, and it never authorizes a new claim or a new H2.",
    "- Prefer direct answers, concrete evidence-backed distinctions and readable subheadings over repeating the primary keyword. Never target an arbitrary keyword count, occurrence count or density.",
    "- Closely overlapping query variants represent one semantic information need and must be answered once.",
    "- Do not create additional sections, paragraphs, or headings merely to cover keyword variants.",
    "- Live competitor word counts are descriptive context only and never become minimums, maximums, quotas, or publication gates.",
    "- A shorter section is acceptable when the assigned evidence and reader needs cannot support more meaningful explanation. Never add filler.",
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
    "- Prefer a complete and sufficiently detailed explanation, not a terse summary. Preserve clarity, evidence, usefulness, and necessary distinctions without repetition.",
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
