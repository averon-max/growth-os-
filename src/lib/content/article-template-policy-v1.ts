export type ArticleTemplateIdV1 =
  | "EXPLAINER_GUIDE"
  | "HOW_TO"
  | "LOCAL_SERVICE_GUIDE"
  | "SERVICE_LANDING"
  | "COMPARISON"
  | "RANKED_LIST"
  | "CURATED_LIST"
  | "PRODUCT_DETAIL_EDUCATION"
  | "PRODUCT_REVIEW"
  | "COMMERCIAL_CATEGORY"
  | "LOCAL_DIRECTORY"
  | "AUDIENCE_USE_CASE"
  | "IDEAS_USE_CASES"
  | "PROBLEM_SOLUTION"
  | "BRAND_SHOP_HUB";


export type ArticleSectionRoleV1 =
  | "CORE_ANSWER"
  | "DEFINITION"
  | "MECHANISM"
  | "PROCESS"
  | "BENEFIT"
  | "FEATURE"
  | "USE_CASE"
  | "COMPARISON"
  | "PURCHASE_CRITERIA"
  | "COST"
  | "ELIGIBILITY"
  | "LIMITATION"
  | "LOCAL_CONTEXT"
  | "PROOF"
  | "DECISION_SUPPORT"
  | "HOW_TO"
  | "OBJECTION"
  | "TRUST"
  | "FAQ"
  | "CTA";


export type MaterialTemplateClaimTypeV1 =
  | "PRICE"
  | "TIME"
  | "RANKING"
  | "POPULARITY"
  | "HEALTH"
  | "SAFETY"
  | "LEGAL"
  | "INSURANCE"
  | "WARRANTY"
  | "CERTIFICATION"
  | "PERFORMANCE"
  | "ORDER_COUNT"
  | "CUSTOMER_COUNT"
  | "ENVIRONMENTAL"
  | "SUPERLATIVE";


export interface PlanningRangeV1 {
  readonly min: number;
  readonly max: number;
}


export interface ArticleTemplatePolicyV1 {
  readonly id:
    ArticleTemplateIdV1;

  /*
   * Planning guidance only.
   * These numbers are NOT SEO quotas.
   */
  readonly h2PlanningRange:
    Readonly<PlanningRangeV1>;

  readonly h3PlanningRange:
    Readonly<PlanningRangeV1>;

  readonly supportingQueryJobRange:
    Readonly<PlanningRangeV1>;

  readonly questionJobRange:
    Readonly<PlanningRangeV1>;

  readonly requiredRoles:
    readonly ArticleSectionRoleV1[];

  readonly optionalRoles:
    readonly ArticleSectionRoleV1[];

  readonly evidenceSensitiveRoles:
    readonly ArticleSectionRoleV1[];

  readonly allowRanking:
    boolean;

  readonly allowLocalContext:
    boolean;

  readonly allowCommercialCta:
    boolean;

  readonly requiresFirstPartyExperience:
    boolean;
}


const r = (
  min: number,
  max: number
): Readonly<PlanningRangeV1> =>
  Object.freeze({
    min,
    max,
  });


function makePolicy(
  input:
    ArticleTemplatePolicyV1
): Readonly<ArticleTemplatePolicyV1> {
  return Object.freeze({
    ...input,

    h2PlanningRange:
      Object.freeze({
        ...input.h2PlanningRange,
      }),

    h3PlanningRange:
      Object.freeze({
        ...input.h3PlanningRange,
      }),

    supportingQueryJobRange:
      Object.freeze({
        ...input.supportingQueryJobRange,
      }),

    questionJobRange:
      Object.freeze({
        ...input.questionJobRange,
      }),

    requiredRoles:
      Object.freeze([
        ...input.requiredRoles,
      ]),

    optionalRoles:
      Object.freeze([
        ...input.optionalRoles,
      ]),

    evidenceSensitiveRoles:
      Object.freeze([
        ...input.evidenceSensitiveRoles,
      ]),
  });
}


