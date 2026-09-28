export const MATERIAL_CLAIM_POLICY_VERSION =
  "MATERIAL_CLAIM_POLICY_V2" as const;


export type MaterialClaimPolicyClassV2 =
  | "MATERIAL_FACT"
  | "GROUNDED_EXPLANATION"
  | "NON_FACTUAL_PROSE";


export const MATERIAL_CLAIM_EXAMPLES_V2 =
  Object.freeze([
    "numbers and percentages",
    "statistics and dataset findings",
    "prices and costs",
    "dates and freshness-sensitive facts",
    "financial assertions",
    "medical or health assertions",
    "legal or regulatory assertions",
    "product capabilities",
    "security or safety assertions",
    "comparisons and rankings",
    "superlatives",
    "study or research findings",
    "named third-party capabilities",
    "guarantees or outcome promises",
  ]);


export const GROUNDED_EXPLANATION_EXAMPLES_V2 =
  Object.freeze([
    "plain-language explanation",
    "definition phrased without adding a new material fact",
    "logical synthesis of already supported context",
    "reader guidance",
    "transition",
    "framing",
    "navigation",
    "question",
    "instruction that introduces no unsupported material fact",
  ]);


/**
 * Dynamic Writer V2:
 *
 * Research remains strict.
 * Material facts remain strict.
 *
 * Ordinary explanatory prose does NOT need an artificial
 * Claim Ledger record merely because it explains a concept.
 *
 * This never authorizes invention of facts.
 */
export function materialClaimPolicyPromptV2():
readonly string[] {
  return Object.freeze([
    "MATERIAL CLAIM POLICY V2:",

    "A MATERIAL FACT is an externally verifiable proposition whose truth could materially affect accuracy, safety, money, health, law, product evaluation, comparison, ranking, recency, or a reader decision.",

    `Material examples include: ${MATERIAL_CLAIM_EXAMPLES_V2.join(", ")}.`,

    "Every material factual assertion must be authorized by the supplied Claim Ledger and publication-grade assigned evidence.",

    "A GROUNDED EXPLANATION explains, organizes, connects, or cautiously synthesizes supplied context without introducing a new material externally verifiable proposition.",

    "Ordinary grounded explanation does not require an artificial claim ID.",

    "Do not manufacture a claim ID merely to label explanatory prose.",

    "Do not convert unsupported factual content into explanation to bypass evidence requirements.",

    "If a unit mixes ordinary explanation with a material factual assertion, evaluate it as a material factual assertion.",

    "When uncertain whether a proposition is material, treat it as material and require evidence.",
  ]);
}


export function materialClaimPolicySummaryV2() {
  return Object.freeze({
    version:
      MATERIAL_CLAIM_POLICY_VERSION,

    materialExamples:
      MATERIAL_CLAIM_EXAMPLES_V2,

    groundedExplanationExamples:
      GROUNDED_EXPLANATION_EXAMPLES_V2,

    rules:
      Object.freeze({
        materialFactsRequireClaimAndEvidence:
          true,

        groundedExplanationRequiresArtificialClaimId:
          false,

        unsupportedMaterialFactsAllowed:
          false,

        contradictedMaterialFactsAllowed:
          false,

        uncertaintyFailsClosed:
          true,
      }),
  });
}
