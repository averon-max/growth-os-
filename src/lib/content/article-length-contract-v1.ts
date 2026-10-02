import type { SectionWordBudgetV1 } from "./article-execution-plan-v1";

/*
 * ARTICLE_LENGTH_CONTRACT_V1
 *
 * Product requirement for the explicitly classified article type
 * COMPREHENSIVE_INFORMATIONAL.
 *
 * This is OUR editorial contract for that article type.
 * It is NOT a universal Google ranking rule.
 *
 * Any page that genuinely needs a shorter format must be a
 * different, explicitly classified article type. It must never
 * silently violate this range.
 */
export type ArticleLengthClassV1 =
  "COMPREHENSIVE_INFORMATIONAL" | "UNCLASSIFIED";

export interface ArticleLengthContractV1 {
  readonly version: "ARTICLE_LENGTH_CONTRACT_V1";

  readonly articleClass: ArticleLengthClassV1;

  readonly targetWords: Readonly<{
    min: number;
    max: number;
  }> | null;
}

export const COMPREHENSIVE_INFORMATIONAL_TARGET_WORDS_V1 = Object.freeze({
  min: 1800,
  max: 2350,
});

const INFORMATIONAL_INTENTS = new Set(["INFORMATIONAL", "DEFINITIONAL"]);

/*
 * Explicit short-form / non-article page types are NOT
 * comprehensive informational articles.
 */
const NON_COMPREHENSIVE_PAGE_TYPE =
  /(faq|glossary|news|tool|calculator|landing|comparison|review|pricing|product)/i;

/*
 * Explicit long-form semantic page classes emitted by the
 * live Stage Planner may use descriptive intent text instead
 * of the legacy INFORMATIONAL enum.
 */
const EXPLICIT_COMPREHENSIVE_PAGE_TYPE_V1 =
  /^(explainer|explainer_guide)$/i;


function normalizeIntent(value: unknown): string {
  return typeof value === "string"
    ? value
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, "_")
    : "";
}

export function resolveArticleLengthContractV1(plan: {
  readonly intent?: unknown;
  readonly pageType?: unknown;
}): Readonly<ArticleLengthContractV1> {
  const intent = normalizeIntent(plan.intent);

  const pageType =
    typeof plan.pageType === "string" ? plan.pageType.trim() : "";

  const comprehensive =
    !NON_COMPREHENSIVE_PAGE_TYPE.test(
      pageType
    ) &&
    (
      INFORMATIONAL_INTENTS.has(
        intent
      ) ||
      EXPLICIT_COMPREHENSIVE_PAGE_TYPE_V1.test(
        pageType
      )
    );

  return Object.freeze({
    version: "ARTICLE_LENGTH_CONTRACT_V1",

    articleClass: comprehensive
      ? "COMPREHENSIVE_INFORMATIONAL"
      : "UNCLASSIFIED",

    targetWords: comprehensive
      ? COMPREHENSIVE_INFORMATIONAL_TARGET_WORDS_V1
      : null,
  });
}

/*
 * Distributes the article-level word contract across WRITABLE
 * sections in proportion to the information load the plan already
 * derived (ADAPTIVE_SECTION_DEPTH_V1).
 *
 * This does not add sections, topics or keywords.
 * It only stops a complete plan from being under-budgeted.
 *
 * Returns an EMPTY map when the contract does not apply or the
 * plan already sums inside the range.
 */
export function deriveSectionBudgetsForLengthContractV1(
  sections: readonly {
    readonly id: string;
    readonly state: string;
    readonly targetWords: Readonly<SectionWordBudgetV1>;
  }[],
  contract: Readonly<ArticleLengthContractV1>,
): ReadonlyMap<string, Readonly<SectionWordBudgetV1>> {
  const result = new Map<string, Readonly<SectionWordBudgetV1>>();

  const range = contract.targetWords;

  if (!range) {
    return result;
  }

  const writable = sections.filter((section) => section.state === "WRITABLE");

  if (writable.length === 0) {
    return result;
  }

  /*
   * CONTENT_V1_DEPTH_BUDGET_V2
   *
   * Comprehensive informational articles have an explicit
   * product-level length contract.
   *
   * The section floors must therefore add up to the article
   * floor. Otherwise every section can be locally "valid"
   * while the composed article still collapses to 200 words.
   *
   * Existing information-load proportions remain authoritative.
   * This creates NO topic, query, claim, heading or evidence.
   */
  const weights = writable.map((section) =>
    Math.max(1, section.targetWords.preferred),
  );

  const totalWeight = weights.reduce((sum, value) => sum + value, 0);

  const allocate = (total: number): number[] => {
    let remainingTotal = total;

    let remainingWeight = totalWeight;

    return weights.map((weight, index) => {
      if (index === weights.length - 1) {
        return remainingTotal;
      }

      const value = Math.max(
        1,
        Math.round(remainingTotal * (weight / remainingWeight)),
      );

      remainingTotal -= value;

      remainingWeight -= weight;

      return value;
    });
  };

  const preferredTotal = Math.round((range.min + range.max) / 2);

  const minShares = allocate(range.min);

  const preferredShares = allocate(preferredTotal);

  const maxShares = allocate(range.max);

  writable.forEach((section, index) => {
    const min = minShares[index] ?? section.targetWords.min;

    const preferred = preferredShares[index] ?? section.targetWords.preferred;

    const max = maxShares[index] ?? section.targetWords.max;

    if (!(min <= preferred && preferred <= max)) {
      throw new Error(`ARTICLE_LENGTH_SECTION_BUDGET_INVALID:${section.id}`);
    }

    result.set(
      section.id,
      Object.freeze({
        min,
        preferred,
        max,
      }),
    );
  });

  return result;
}