export const MATERIAL_TEMPLATE_CLAIMS_V1:
  readonly MaterialTemplateClaimTypeV1[] =
    Object.freeze([
      "PRICE",
      "TIME",
      "RANKING",
      "POPULARITY",
      "HEALTH",
      "SAFETY",
      "LEGAL",
      "INSURANCE",
      "WARRANTY",
      "CERTIFICATION",
      "PERFORMANCE",
      "ORDER_COUNT",
      "CUSTOMER_COUNT",
      "ENVIRONMENTAL",
      "SUPERLATIVE",
    ]);


export const ARTICLE_SEARCH_OPTIMIZATION_POLICY_V1 =
  Object.freeze({
    version:
      "ARTICLE_SEARCH_OPTIMIZATION_POLICY_V1" as const,

    h1Count:
      1 as const,

    primaryQueryCount:
      1 as const,

    keywordDensityTarget:
      null,

    fixedSecondaryKeywordCount:
      null,

    fixedWordCount:
      null,

    dynamicHeadingAllocation:
      true as const,

    dynamicFaq:
      true as const,

    supportingQueriesAreJobs:
      true as const,

    directAnswerPreferredForInformationalIntent:
      true as const,

    queryFanOutCoverage:
      true as const,

    originalValueRequired:
      true as const,

    materialClaimsRequireEvidence:
      true as const,

    fakeCaseStudiesForbidden:
      true as const,

    fakeRankingMethodologyForbidden:
      true as const,

    doorwayGeoPagesForbidden:
      true as const,

    specialAiKeywordDensity:
      false as const,

    specialAiSchemaRequired:
      false as const,
  });


