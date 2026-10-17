/**
 * Pure semantic stage-plan prompt assembly.
 * Extracted unchanged from production-master-live-stage-planner.ts;
 * planning evidence and numerical metrics remain separate authorities.
 * The mission type-only import does not introduce a runtime cycle.
 */
import {
  ARTICLE_TEMPLATE_POLICIES_V1,
  selectArticleTemplateV1,
  type ArticleTemplatePolicyV1,
} from "./article-template-policy-v1";
import {
  buildRiskProfilePromptV1,
  deriveContentRiskProfileV1,
} from "./content-risk-profile-v1";
import type {
  ProductionMasterLiveSourceResearch,
} from "./production-master-live-source-adapter";
import type {
  ProductionMasterLiveStagePlanMissionInput,
} from "./production-master-live-stage-planner";

export function resolveSelectedTemplatePolicyV1({
  research,
  mission,
}: {
  research:
    Readonly<ProductionMasterLiveSourceResearch>;

  mission:
    ProductionMasterLiveStagePlanMissionInput;
}): Readonly<ArticleTemplatePolicyV1> {
  return mission.templateOverride
    ? ARTICLE_TEMPLATE_POLICIES_V1[
        mission.templateOverride
      ]
    : selectArticleTemplateV1({
        primaryQuery:
          research.keyword,

        intent:
          String(
            mission.missionIntent
          ),

        hasGeoIntent:
          String(
            mission.missionIntent
          ).toUpperCase() ===
          "LOCAL",

        /*
         * Ranking claims remain fail-closed until real
         * ranking methodology evidence is wired.
         */
        rankingEvidenceAvailable:
          false,

        /*
         * Review first-party experience is proven later by
         * Original Value assets, not inferred from the query.
         */
        firstPartyExperienceAvailable:
          false,
      });
}


