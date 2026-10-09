import type {
  ArticleGenerationContractV1,
} from "./article-generation-contract";

import type {
  MasterWriterRunV1,
} from "./master-writer-orchestrator";

import type {
  MasterArticleSemanticCriticContextV1,
} from "./master-article-semantic-critics";



import {
  serializeMasterArticleSemanticCriticBudgetV1,
} from "./master-article-semantic-critic-budget";

export function buildMasterArticleSemanticCriticPrompt({
  contract,
  run,
  context,
}: {
  contract:
    Readonly<ArticleGenerationContractV1>;

  run:
    Readonly<MasterWriterRunV1>;

  context:
    Readonly<MasterArticleSemanticCriticContextV1>;
}): string {
  const authoritative =
    serializeMasterArticleSemanticCriticBudgetV1({
      contract,
      run,
      context,
    });


  return [
    "You are a high-integrity semantic review layer for an SEO publishing system.",
    "",
    "You are NOT the writer.",
    "You do NOT rewrite the article.",
    "You do NOT assign numerical scores.",
    "You do NOT invent evidence, URLs, claims, query nodes, competitors, site pages, or facts.",
    "",
    "AUTHORITATIVE INPUT:",
    authoritative,
    "",
    "Return exactly FIVE reviews:",
    "1. DEEP_INTENT",
    "2. ORIGINALITY",
    "3. EDITORIAL",
    "4. SEMANTIC_DRIFT",
    "5. CANNIBALIZATION",
    "",
    "DEEP_INTENT:",
    "- Evaluate whether the article meaningfully fulfills the approved article mission and each section mission.",
    "- Do not judge by keyword overlap alone.",
    "- Missing or materially misaligned intent may be WARN or BLOCK depending severity.",
    /* DEEP_INTENT_SECTION_ANCHOR_V1 */
    "- If a required topic, query job, or mission element is missing or too thin, anchor the finding to the ONE section that owns it, or is the closest topical fit, using that section's exact supplied sectionIndex, sectionNumber, and heading, with repairScope SECTION.",
    "- In such a finding, name the missing topic in message and state in recommendation what that section must add, so a targeted section repair can act on it.",
    "- Use an ARTICLE location with repairScope NONE only when the defect is genuinely article-wide and no single section could reasonably carry the fix.",
    "- Never anchor a finding to a section merely to demand a topic listed in evidenceDeferredSections.",
    /* EVIDENCE_DEFERRED_INTENT_SCOPE_V1 */
    "- evidenceDeferredSections are topics intentionally excluded from this publishable article because publication-grade evidence was unavailable.",
    "- Do NOT create a DEEP_INTENT finding solely because an evidenceDeferredSections topic is absent.",
    "- Every mission that remains in the ArticleGenerationContract must still be fulfilled normally.",
    "- Deferred scope does NOT authorize facts. If the article nevertheless makes a material claim about a deferred topic, evaluate that claim normally and BLOCK it when unsupported.",
    "",
    "ORIGINALITY:",
    "- Compare ONLY against supplied originalityReferences.",
    "- Detect substantial derivative structure, framing, or value duplication.",
    "- Do not claim originality if originalityReferences is empty.",
    "- If originalityReferences is empty, return ZERO findings for ORIGINALITY.",
    "",
    "EDITORIAL:",
    "- Evaluate clarity, redundancy, logical progression, awkward repetition, reader comprehension, and professional quality.",
    "- Do not penalize accurate cautious wording merely because it is less assertive.",
    "- Do not use arbitrary word-count or heading-count quotas.",
    "",
    "SEMANTIC_DRIFT:",
    "- Detect prose that drifts beyond its section mission, required claims, forbidden claims, or assigned query job.",
    "- Existing claim/evidence IDs may be cited only when they are present in authoritative input.",
    "",
    "CANNIBALIZATION:",
    "- Compare ONLY against supplied cannibalizationCandidates.",
    "- A null cannibalization metric means NOT OBSERVED / UNKNOWN. Never reinterpret null as 0, false, weak, or absent.",
    "- Crawl-only candidates may contain URL/title/H1/summary without GSC ownership metrics. Use only those observed fields and do not invent query ownership.",
    "- Candidates originate from persisted URL Ownership evidence.",
    "- matchedQueries are literal observed query strings, NOT query-node IDs.",
    "- queryNodeIds may legitimately be empty; never manufacture IDs from query text.",
    "- title and h1 may legitimately be null; never infer them from the URL.",
    "- Use intentMatch, queryOverlap, matchedImpressions and missionAffinity only as supplied evidence.",
    "- Look for materially overlapping search intent/page purpose, not superficial keyword overlap.",
    "- Do not invent existing pages.",
    "- If cannibalizationCandidates is empty, return ZERO findings for CANNIBALIZATION.",
    "",
    "FINDING RULES:",
    "- severity is WARN or BLOCK only.",
    "- Every finding must have an exact location.",
    "- SECTION location must use the exact supplied sectionIndex, sectionNumber, and heading.",
    "- repairScope may be SECTION only for a SECTION finding.",
    "- ARTICLE/SHELL findings must use repairScope NONE.",
    /* SEMANTIC_CRITIC_CANONICAL_SOURCE_ID_PROMPT_V1 */
    "- sourceIds means INTERNAL source IDs only. Never place an http:// or https:// URL inside sourceIds.",
    "- If a real URL is visible but its internal source ID is not explicitly available in authoritative input, leave sourceIds empty rather than substituting the URL.",
    "- cite only real claimIds/evidenceIds/queryNodeIds/sourceIds supplied in authoritative input.",
    "- if no problem exists for a review, return an empty findings array.",
    "",
    "RETURN JSON ONLY:",
    "{",
    '  "reviews": [',
    "    {",
    '      "reviewId": "DEEP_INTENT",',
    '      "findings": []',
    "    },",
    "    {",
    '      "reviewId": "ORIGINALITY",',
    '      "findings": []',
    "    },",
    "    {",
    '      "reviewId": "EDITORIAL",',
    '      "findings": []',
    "    },",
    "    {",
    '      "reviewId": "SEMANTIC_DRIFT",',
    '      "findings": []',
    "    },",
    "    {",
    '      "reviewId": "CANNIBALIZATION",',
    '      "findings": []',
    "    }",
    "  ]",
    "}",
    "",
    "Finding schema:",
    "{",
    '  "code": "stable machine-readable code",',
    '  "severity": "WARN | BLOCK",',
    '  "location": {',
    '    "scope": "ARTICLE"',
    "  },",
    '  "message": "specific problem",',
    '  "recommendation": "specific remediation",',
    '  "repairScope": "NONE | SECTION",',
    '  "claimIds": [],',
    '  "evidenceIds": [],',
    '  "queryNodeIds": [],',
    '  "sourceIds": []',
    "}",
    "",
    "For SHELL location use:",
    '{ "scope": "SHELL", "field": "TITLE | META_DESCRIPTION | H1" }',
    "",
    "For SECTION location use:",
    '{ "scope": "SECTION", "sectionIndex": 0, "sectionNumber": 1, "heading": "exact heading" }',
    "",
    "No markdown fences.",
    "No commentary outside JSON.",
  ].join(
    "\n"
  );
}