export const ARTICLE_TEMPLATE_POLICIES_V1:
  Readonly<
    Record<
      ArticleTemplateIdV1,
      Readonly<ArticleTemplatePolicyV1>
    >
  > =
    Object.freeze({
      EXPLAINER_GUIDE:
        makePolicy({
          id:
            "EXPLAINER_GUIDE",

          h2PlanningRange:
            r(4, 8),

          h3PlanningRange:
            r(0, 10),

          supportingQueryJobRange:
            r(4, 10),

          questionJobRange:
            r(2, 6),

          requiredRoles: [
            "CORE_ANSWER",
            "DEFINITION",
            "MECHANISM",
            "LIMITATION",
          ],

          optionalRoles: [
            "BENEFIT",
            "COST",
            "ELIGIBILITY",
            "USE_CASE",
            "FAQ",
            "CTA",
            "COMPARISON",
          ],

          evidenceSensitiveRoles: [
            "BENEFIT",
            "COST",
            "COMPARISON",
          ],

          allowRanking:
            false,

          allowLocalContext:
            false,

          allowCommercialCta:
            true,

          requiresFirstPartyExperience:
            false,
        }),


      HOW_TO:
        makePolicy({
          id:
            "HOW_TO",

          h2PlanningRange:
            r(4, 9),

          h3PlanningRange:
            r(3, 15),

          supportingQueryJobRange:
            r(4, 10),

          questionJobRange:
            r(2, 6),

          requiredRoles: [
            "CORE_ANSWER",
            "HOW_TO",
            "PROCESS",
            "LIMITATION",
          ],

          optionalRoles: [
            "ELIGIBILITY",
            "OBJECTION",
            "FAQ",
            "CTA",
          ],

          evidenceSensitiveRoles: [
            "HOW_TO",
            "LIMITATION",
          ],

          allowRanking:
            false,

          allowLocalContext:
            false,

          allowCommercialCta:
            true,

          requiresFirstPartyExperience:
            false,
        }),


      LOCAL_SERVICE_GUIDE:
        makePolicy({
          id:
            "LOCAL_SERVICE_GUIDE",

          h2PlanningRange:
            r(5, 10),

          h3PlanningRange:
            r(2, 12),

          supportingQueryJobRange:
            r(5, 12),

          questionJobRange:
            r(3, 8),

          requiredRoles: [
            "CORE_ANSWER",
            "LOCAL_CONTEXT",
            "PROCESS",
            "ELIGIBILITY",
            "LIMITATION",
          ],

          optionalRoles: [
            "BENEFIT",
            "COST",
            "PROOF",
            "TRUST",
            "FAQ",
            "CTA",
          ],

          evidenceSensitiveRoles: [
            "LOCAL_CONTEXT",
            "COST",
            "PROOF",
            "TRUST",
          ],

          allowRanking:
            false,

          allowLocalContext:
            true,

          allowCommercialCta:
            true,

          requiresFirstPartyExperience:
            false,
        }),


      SERVICE_LANDING:
        makePolicy({
          id:
            "SERVICE_LANDING",

          h2PlanningRange:
            r(4, 8),

          h3PlanningRange:
            r(2, 10),

          supportingQueryJobRange:
            r(4, 10),

          questionJobRange:
            r(2, 6),

          requiredRoles: [
            "CORE_ANSWER",
            "FEATURE",
            "PROCESS",
            "TRUST",
            "CTA",
          ],

          optionalRoles: [
            "BENEFIT",
            "COST",
            "LOCAL_CONTEXT",
            "PROOF",
            "FAQ",
          ],

          evidenceSensitiveRoles: [
            "COST",
            "TRUST",
            "PROOF",
          ],

          allowRanking:
            false,

          allowLocalContext:
            true,

          allowCommercialCta:
            true,

          requiresFirstPartyExperience:
            true,
        }),


      COMPARISON:
        makePolicy({
          id:
            "COMPARISON",

          h2PlanningRange:
            r(5, 9),

          h3PlanningRange:
            r(3, 14),

          supportingQueryJobRange:
            r(5, 12),

          questionJobRange:
            r(2, 6),

          requiredRoles: [
            "CORE_ANSWER",
            "COMPARISON",
            "PURCHASE_CRITERIA",
            "DECISION_SUPPORT",
            "LIMITATION",
          ],

          optionalRoles: [
            "COST",
            "BENEFIT",
            "ELIGIBILITY",
            "FAQ",
            "CTA",
          ],

          evidenceSensitiveRoles: [
            "COMPARISON",
            "COST",
            "DECISION_SUPPORT",
          ],

          allowRanking:
            false,

          allowLocalContext:
            true,

          allowCommercialCta:
            true,

          requiresFirstPartyExperience:
            false,
        }),


      RANKED_LIST:
        makePolicy({
          id:
            "RANKED_LIST",

          h2PlanningRange:
            r(4, 12),

          h3PlanningRange:
            r(0, 20),

          supportingQueryJobRange:
            r(6, 15),

          questionJobRange:
            r(2, 6),

          requiredRoles: [
            "CORE_ANSWER",
            "PURCHASE_CRITERIA",
            "COMPARISON",
            "DECISION_SUPPORT",
          ],

          optionalRoles: [
            "FEATURE",
            "LIMITATION",
            "PROOF",
            "FAQ",
            "CTA",
          ],

          evidenceSensitiveRoles: [
            "COMPARISON",
            "PROOF",
            "DECISION_SUPPORT",
          ],

          allowRanking:
            true,

          allowLocalContext:
            true,

          allowCommercialCta:
            true,

          requiresFirstPartyExperience:
            false,
        }),


      CURATED_LIST:
        makePolicy({
          id:
            "CURATED_LIST",

          h2PlanningRange:
            r(3, 10),

          h3PlanningRange:
            r(0, 16),

          supportingQueryJobRange:
            r(5, 15),

          questionJobRange:
            r(2, 5),

          requiredRoles: [
            "CORE_ANSWER",
            "USE_CASE",
          ],

          optionalRoles: [
            "FEATURE",
            "PURCHASE_CRITERIA",
            "LIMITATION",
            "FAQ",
            "CTA",
          ],

          evidenceSensitiveRoles: [
            "FEATURE",
          ],

          allowRanking:
            false,

          allowLocalContext:
            true,

          allowCommercialCta:
            true,

          requiresFirstPartyExperience:
            false,
        }),


      PRODUCT_DETAIL_EDUCATION:
        makePolicy({
          id:
            "PRODUCT_DETAIL_EDUCATION",

          h2PlanningRange:
            r(4, 8),

          h3PlanningRange:
            r(2, 10),

          supportingQueryJobRange:
            r(4, 10),

          questionJobRange:
            r(3, 8),

          requiredRoles: [
            "CORE_ANSWER",
            "FEATURE",
            "USE_CASE",
            "LIMITATION",
            "CTA",
          ],

          optionalRoles: [
            "HOW_TO",
            "BENEFIT",
            "FAQ",
            "TRUST",
          ],

          evidenceSensitiveRoles: [
            "FEATURE",
            "BENEFIT",
            "TRUST",
          ],

          allowRanking:
            false,

          allowLocalContext:
            false,

          allowCommercialCta:
            true,

          requiresFirstPartyExperience:
            false,
        }),


      PRODUCT_REVIEW:
        makePolicy({
          id:
            "PRODUCT_REVIEW",

          h2PlanningRange:
            r(5, 9),

          h3PlanningRange:
            r(3, 12),

          supportingQueryJobRange:
            r(5, 12),

          questionJobRange:
            r(2, 6),

          requiredRoles: [
            "CORE_ANSWER",
            "FEATURE",
            "PROOF",
            "LIMITATION",
            "DECISION_SUPPORT",
          ],

          optionalRoles: [
            "COMPARISON",
            "PURCHASE_CRITERIA",
            "FAQ",
            "CTA",
          ],

          evidenceSensitiveRoles: [
            "FEATURE",
            "PROOF",
            "COMPARISON",
            "DECISION_SUPPORT",
          ],

          allowRanking:
            false,

          allowLocalContext:
            false,

          allowCommercialCta:
            true,

          requiresFirstPartyExperience:
            true,
        }),


      COMMERCIAL_CATEGORY:
        makePolicy({
          id:
            "COMMERCIAL_CATEGORY",

          h2PlanningRange:
            r(3, 7),

          h3PlanningRange:
            r(2, 10),

          supportingQueryJobRange:
            r(5, 15),

          questionJobRange:
            r(2, 6),

          requiredRoles: [
            "CORE_ANSWER",
            "PURCHASE_CRITERIA",
            "FEATURE",
            "CTA",
          ],

          optionalRoles: [
            "COMPARISON",
            "USE_CASE",
            "LIMITATION",
            "FAQ",
            "TRUST",
          ],

          evidenceSensitiveRoles: [
            "FEATURE",
            "COMPARISON",
            "TRUST",
          ],

          allowRanking:
            false,

          allowLocalContext:
            true,

          allowCommercialCta:
            true,

          requiresFirstPartyExperience:
            false,
        }),


      LOCAL_DIRECTORY:
        makePolicy({
          id:
            "LOCAL_DIRECTORY",

          h2PlanningRange:
            r(3, 10),

          h3PlanningRange:
            r(0, 20),

          supportingQueryJobRange:
            r(6, 15),

          questionJobRange:
            r(2, 5),

          requiredRoles: [
            "CORE_ANSWER",
            "LOCAL_CONTEXT",
            "COMPARISON",
            "DECISION_SUPPORT",
          ],

          optionalRoles: [
            "PURCHASE_CRITERIA",
            "PROOF",
            "FAQ",
          ],

          evidenceSensitiveRoles: [
            "LOCAL_CONTEXT",
            "COMPARISON",
            "PROOF",
          ],

          allowRanking:
            true,

          allowLocalContext:
            true,

          allowCommercialCta:
            true,

          requiresFirstPartyExperience:
            false,
        }),


      AUDIENCE_USE_CASE:
        makePolicy({
          id:
            "AUDIENCE_USE_CASE",

          h2PlanningRange:
            r(4, 8),

          h3PlanningRange:
            r(2, 10),

          supportingQueryJobRange:
            r(4, 12),

          questionJobRange:
            r(2, 6),

          requiredRoles: [
            "CORE_ANSWER",
            "USE_CASE",
            "BENEFIT",
            "LIMITATION",
          ],

          optionalRoles: [
            "HOW_TO",
            "FEATURE",
            "FAQ",
            "CTA",
          ],

          evidenceSensitiveRoles: [
            "BENEFIT",
          ],

          allowRanking:
            false,

          allowLocalContext:
            true,

          allowCommercialCta:
            true,

          requiresFirstPartyExperience:
            false,
        }),


      IDEAS_USE_CASES:
        makePolicy({
          id:
            "IDEAS_USE_CASES",

          h2PlanningRange:
            r(3, 9),

          h3PlanningRange:
            r(0, 18),

          supportingQueryJobRange:
            r(5, 15),

          questionJobRange:
            r(2, 6),

          requiredRoles: [
            "CORE_ANSWER",
            "USE_CASE",
          ],

          optionalRoles: [
            "HOW_TO",
            "BENEFIT",
            "LIMITATION",
            "FAQ",
            "CTA",
          ],

          evidenceSensitiveRoles: [
            "BENEFIT",
          ],

          allowRanking:
            false,

          allowLocalContext:
            false,

          allowCommercialCta:
            true,

          requiresFirstPartyExperience:
            false,
        }),


      PROBLEM_SOLUTION:
        makePolicy({
          id:
            "PROBLEM_SOLUTION",

          h2PlanningRange:
            r(4, 8),

          h3PlanningRange:
            r(2, 12),

          supportingQueryJobRange:
            r(4, 10),

          questionJobRange:
            r(2, 6),

          requiredRoles: [
            "CORE_ANSWER",
            "ELIGIBILITY",
            "HOW_TO",
            "LIMITATION",
          ],

          optionalRoles: [
            "PROCESS",
            "COMPARISON",
            "OBJECTION",
            "FAQ",
            "CTA",
          ],

          evidenceSensitiveRoles: [
            "HOW_TO",
            "LIMITATION",
          ],

          allowRanking:
            false,

          allowLocalContext:
            true,

          allowCommercialCta:
            true,

          requiresFirstPartyExperience:
            false,
        }),


      BRAND_SHOP_HUB:
        makePolicy({
          id:
            "BRAND_SHOP_HUB",

          h2PlanningRange:
            r(3, 7),

          h3PlanningRange:
            r(0, 8),

          supportingQueryJobRange:
            r(3, 8),

          questionJobRange:
            r(1, 5),

          requiredRoles: [
            "CORE_ANSWER",
            "FEATURE",
            "TRUST",
            "CTA",
          ],

          optionalRoles: [
            "USE_CASE",
            "PURCHASE_CRITERIA",
            "FAQ",
          ],

          evidenceSensitiveRoles: [
            "FEATURE",
            "TRUST",
          ],

          allowRanking:
            false,

          allowLocalContext:
            true,

          allowCommercialCta:
            true,

          requiresFirstPartyExperience:
            true,
        }),
    });