export function buildStagePlanPrompt({
  research,
  mission,
}: {
  research: Readonly<ProductionMasterLiveSourceResearch>;
  mission: ProductionMasterLiveStagePlanMissionInput;
}): string {
  const serpLines = research.serpSnapshot.results
    .slice(0, 10)
    .map(
      (result) =>
        `- rank ${result.rank}: ${result.url} (${result.domain})`
    )
    .join("\n");

  const selectedTemplate =
    resolveSelectedTemplatePolicyV1({
      research,
      mission,
    });


  const riskProfile =
    deriveContentRiskProfileV1({
      query:
        research.keyword,

      riskClass:
        String(
          mission.riskClass
        ),
    });


  const articleTemplatePolicyPrompt =
    [
      "ARTICLE_TEMPLATE_POLICY_V1:",
      `templateId=${selectedTemplate.id}`,
      `requiredSemanticRoles=${JSON.stringify(selectedTemplate.requiredRoles)}`,
      `optionalSemanticRoles=${JSON.stringify(selectedTemplate.optionalRoles)}`,
      `evidenceSensitiveRoles=${JSON.stringify(selectedTemplate.evidenceSensitiveRoles)}`,
      `h2PlanningRange=${selectedTemplate.h2PlanningRange.min}-${selectedTemplate.h2PlanningRange.max}`,
      `h3PlanningRange=${selectedTemplate.h3PlanningRange.min}-${selectedTemplate.h3PlanningRange.max}`,
      "",
      "CRITICAL TEMPLATE RULES:",
      "- The template is planning guidance, NOT a second outline authority.",
      "- Create only distinct information jobs justified by search intent, live SERP evidence, questions, topics, and useful coverage.",
      "ADAPTIVE_INFORMATION_JOB_STRUCTURE_V1:",
      "- H2 count is adaptive. One H2 should represent one genuinely distinct MAJOR information job, not one keyword variation.",
      "- For comprehensive informational plans, most H2s must own at least one concrete plan.topics job, observed same-page plan.questions job, or atomic factual claim hypothesis that can be verified before writing. Bare heading plus a generic mission is not adequate coverage.",
      "- Make each section.expectedOutcome describe a distinct decision, understanding or next step; never generate an extra H2 solely to meet the six-section minimum.",
      "- When a section owns multiple independent, supported child decisions or observed same-intent questions, assign them explicitly to that SAME section and plan their factual facets. This gives Writer legitimate H3 opportunities without inventing headings, search queries or evidence.",
      "- Do NOT stop at the minimum planning range when live PAA questions, required topics, supporting queries, competitor gaps, or decision jobs prove additional distinct information needs.",
      "- If one proposed section owns multiple questions/topics that require materially different answers, split them into separate H2 sections.",
      "- Keep related variants in one section when they require substantially the same answer.",
      "- Use H3 only for meaningful child jobs inside one H2; never create H3 merely to increase heading count.",
      "- Treat live medianH2 and medianH3 only as soft under/over-coverage context, never as quotas.",
      "- Prefer complete coverage with 5-9 useful H2s over four overloaded sections when the query actually contains enough distinct information jobs; this is editorial planning guidance, not a Google ranking rule.",
      "- Required semantic roles may be combined into one section when they represent one information job.",
      "- Every section MUST declare roles: ArticleSectionRoleV1[] using only roles allowed by this selected template.",
      "- Across all sections, every requiredSemanticRole MUST be covered at least once.",
      "- roles are semantic annotations only; they MUST NOT create filler sections or become a parallel outline.",
      "- Do NOT create filler sections merely to hit the planning range.",
      "- Do NOT create headings merely to repeat keywords.",
      "- FAQ is allowed only for real unanswered question jobs.",
      "- A RANKED_LIST may not invent ranking methodology, scores, winners, popularity, or ordinal claims.",
      "- A PRODUCT_REVIEW may not invent hands-on testing or first-party experience.",
      "- Local pages require genuine local relevance; do not create doorway-style geographic filler.",
      "- The resulting validated ArticleExecutionPlan remains the sole structural authority consumed by Writer.",
    ].join(
      "\n"
    );


  const riskProfilePrompt =
    buildRiskProfilePromptV1(
      riskProfile
    );


  return `You are the production Stage 2-8 research planner for an SEO content system.

You will decide SEMANTICS ONLY. You must NEVER invent numbers (search volume, CPC, impressions, clicks, position, SERP frequency). Those are added by deterministic code from real data after you respond.

Website: ${mission.websiteId}
Topic: ${mission.topic}
Audience: ${mission.audience}
Reader goal: ${mission.readerGoal}
Language: ${mission.language}
Location: ${mission.location}

${articleTemplatePolicyPrompt}

${riskProfilePrompt}

Real primary keyword observed live: "${research.keyword}"

Top 10 real live SERP results for this keyword:
${serpLines}

Real People-Also-Ask questions observed live:
${research.serpIntelligence.questions.slice(0, 10).map((q) => `- ${q}`).join("\n") || "(none observed)"}

AI Overview present in live SERP: ${research.serpIntelligence.aiOverview.present}

Respond with JSON only, matching exactly this shape:
{
  "primaryQuery": "string, must equal the real primary keyword above",
  "pageType": "string, e.g. explainer, comparison, how-to, tool",
  "intent": "INFORMATIONAL | COMMERCIAL | TRANSACTIONAL | NAVIGATIONAL | LOCAL",
  "action": "CREATE" | "UPDATE" | "MERGE" | "SPLIT" | "REPOSITION" | "NO_GO",
  "questions": ["string", "..."],
  "queries": [
    {
      "query": "string -- MUST exactly equal one query from the allowed observed-query list supplied below; never paraphrase or invent a query identity",
      "intent": "INFORMATIONAL" | "COMMERCIAL" | "TRANSACTIONAL" | "NAVIGATIONAL" | "LOCAL",
      "subIntent": "short string",
      "cluster": "short string grouping label",
      "siteCoverage": "NONE" | "WEAK" | "STRONG"
    }
  ],
  "topics": [
    {
      "topic": "string, distinct information need",
      "missionRelevance": 0.0-1.0,
      "evidenceRequirement": "NONE" | "STANDARD" | "VERIFIED_SOURCE" | "PRIMARY_SOURCE",
      "queries": ["must reference query strings from the queries array above"],
      "competitorCoverage": "NONE" | "WEAK" | "STRONG" | "UNKNOWN",
      "competitorClarity": "WEAK" | "STRONG" | "UNKNOWN",
      "competitorEvidence": "WEAK" | "STRONG" | "UNKNOWN",
      "competitorAction": "WEAK" | "STRONG" | "NOT_APPLICABLE" | "UNKNOWN",
      "originalValueOpportunity": true | false
    }
  ],
  "claims": [
    {
      "id": "short stable slug, e.g. claim-definition",
      "text": "the factual claim the article will make",
      "category": "FACT" | "STATISTIC" | "FINANCIAL" | "LEGAL" | "PRODUCT" | "PRICE" | "COMPARISON",
      "risk": "LOW" | "MEDIUM" | "HIGH",
      "supportedByBusinessFact": true | false
    }
  ],
  "sections": [
    {
      "heading": "string",
      "mission": "one distinct information job, must be unique across sections",
      "expectedOutcome": "what the reader should know/do after this section",
      "queries": ["query strings this section answers, from the queries array"],
      "topics": ["exact topic strings from the topics array this section owns"],
      "questions": ["exact question strings from the questions array this section answers"],
      "roles": ["semantic roles from ARTICLE_TEMPLATE_POLICY_V1 that this section actually performs"],
      "requiredClaimIds": ["claim ids from the claims array this section relies on"]
    }
  ]
}

Rules:
- CLAIM CATEGORY POLICY:
  - LEGAL is ONLY for actual law, regulation, statutory rights, legal duties, court requirements, or explicit regulatory propositions.
  - Do NOT label a claim LEGAL merely because its subject is insurance, finance, credit, identity protection, or another regulated industry.
  - Insurance coverage, reimbursement, plan scope, service capabilities, provider features, and product behavior belong to PRODUCT unless the proposition itself makes an actual legal assertion.
  - Prices and fees belong to PRICE.
  - Comparative propositions belong to COMPARISON.
  - General factual propositions belong to FACT.
- Do not fabricate statistics, prices, guarantees, or studies. Only use "supportedByBusinessFact": true for claims that are genuinely generic/definitional or would be backed by the business's own verified facts.
- At least one topic array is required.
- At least one section is required, and its "mission" values must all be distinct.
- The "queries" primary entry MUST be "${research.keyword}" exactly.
- Base competitor quality judgments only on what a reasonable analyst would infer from ranking for this keyword; if uncertain, use "UNKNOWN".
- Respond with JSON only. No markdown fences, no commentary.`;
}