export const ARTICLE_TEMPLATE_OPTIONS_V1:
  readonly Readonly<{
    id: ArticleTemplateIdV1;
    label: string;
  }>[] =
    Object.freeze([
      { id: "EXPLAINER_GUIDE", label: "Guide / Explainer" },
      { id: "HOW_TO", label: "How-to" },
      { id: "COMPARISON", label: "Comparison" },
      { id: "CURATED_LIST", label: "List / Roundup" },
      { id: "RANKED_LIST", label: "Ranked list" },
      { id: "PRODUCT_DETAIL_EDUCATION", label: "Product" },
      { id: "PRODUCT_REVIEW", label: "Product review" },
      { id: "SERVICE_LANDING", label: "Service" },
      { id: "LOCAL_SERVICE_GUIDE", label: "Local service guide" },
      { id: "LOCAL_DIRECTORY", label: "Local directory" },
      { id: "AUDIENCE_USE_CASE", label: "Audience / Use case" },
      { id: "IDEAS_USE_CASES", label: "Ideas" },
      { id: "PROBLEM_SOLUTION", label: "Problem / Solution" },
      { id: "COMMERCIAL_CATEGORY", label: "Category / Collection" },
      { id: "BRAND_SHOP_HUB", label: "Brand / Shop" },
    ]);


const ARTICLE_TEMPLATE_ID_SET =
  new Set<string>(
    Object.keys(
      ARTICLE_TEMPLATE_POLICIES_V1
    )
  );


export function isArticleTemplateIdV1(
  value:
    unknown
): value is ArticleTemplateIdV1 {
  return (
    typeof value ===
      "string" &&
    ARTICLE_TEMPLATE_ID_SET.has(
      value
    )
  );
}


export function parseArticleTemplateOverrideV1(
  value:
    unknown
): ArticleTemplateIdV1 | null {
  if (
    value ===
      undefined ||
    value ===
      null ||
    value ===
      "" ||
    value ===
      "AUTO"
  ) {
    return null;
  }

  if (
    !isArticleTemplateIdV1(
      value
    )
  ) {
    throw new Error(
      "ARTICLE_TEMPLATE_OVERRIDE_INVALID"
    );
  }

  return value;
}


export type DominantSerpPageTypeV1 =
  | "INFORMATIONAL"
  | "HOW_TO"
  | "LOCAL_SERVICE"
  | "SERVICE"
  | "COMPARISON"
  | "RANKED_LIST"
  | "CURATED_LIST"
  | "PRODUCT"
  | "PRODUCT_REVIEW"
  | "CATEGORY"
  | "LOCAL_DIRECTORY"
  | "AUDIENCE_USE_CASE"
  | "HEALTH_NUTRITION"
  | "IDEAS"
  | "PROBLEM_SOLUTION"
  | "BRAND_SHOP";


export interface ArticleTemplateRoutingInputV1 {
  readonly primaryQuery:
    string;

  readonly intent?:
    string | null;

  readonly pageType?:
    string | null;

  readonly dominantSerpPageType?:
    DominantSerpPageTypeV1 | null;

  readonly hasGeoIntent?:
    boolean;

  readonly rankingEvidenceAvailable?:
    boolean;

  readonly firstPartyExperienceAvailable?:
    boolean;
}


function normalized(
  value:
    string | null | undefined
): string {
  return (
    value ??
    ""
  )
    .trim()
    .toLowerCase();
}


function template(
  id:
    ArticleTemplateIdV1
): Readonly<ArticleTemplatePolicyV1> {
  return ARTICLE_TEMPLATE_POLICIES_V1[
    id
  ];
}


export function selectArticleTemplateV1(
  input:
    Readonly<ArticleTemplateRoutingInputV1>
): Readonly<ArticleTemplatePolicyV1> {
  const query =
    normalized(
      input.primaryQuery
    );

  const intent =
    normalized(
      input.intent
    );

  const pageType =
    normalized(
      input.pageType
    );

  const serp =
    input.dominantSerpPageType;


  if (serp === "COMPARISON") {
    return template("COMPARISON");
  }

  if (serp === "HOW_TO") {
    return template("HOW_TO");
  }

  if (serp === "RANKED_LIST") {
    return template(
      input.rankingEvidenceAvailable
        ? "RANKED_LIST"
        : "CURATED_LIST"
    );
  }

  if (serp === "CURATED_LIST") {
    return template("CURATED_LIST");
  }

  if (serp === "LOCAL_DIRECTORY") {
    return template(
      input.rankingEvidenceAvailable
        ? "LOCAL_DIRECTORY"
        : "CURATED_LIST"
    );
  }

  if (serp === "LOCAL_SERVICE") {
    return template("LOCAL_SERVICE_GUIDE");
  }

  if (serp === "SERVICE") {
    return template("SERVICE_LANDING");
  }

  if (serp === "PRODUCT") {
    return template("PRODUCT_DETAIL_EDUCATION");
  }

  if (serp === "PRODUCT_REVIEW") {
    return template("PRODUCT_REVIEW");
  }

  if (serp === "CATEGORY") {
    return template("COMMERCIAL_CATEGORY");
  }

  if (serp === "AUDIENCE_USE_CASE") {
    return template("AUDIENCE_USE_CASE");
  }

  /*
   * HEALTH_NUTRITION is deliberately NOT a structural template.
   * Health belongs to ContentRiskProfileV1.
   */
  if (serp === "HEALTH_NUTRITION") {
    return template("EXPLAINER_GUIDE");
  }

  if (serp === "IDEAS") {
    return template("IDEAS_USE_CASES");
  }

  if (serp === "PROBLEM_SOLUTION") {
    return template("PROBLEM_SOLUTION");
  }

  if (serp === "BRAND_SHOP") {
    return template("BRAND_SHOP_HUB");
  }


  if (
    /\b(vs\.?|versus|comparison|compare|difference between)\b/i
      .test(query)
  ) {
    return template("COMPARISON");
  }


  if (
    /\bhow to\b/i.test(query) ||
    /\bhow-to\b/i.test(pageType)
  ) {
    return template("HOW_TO");
  }


  if (
    /\b(best|top)\b/i.test(query)
  ) {
    return template(
      input.rankingEvidenceAvailable
        ? "RANKED_LIST"
        : "CURATED_LIST"
    );
  }


  if (
    /\b(ideas?|ways to use|recipes?|gifts?)\b/i
      .test(query)
  ) {
    return template("IDEAS_USE_CASES");
  }


  if (
    input.hasGeoIntent &&
    /\b(best|top|stores?|shops?|restaurants?|providers?)\b/i
      .test(query)
  ) {
    return template(
      input.rankingEvidenceAvailable
        ? "LOCAL_DIRECTORY"
        : "CURATED_LIST"
    );
  }


  if (
    input.hasGeoIntent
  ) {
    return template(
      "LOCAL_SERVICE_GUIDE"
    );
  }


  if (
    /\b(review|tested|hands-on)\b/i
      .test(query)
  ) {
    return template(
      "PRODUCT_REVIEW"
    );
  }


  if (
    /\b(buy|shop|products?|price|pricing)\b/i
      .test(query) ||
    /\b(commercial|transactional)\b/i
      .test(intent)
  ) {
    return template(
      "COMMERCIAL_CATEGORY"
    );
  }


  if (
    /\b(fix|repair|solve|problem|issue|troubleshoot)\b/i
      .test(query)
  ) {
    return template(
      "PROBLEM_SOLUTION"
    );
  }


  return template(
    "EXPLAINER_GUIDE"
  );
}


export function templateAllowsClaimWithoutEvidenceV1(
  claimType:
    MaterialTemplateClaimTypeV1
): false {
  void claimType;

  return false;
}


export function shouldUseFaqRoleV1({
  uncoveredQuestionJobCount,
}: {
  readonly uncoveredQuestionJobCount:
    number;
}): boolean {
  return (
    Number.isInteger(
      uncoveredQuestionJobCount
    ) &&
    uncoveredQuestionJobCount >
      0
  );
}


export function deriveHeadingPlanningBoundsV1(
  policy:
    Readonly<ArticleTemplatePolicyV1>
) {
  return Object.freeze({
    h1:
      Object.freeze({
        min:
          1 as const,

        max:
          1 as const,
      }),

    h2:
      policy.h2PlanningRange,

    h3:
      policy.h3PlanningRange,

    authority:
      "PLANNING_GUIDANCE_ONLY" as const,
  });
}
