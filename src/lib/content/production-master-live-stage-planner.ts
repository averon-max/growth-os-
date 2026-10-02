import {
  ARTICLE_TEMPLATE_POLICIES_V1,
  selectArticleTemplateV1,
  type ArticleTemplateIdV1,
  type ArticleSectionRoleV1,
  type ArticleTemplatePolicyV1,
} from "./article-template-policy-v1";

import {
  assertTemplateCoverageV1,
} from "./template-coverage-validator-v1";

import {
  assertProductionTemplateEvidenceGateV1,
} from "./production-template-evidence-gate-v1";


import {
  buildRiskProfilePromptV1,
  deriveContentRiskProfileV1,
} from "./content-risk-profile-v1";

import {
  callContentAiJson,
} from "./gemini-generator";

import {
  DEFAULT_GEMINI_CONTENT_MODEL,
  GEMINI_RETRYABLE_STATUS_CODES,
  geminiRetryDelayMs,
  geminiTransportErrorMessage,
  isRetryableGeminiTransportError,
  resolveGeminiContentModel,
} from "./gemini-reliability";

import {
  collectProductionMasterLiveSources,
  type ProductionMasterLiveSourceResearch,
  type ProductionMasterLiveSourceInput,
} from "./production-master-live-source-adapter";

import {
  buildProductionRankingInputs,
  buildSerpCompetitiveCoveragePrompt,
} from "./production-ranking-inputs";

import {
  planProductionOriginalValue,
} from "./production-original-value-planner";

import {
  buildInternalLinkSelectionV1,
} from "./internal-link-planner-v1";


import {
  buildMediaRequirementsForAssignedAssetV1,
} from "./media-requirements-v1";


import {
  applyCompetitorInformationGainV1,
  buildCompetitorInformationGainV1,
} from "./competitor-information-gain-v1";

import {
  buildProductionMasterLiveSourceBundle,
  type ProductionMasterLiveStageContract,
} from "./production-master-live-research-assembler";

import type {
  ProductionMasterArtifactPipelineInput,
} from "./production-master-artifact-builders";

import {
  buildArticleExecutionPlanV1,
  type ArticleExecutionPlanV1,
} from "./article-execution-plan-v1";

import type {
  ExplicitSearchMissionInput,
} from "./search-mission-ingress";

import type {
  QuerySiteCoverage,
} from "./query-graph";

import type {
  QueryIntent,
} from "./intent-boundary";

import type {
  CoverageEvidenceRequirement,
} from "./expected-coverage";

import type {
  CompetitorCoverageQuality,
  CompetitorClarityQuality,
  CompetitorEvidenceQuality,
  CompetitorActionQuality,
} from "./gap-engine";

import type {
  ClaimCategory,
  ClaimRisk,
} from "./claim-ledger";

import type {
  EvidenceSourceType,
} from "./evidence-graph";

import { defaultAuthorityTier } from "./evidence-graph";

import {
  enrichLiveEvidenceGraphV1,
  assignVerifiedEvidenceToSectionsV1,
  assignVerifiedEvidenceToExplicitSectionsV2,
  discoverClaimEvidenceFallbackSourcesV1,
} from "./live-evidence-verification";


/*
 * STAGE 9N-B3.6
 * -------------
 *
 * This module is the ONLY place that turns live acquisition
 * (production-master-live-source-adapter) into semantic Stage 1-8
 * *decisions* (topics, gap observations, claims, section outline).
 *
 * It performs exactly one AI inference call.
 *
 * It does NOT invent numeric metrics. Every searchVolume / cpc /
 * gscImpressions / gscClicks / gscPosition / serpFrequency value
 * placed into the returned stages is resolved deterministically
 * from `research`, never taken from the model's output. This
 * guarantees the anchoring checks in
 * production-master-live-research-assembler.ts always pass for
 * values this module fills in.
 */


export class ProductionMasterLiveStagePlanError extends Error {
  readonly code: string;

  constructor(code: string, message = code) {
    super(message);
    this.name = "ProductionMasterLiveStagePlanError";
    this.code = code;
  }
}


export interface ProductionMasterLiveStagePlanMissionInput {
  websiteId: string;
  topic: string;
  audience: string;
  readerGoal: string;
  businessRelationship: ExplicitSearchMissionInput["businessRelationship"];
  jurisdiction?: string;
  language: string;
  location: string;
  riskClass: ExplicitSearchMissionInput["riskClass"];
  missionIntent: QueryIntent;

  /*
   * Optional explicit user choice from Create Content.
   * null/undefined = AUTO.
   *
   * This guides planning only.
   * ArticleExecutionPlan remains the structural authority.
   */
  templateOverride?:
    ArticleTemplateIdV1 | null;
}


export interface ProductionMasterLiveStagePlanResult {
  masterArtifacts: ProductionMasterArtifactPipelineInput;
  searchMissionInput: ExplicitSearchMissionInput;
  research: Readonly<ProductionMasterLiveSourceResearch>;

  /*
   * ARTICLE_EXECUTION_PLAN_V1
   *
   * Single topic-agnostic execution contract produced from the
   * same live Stage Plan + verified evidence that created
   * Master Runtime.
   */
  articleExecutionPlan: Readonly<ArticleExecutionPlanV1>;
}


// ----------------------------------------------------------------
// Minimal self-contained Gemini call (mirrors gemini-generator.ts
// callGemini/parseJson pattern; kept local so this module has no
// dependency on the large ContentGenerator union type).
// ----------------------------------------------------------------

const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta";

const GEMINI_TIMEOUT_MS = 60000;
const MAX_RETRIES = 5;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new ProductionMasterLiveStagePlanError(
      "LIVE_STAGE_PLAN_ENV_MISSING",
      `${name} is not set`
    );
  }
  return value;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGeminiForStagePlan(prompt: string): Promise<string> {
  const apiKey = requireEnv("GEMINI_API_KEY");
  const model = resolveGeminiContentModel() || DEFAULT_GEMINI_CONTENT_MODEL;

  let lastError: unknown = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

    try {
      const response = await fetch(
        `${GEMINI_API_BASE}/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
            },
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        if (
          GEMINI_RETRYABLE_STATUS_CODES.has(response.status) &&
          attempt < MAX_RETRIES - 1
        ) {
          const delay = geminiRetryDelayMs({
            attempt,
            retryAfterHeader: response.headers.get("retry-after"),
          });
          await sleep(delay);
          continue;
        }

        throw new ProductionMasterLiveStagePlanError(
          "LIVE_STAGE_PLAN_GEMINI_HTTP_ERROR",
          `Gemini stage planning failed: HTTP ${response.status}`
        );
      }

      const data = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new ProductionMasterLiveStagePlanError(
          "LIVE_STAGE_PLAN_GEMINI_EMPTY_RESPONSE"
        );
      }

      return text;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;

      if (
        isRetryableGeminiTransportError(error) &&
        attempt < MAX_RETRIES - 1
      ) {
        const delay = geminiRetryDelayMs({ attempt });
        await sleep(delay);
        continue;
      }

      throw new ProductionMasterLiveStagePlanError(
        "LIVE_STAGE_PLAN_GEMINI_TRANSPORT_ERROR",
        geminiTransportErrorMessage(error)
      );
    }
  }

  throw new ProductionMasterLiveStagePlanError(
    "LIVE_STAGE_PLAN_GEMINI_RETRIES_EXHAUSTED",
    lastError instanceof Error ? lastError.message : String(lastError)
  );
}

function parseJson<T>(text: string): T {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new ProductionMasterLiveStagePlanError(
      "LIVE_STAGE_PLAN_GEMINI_JSON_INVALID",
      "Gemini stage planning response was not valid JSON."
    );
  }
}


// ----------------------------------------------------------------
// Model output contract (semantics only -- no metrics).
// ----------------------------------------------------------------

interface StagePlanQueryDecision {
  query: string;
  intent: QueryIntent;
  subIntent: string;
  cluster: string;
  siteCoverage: QuerySiteCoverage;
}

interface StagePlanTopicDecision {
  topic: string;
  missionRelevance: number;
  evidenceRequirement: CoverageEvidenceRequirement;
  queries: string[];
  competitorCoverage: CompetitorCoverageQuality;
  competitorClarity: CompetitorClarityQuality;
  competitorEvidence: CompetitorEvidenceQuality;
  competitorAction: CompetitorActionQuality;
  originalValueOpportunity: boolean;
}

interface StagePlanClaimDecision {
  id: string;
  text: string;
  category: ClaimCategory;
  risk: ClaimRisk;
  supportedByBusinessFact: boolean;
}

interface StagePlanSectionDecision {
  heading: string;
  mission: string;
  expectedOutcome: string;
  queries: string[];
  topics: string[];
  questions: string[];

  /*
   * Semantic classification only.
   * ArticleExecutionPlan remains structural authority.
   */
  roles:
    ArticleSectionRoleV1[];

  requiredClaimIds: string[];
}

interface StagePlanModelOutput {
  primaryQuery: string;
  pageType: string;
  intent: string;
  action: "CREATE" | "UPDATE" | "MERGE" | "SPLIT" | "REPOSITION" | "NO_GO";
  questions: string[];
  queries: StagePlanQueryDecision[];
  topics: StagePlanTopicDecision[];
  claims: StagePlanClaimDecision[];
  sections: StagePlanSectionDecision[];
}


function resolveSelectedTemplatePolicyV1({
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


function buildStagePlanPrompt({
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
  "intent": "string describing the page intent in a few words",
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
- Do not fabricate statistics, prices, guarantees, or studies. Only use "supportedByBusinessFact": true for claims that are genuinely generic/definitional or would be backed by the business's own verified facts.
- At least one topic array is required.
- At least one section is required, and its "mission" values must all be distinct.
- The "queries" primary entry MUST be "${research.keyword}" exactly.
- Base competitor quality judgments only on what a reasonable analyst would infer from ranking for this keyword; if uncertain, use "UNKNOWN".
- Respond with JSON only. No markdown fences, no commentary.`;
}


// ----------------------------------------------------------------
// Deterministic metric resolution (never trusts the model).
// ----------------------------------------------------------------

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface ResolvedMetrics {
  searchVolume?: number;
  cpc?: number;
  gscImpressions?: number;
  gscClicks?: number;
  gscPosition?: number;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

/*
 * Walks the same shape of nested objects the anchoring assembler
 * scans (collectObservedQueryEvidence in
 * production-master-live-research-assembler.ts) and returns the
 * first observed metric set for a given normalized query string.
 *
 * This intentionally mirrors that function's traversal so a value
 * resolved here is guaranteed to also be found by the anchoring
 * check.
 */
function resolveMetricsForQuery({
  research,
  normalizedQuery,
}: {
  research: Readonly<ProductionMasterLiveSourceResearch>;
  normalizedQuery: string;
}): ResolvedMetrics {
  const result: ResolvedMetrics = {};

  function visit(value: unknown, depth = 0): void {
    if (depth > 10) return;

    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1);
      return;
    }

    const record = asRecord(value);
    if (!record) return;

    const keyword =
      typeof record.keyword === "string" ? record.keyword.trim() : "";

    if (keyword && normalizeText(keyword) === normalizedQuery) {
      result.searchVolume ??=
        finiteNumber(record.searchVolume) ?? finiteNumber(record.volume);
      result.cpc ??= finiteNumber(record.cpc);
      result.gscImpressions ??=
        finiteNumber(record.gscImpressions) ??
        finiteNumber(record.impressions);
      result.gscClicks ??=
        finiteNumber(record.gscClicks) ?? finiteNumber(record.clicks);
      result.gscPosition ??=
        finiteNumber(record.gscPosition) ?? finiteNumber(record.position);
    }

    for (const nested of Object.values(record)) {
      visit(nested, depth + 1);
    }
  }

  visit(research.keywordContext);
  visit(research.dataForSeo);

  return result;
}

function resolveSerpFrequency({
  research,
  normalizedQuery,
}: {
  research: Readonly<ProductionMasterLiveSourceResearch>;
  normalizedQuery: string;
}): number | undefined {
  const results = research.serpSnapshot.results;
  if (results.length === 0) return undefined;

  // Only meaningful for the primary keyword itself; per-query SERP
  // frequency for related queries is not observed by this adapter.
  if (normalizedQuery !== normalizeText(research.keyword)) {
    return undefined;
  }

  return 1;
}


// ----------------------------------------------------------------
// Business-fact-derived evidence (never LLM-authored).
// ----------------------------------------------------------------

export function buildEvidenceFromLiveResearch(
  research:
    Readonly<
      ProductionMasterLiveSourceResearch
    >
): ProductionMasterArtifactPipelineInput[
  "evidenceGraph"
] {
  /*
   * LIVE_EVIDENCE_SOURCE_BRIDGE_V2
   *
   * DISCOVERY != VERIFICATION.
   *
   * Real URLs observed through:
   * - verified first-party business facts
   * - live organic SERP
   * - live AI Overview references
   *
   * may enter the Evidence Graph source registry.
   *
   * SERP descriptions/snippets are intentionally NOT promoted
   * to VERIFIED_EXCERPT claim evidence.
   */

  const sources:
    ProductionMasterArtifactPipelineInput[
      "evidenceGraph"
    ]["sources"] =
      [];

  const claimEvidence:
    ProductionMasterArtifactPipelineInput[
      "evidenceGraph"
    ]["claimEvidence"] =
      [];

  const seenUrls =
    new Set<string>();


  function normalizedUrl(
    raw:
      string |
      null |
      undefined
  ): string | null {
    if (
      typeof raw !==
        "string" ||
      !raw.trim()
    ) {
      return null;
    }

    try {
      const parsed =
        new URL(
          raw.trim()
        );

      if (
        parsed.protocol !==
          "https:" &&
        parsed.protocol !==
          "http:"
      ) {
        return null;
      }

      parsed.hash = "";

      return parsed.toString();
    } catch {
      return null;
    }
  }


  function domainFromUrl(
    url:
      string
  ): string {
    try {
      return new URL(
        url
      )
        .hostname
        .toLowerCase()
        .replace(
          /^www\./,
          ""
        );
    } catch {
      return "";
    }
  }


  function sourceTypeForDomain(
    domain:
      string
  ): EvidenceSourceType {
    if (
      domain.endsWith(
        ".gov"
      )
    ) {
      return "PRIMARY_GOVERNMENT";
    }

    if (
      domain.endsWith(
        ".edu"
      )
    ) {
      return "ACADEMIC";
    }

    return "REPUTABLE_SECONDARY";
  }


  function addSource({
    id,
    rawUrl,
    publisher,
    forcedType,
  }: {
    id:
      string;

    rawUrl:
      string |
      null |
      undefined;

    publisher:
      string |
      null |
      undefined;

    forcedType?:
      EvidenceSourceType;
  }): void {
    const url =
      normalizedUrl(
        rawUrl
      );

    if (
      !url ||
      seenUrls.has(
        url
      )
    ) {
      return;
    }

    seenUrls.add(
      url
    );

    const domain =
      domainFromUrl(
        url
      );

    const sourceType =
      forcedType ??
      sourceTypeForDomain(
        domain
      );

    sources.push({
      id,

      url,

      publisher:
        publisher
          ?.trim() ||
        domain ||
        "Observed source",

      sourceType,

      authorityTier:
        defaultAuthorityTier(
          sourceType
        ),

      retrievedAt:
        new Date(
          research.capturedAt
        ),
    });
  }


  const verifiedClaims =
    Array.isArray(
      (
        research
          .businessFacts as
          unknown as {
            verifiedClaims?:
              unknown[];
          }
      ).verifiedClaims
    )
      ? (
          research
            .businessFacts as
            unknown as {
              verifiedClaims:
                unknown[];
            }
        ).verifiedClaims
      : [];


  verifiedClaims.forEach(
    (
      raw,
      index
    ) => {
      const record =
        asRecord(
          raw
        );

      if (
        !record
      ) {
        return;
      }

      const rawUrl =
        typeof record.url ===
          "string"
          ? record.url
          : typeof record.sourceUrl ===
              "string"
            ? record.sourceUrl
            : null;

      addSource({
        id:
          `business-fact-source-${index}`,

        rawUrl,

        publisher:
          typeof record.publisher ===
            "string"
            ? record.publisher
            : "Verified business fact",

        forcedType:
          "PRIMARY_OFFICIAL",
      });
    }
  );


  research
    .serpIntelligence
    .aiOverview
    .references
    .forEach(
      (
        reference,
        index
      ) => {
        addSource({
          id:
            `ai-overview-source-${index}`,

          rawUrl:
            reference.url,

          publisher:
            reference.domain ??
            reference.title,
        });
      }
    );


  research
    .serpIntelligence
    .organic
    .slice(
      0,
      10
    )
    .forEach(
      (
        result,
        index
      ) => {
        addSource({
          id:
            `organic-serp-source-${index}`,

          rawUrl:
            result.url,

          publisher:
            result.domain ||
            result.title,
        });
      }
    );


  return {
    sources,

    /*
     * Critical safety boundary:
     * observed URLs/snippets are discovery evidence only.
     *
     * Claim verification must later produce real
     * VERIFIED_EXCERPT records.
     */
    claimEvidence,
  };
}


// ----------------------------------------------------------------
// Main entry point
// ----------------------------------------------------------------

export async function planProductionMasterArtifactsFromLiveSources({
  liveSourceInput,
  mission,
}: {
  liveSourceInput: ProductionMasterLiveSourceInput;
  mission: ProductionMasterLiveStagePlanMissionInput;
}): Promise<Readonly<ProductionMasterLiveStagePlanResult>> {
  const research = await collectProductionMasterLiveSources(liveSourceInput);

  const rankingInputs =
    buildProductionRankingInputs(
      research
    );


  const observedQueryContract =
    [
      "STRICT OBSERVED QUERY IDENTITY CONTRACT:",
      "For plan.queries and primaryQuery, use ONLY exact query strings from the allowed observed-query list below.",
      "Do not paraphrase query strings.",
      "Do not create semantically similar variants.",
      "Do not create synthetic query fan-out strings.",
      "If a useful concept has no observed query identity, represent it as a topic/section rather than inventing a query.",
      "",
      "ALLOWED OBSERVED QUERIES:",
      JSON.stringify(
        rankingInputs
          .observedQueries,
        null,
        2
      ),
    ].join(
      "\n"
    );


  /*
   * ATOMIC_CLAIM_CONTRACT_V1
   *
   * Claim Ledger records must be independently verifiable.
   * One claim = one factual proposition.
   */
  const atomicClaimContract =
    [
      "ATOMIC_CLAIM_CONTRACT_V1:",
      "Every plan.claims item MUST contain exactly one independently verifiable factual proposition.",
      "Do NOT bundle a definition with examples, consequences, limitations, provider types, features, or multiple events.",
      "Do NOT use a comma-separated list of factual examples inside one claim when each example would require separate evidence.",
      "Do NOT join independent factual propositions with 'and' or 'or'. Split them into separate claim records.",
      "A source excerpt must be able to support the WHOLE claim, not merely its general topic.",
      "Prefer the narrowest useful factual proposition.",
      "Example BAD: A service performs action A, performs action B, and produces outcome C.",
      "Example GOOD claim 1: The service performs action A.",
      "Example GOOD claim 2: The service performs action B.",
      "Example BAD: A product is available through provider type A and provider type B.",
      "Example GOOD claim 1: The product is available through provider type A.",
      "Example GOOD claim 2: The product is available through provider type B.",
      "If a proposition cannot reasonably be verified from one authoritative excerpt, split it further.",
      "Never invent evidence, source text, provider capabilities, prices, guarantees, statistics, or legal conclusions.",
    ].join(
      "\n"
    );


  const sectionClaimOwnershipContract =
    [
      "SECTION_CLAIM_OWNERSHIP_V2:",
      "Every plan.sections item MUST include requiredClaimIds: string[].",
      "Every requiredClaimId MUST exactly equal an id from plan.claims.",
      "Assign a claim ONLY to the ONE section whose information job directly requires the WHOLE claim.",
      "Do not assign claims by loose lexical similarity.",
      "A definition claim belongs to the definition / what-is section.",
      "A mechanism claim belongs to the how-it-works section.",
      "A pricing claim belongs only to the pricing/cost section.",
      "A comparison claim belongs only to the comparison section.",
      "Do not assign one claim to multiple sections.",
      "Use requiredClaimIds: [] when a section needs no material factual claim.",
      "If a section uses any role listed by ARTICLE_TEMPLATE_POLICY_V1 as evidenceSensitiveRoles, requiredClaimIds MUST contain at least one material factual claim owned by that section.",
      "If no supportable material claim exists for an OPTIONAL evidence-sensitive role, OMIT that optional role instead of inventing a claim.",
      "SECTION_COVERAGE_OWNERSHIP_V1:",
      "Every plan.topics item MUST be owned by exactly one plan.sections item through sections[].topics.",
      "Every plan.questions item MUST be owned by exactly one plan.sections item through sections[].questions.",
      "sections[].topics MUST contain only exact topic strings from plan.topics.",
      "sections[].questions MUST contain only exact strings from plan.questions.",
      "One section may own multiple related topics/questions when they form one information job.",
      "Do not duplicate the same topic/question across multiple sections.",
      "Do not create an extra section merely to repeat a keyword variation.",
      "Do not invent a claim merely so every section has one.",
    ].join(
      "\n"
    );


  const seoContentTargetPolicy =
    [
      "SEO_CONTENT_TARGET_POLICY_V1:",
      "There is NO fixed SEO word-count target.",
      "Do not pad content to hit an arbitrary number of words.",
      "Section depth must be determined by search intent, information job, evidence, and useful coverage.",
      "There is NO keyword-density target.",
      "Do not repeat exact keywords to hit a quota.",
      "Use ONE canonical primary query for the page mission.",
      "Supporting queries must come only from the supplied observed-query set and must share the same page mission.",
      "Do not invent keyword variants.",
      "Do not create separate sections merely to repeat keyword variations.",
      "Use query language naturally where it improves clarity.",
      "Prefer complete concise coverage over longer prose.",
      "If comparable live SERP page lengths are available, they are a soft editorial benchmark only, never a ranking requirement or publication gate.",
    ].join(
      "\n"
    );


  /*
   * ADAPTIVE_SEO_COVERAGE_POLICY_V2
   *
   * Search demand + live SERP guide information architecture.
   * They never become arbitrary writing quotas.
   */
  const adaptiveSeoCoveragePolicyV2 =
    [
      "ADAPTIVE_SEO_COVERAGE_POLICY_V2:",
      "A page has exactly ONE canonical primary query / page mission.",
      "There is NO required numeric count of secondary queries.",
      "Choose the smallest sufficient set of observed same-mission queries needed to cover distinct user information jobs.",
      "Closely overlapping query variants represent one semantic requirement and MUST NOT cause duplicated sections or duplicated prose.",
      "Do not optimize for keyword density, exact-match repetition, or a keyword-frequency score.",
      "Do not invent keyword variants that are absent from observed search evidence.",
      "Use important search terminology explicitly where natural, especially when it improves user clarity.",
      "Do not sacrifice readability to force exact-match wording.",
      "There is NO fixed article word-count target, minimum, or maximum.",
      "Live competitor word counts are descriptive editorial context only.",
      "Never derive a publication gate or mandatory min/max length from the SERP median.",
      "A page may be shorter than competitors when it satisfies the mission more efficiently.",
      "A page may be longer when genuinely distinct information jobs, evidence, examples, or original value require it.",
      "Depth is earned by useful coverage; length is not a ranking objective.",
      "Stop adding material once all required information jobs are completely satisfied without unsupported claims or semantic repetition.",
      "Prefer original value, evidence, clarity, direct answers, and useful distinctions over additional prose.",
    ].join(
      "\n"
    );


  const liveSerpEditorialContextV2 =
    [
      "LIVE_SERP_EDITORIAL_CONTEXT_V2:",
      `analyzedPages=${research.serpIntelligence.benchmark.analyzedPages}`,
      `medianWordCount=${research.serpIntelligence.benchmark.medianWordCount ?? "UNAVAILABLE"}`,
      `medianH2=${research.serpIntelligence.benchmark.medianH2 ?? "UNAVAILABLE"}`,
      `medianH3=${research.serpIntelligence.benchmark.medianH3 ?? "UNAVAILABLE"}`,
      `dominantPageType=${research.serpIntelligence.benchmark.dominantPageType ?? "UNAVAILABLE"}`,
      "These values describe the current live SERP. They are NOT mandatory targets.",
      "Use them only to detect unusual under-coverage or unnecessary verbosity after reasoning about intent and information jobs.",
    ].join(
      "\n"
    );


  const prompt =
    [
      buildStagePlanPrompt({
        research,
        mission,
      }),

      atomicClaimContract,

      sectionClaimOwnershipContract,

      seoContentTargetPolicy,

      adaptiveSeoCoveragePolicyV2,

      liveSerpEditorialContextV2,

      buildSerpCompetitiveCoveragePrompt(
        rankingInputs
          .serpCoverage
      ),

      observedQueryContract,
    ].join(
      "\n\n"
    );


  let rawResponse:
    string;

  try {
    /*
     * Stage planning uses the same configured AI provider as
     * the rest of Content Intelligence.
     *
     * This removes the old hard dependency on Gemini while
     * keeping live metrics/evidence deterministic and external
     * to the model.
     */
    rawResponse =
      await callContentAiJson(
        prompt
      );
  } catch (
    cause
  ) {
    const message =
      cause instanceof
        Error
        ? cause.message
        : String(
            cause
          );

    throw new ProductionMasterLiveStagePlanError(
      "LIVE_STAGE_PLAN_AI_TRANSPORT_ERROR",
      `Stage planning failed: ${message}`
    );
  }

  /*
   * STAGE_PLAN_COMPLETENESS_RECOVERY_V4
   *
   * JSON mode guarantees valid JSON syntax, not that every required
   * production semantic field is present.
   *
   * We do NOT fabricate missing semantic decisions in code.
   * One full model regeneration is allowed, then we fail closed.
   */
  function inspectStagePlanCompleteness(
    candidate:
      StagePlanModelOutput
  ): string[] {
    const missing:
      string[] =
        [];

    if (
      typeof candidate.primaryQuery !==
        "string" ||
      !candidate.primaryQuery.trim()
    ) {
      missing.push(
        "primaryQuery"
      );
    }

    if (
      typeof candidate.pageType !==
        "string" ||
      !candidate.pageType.trim()
    ) {
      missing.push(
        "pageType"
      );
    }

    if (
      typeof candidate.intent !==
        "string" ||
      !candidate.intent.trim()
    ) {
      missing.push(
        "intent"
      );
    }

    if (
      ![
        "CREATE",
        "UPDATE",
        "MERGE",
        "SPLIT",
        "REPOSITION",
        "NO_GO",
      ].includes(
        candidate.action
      )
    ) {
      missing.push(
        "action"
      );
    }

    if (
      !Array.isArray(
        candidate.questions
      )
    ) {
      missing.push(
        "questions"
      );
    }

    if (
      !Array.isArray(
        candidate.queries
      ) ||
      candidate.queries.length ===
        0
    ) {
      missing.push(
        "queries"
      );
    }

    if (
      !Array.isArray(
        candidate.topics
      ) ||
      candidate.topics.length ===
        0
    ) {
      missing.push(
        "topics"
      );
    }

    /*
     * claims may legitimately be empty,
     * but the array itself must exist.
     */
    if (
      !Array.isArray(
        candidate.claims
      )
    ) {
      missing.push(
        "claims"
      );
    }

    if (
      !Array.isArray(
        candidate.sections
      ) ||
      candidate.sections.length ===
        0
    ) {
      missing.push(
        "sections"
      );
    } else {
      if (
        candidate.sections.some(
          (
            section
          ) =>
            !Array.isArray(
              section.requiredClaimIds
            )
        )
      ) {
        missing.push(
          "sections[].requiredClaimIds"
        );
      }


      /*
       * TEMPLATE_ROLE_COMPLETENESS_RECOVERY_V1
       *
       * roles[] is now part of the Stage Plan semantic contract.
       * Missing roles must enter the same single bounded recovery
       * used for other incomplete structured output.
       *
       * Do not wait until the later deterministic template gate
       * to throw away an otherwise recoverable planning response.
       */
      if (
        candidate.sections.some(
          (
            section
          ) =>
            !Array.isArray(
              section.roles
            )
        )
      ) {
        missing.push(
          "sections[].roles"
        );
      }
      /*
       * EVIDENCE_SENSITIVE_ROLE_CLAIM_COMPLETENESS_RECOVERY_V1
       *
       * Optional template roles remain optional.
       *
       * However, once the semantic planner chooses an
       * evidence-sensitive role, that section must explicitly own
       * at least one material factual claim through requiredClaimIds.
       *
       * Do not synthesize a claim here.
       * Do not silently remove the role here.
       *
       * Treat the structured response as incomplete and route it
       * through the EXISTING single bounded Stage Plan regeneration.
       */
      const evidenceSensitiveRoles =
        new Set(
          resolveSelectedTemplatePolicyV1({
            research,
            mission,
          }).evidenceSensitiveRoles
        );


      if (
        candidate.sections.some(
          (
            section
          ) =>
            Array.isArray(
              section.roles
            ) &&
            section.roles.some(
              (
                role
              ) =>
                evidenceSensitiveRoles.has(
                  role
                )
            ) &&
            Array.isArray(
              section.requiredClaimIds
            ) &&
            section.requiredClaimIds.length ===
              0
        )
      ) {
        missing.push(
          "sections[].evidenceSensitiveRole.requiredClaimIds"
        );
      }

      /*
       * TEMPLATE_H2_PLANNING_MINIMUM_RECOVERY_V1
       *
       * The selected template owns the structural floor for
       * independent search intents. An under-structured plan is
       * incomplete structured output and uses the EXISTING single
       * bounded Stage Plan regeneration BEFORE the Writer runs.
       *
       * No new planner, prompt family or LLM path.
       */
      const templateH2Minimum =
        resolveSelectedTemplatePolicyV1({
          research,
          mission,
        }).h2PlanningRange.min;

      if (
        candidate.sections.length <
        templateH2Minimum
      ) {
        missing.push(
          `sections (selected template requires at least ${templateH2Minimum} independent H2 sections; received ${candidate.sections.length}; cover every required topic/question with its own section)`
        );
      }
    }

    return missing;
  }


  /*
   * STAGE_PLAN_CLAIM_OWNERSHIP_RECOVERY_V5
   *
   * Claim ownership is semantic model output.
   * We do NOT lexically guess a replacement owner and we do NOT
   * silently keep the first section.
   *
   * Invalid ownership is treated as incomplete structured output,
   * allowing the existing ONE bounded structured regeneration.
   */
  function inspectStagePlanClaimOwnership(
    candidate:
      StagePlanModelOutput
  ): string[] {
    const problems:
      string[] =
        [];


    if (
      !Array.isArray(
        candidate.claims
      ) ||
      !Array.isArray(
        candidate.sections
      )
    ) {
      return problems;
    }


    const knownClaimIds =
      new Set<string>();


    for (
      const claim
      of candidate.claims
    ) {
      const claimId =
        typeof claim?.id ===
          "string"
          ? claim.id.trim()
          : "";


      if (!claimId) {
        continue;
      }


      if (
        knownClaimIds.has(
          claimId
        )
      ) {
        problems.push(
          `claims[].id duplicate:${claimId}`
        );

        continue;
      }


      knownClaimIds.add(
        claimId
      );
    }


    const ownerByClaim =
      new Map<
        string,
        number
      >();


    candidate.sections.forEach(
      (
        section,
        sectionIndex
      ) => {
        if (
          !Array.isArray(
            section.requiredClaimIds
          )
        ) {
          return;
        }


        for (
          const rawClaimId
          of section.requiredClaimIds
        ) {
          if (
            typeof rawClaimId !==
              "string"
          ) {
            continue;
          }


          const claimId =
            rawClaimId.trim();


          if (!claimId) {
            continue;
          }


          if (
            !knownClaimIds.has(
              claimId
            )
          ) {
            problems.push(
              `sections[].requiredClaimIds unknown:${claimId}`
            );

            continue;
          }


          const existingOwner =
            ownerByClaim.get(
              claimId
            );


          if (
            existingOwner ===
              undefined
          ) {
            ownerByClaim.set(
              claimId,
              sectionIndex
            );

            continue;
          }


          if (
            existingOwner !==
              sectionIndex
          ) {
            problems.push(
              `sections[].requiredClaimIds duplicate-owner:${claimId}`
            );
          }
        }
      }
    );


    return [
      ...new Set(
        problems
      ),
    ];
  }


  let plan =
    parseJson<StagePlanModelOutput>(
      rawResponse
    );

  let missingStagePlanFields =
    [
      ...inspectStagePlanCompleteness(
        plan
      ),

      ...inspectStagePlanClaimOwnership(
        plan
      ),
    ];


  /*
   * Exactly one bounded regeneration.
   */
  if (
    missingStagePlanFields.length >
    0
  ) {
    console.warn(
      "[content stage planner] incomplete structured output; regenerating once",
      {
        missing:
          missingStagePlanFields,

        receivedKeys:
          Object.keys(
            plan as unknown as
              Record<
                string,
                unknown
              >
          ),
      }
    );

    const completenessRetryPrompt =
      [
        prompt,

        "",
        "STAGE_PLAN_COMPLETENESS_RETRY_V4:",

        "Your previous response was valid JSON but did not satisfy the complete production Stage Plan contract.",

        `Missing or invalid fields: ${missingStagePlanFields.join(", ")}`,

        "Regenerate the ENTIRE Stage Plan JSON object from scratch.",

        "Do not return only the missing fields.",

        "Do not wrap the object inside plan, data, result, response, output, or another container.",

        "Required scalar fields: primaryQuery, pageType, intent, action.",

        "Required array fields: questions, queries, topics, claims, sections.",

        "queries, topics, and sections must be non-empty.",

        "claims must exist. It may be [] only when no material factual claims are required.",

        "Every section must contain roles: string[] using the selected ARTICLE_TEMPLATE_POLICY_V1 semantic-role vocabulary.",
        "Every section must contain requiredClaimIds: string[].",
        "If a section uses an evidenceSensitiveRole from ARTICLE_TEMPLATE_POLICY_V1, that section must own at least one material factual claim through requiredClaimIds.",
        "If no supportable material claim exists for an OPTIONAL evidence-sensitive role, omit that optional role instead of inventing a claim.",
        "Each claim id may appear in requiredClaimIds of AT MOST ONE section. Never assign the same claim to multiple sections.",

        "Every requiredClaimId must exactly equal one claims[].id.",

        "Every query must exactly equal an identity from the supplied allowed observed-query list.",

        "Never paraphrase or invent query identities.",

        "Return JSON only. No markdown fences. No commentary.",
      ].join(
        "\n\n"
      );

    try {
      rawResponse =
        await callContentAiJson(
          completenessRetryPrompt,
          {
            forceAlternateProvider:
              true,
          }
        );
    } catch (
      cause
    ) {
      const message =
        cause instanceof
          Error
          ? cause.message
          : String(
              cause
            );

      throw new ProductionMasterLiveStagePlanError(
        "LIVE_STAGE_PLAN_AI_REPAIR_TRANSPORT_ERROR",
        `Stage Plan completeness regeneration failed: ${message}`
      );
    }

    plan =
      parseJson<StagePlanModelOutput>(
        rawResponse
      );

    missingStagePlanFields =
      [
      ...inspectStagePlanCompleteness(
        plan
      ),

      ...inspectStagePlanClaimOwnership(
        plan
      ),
    ];
  }


  if (
    missingStagePlanFields.length >
    0
  ) {
    console.error(
      "[content stage planner] structured output remained incomplete",
      {
        missing:
          missingStagePlanFields,

        receivedKeys:
          Object.keys(
            plan as unknown as
              Record<
                string,
                unknown
              >
          ),
      }
    );

    throw new ProductionMasterLiveStagePlanError(
      "LIVE_STAGE_PLAN_MODEL_OUTPUT_INCOMPLETE",
      `Stage Plan remained incomplete after one bounded regeneration. Missing or invalid: ${missingStagePlanFields.join(", ")}`
    );
  }

  /*
   * REQUIRED_COVERAGE_OWNERSHIP_V1
   *
   * The model may identify information jobs.
   * It may NOT allow them to disappear between Research and Writer.
   *
   * Identity is exact-string based here on purpose:
   * no fuzzy lexical assignment,
   * no topic-specific heuristics,
   * no post-hoc guessing.
   */
  const plannedTopicLabels =
    plan.topics.map(
      (
        topic
      ) =>
        topic.topic.trim()
    );


  const plannedQuestions =
    [
      ...new Set(
        plan.questions
          .map(
            (
              question
            ) =>
              question.trim()
          )
          .filter(Boolean)
      ),
    ];


  const knownTopicLabels =
    new Set(
      plannedTopicLabels
    );


  const knownQuestions =
    new Set(
      plannedQuestions
    );


  const topicOwnerCount =
    new Map<
      string,
      number
    >(
      plannedTopicLabels.map(
        (
          topic
        ) => [
          topic,
          0,
        ]
      )
    );


  const questionOwnerCount =
    new Map<
      string,
      number
    >(
      plannedQuestions.map(
        (
          question
        ) => [
          question,
          0,
        ]
      )
    );


  for (
    const [
      sectionIndex,
      section,
    ]
    of plan.sections.entries()
  ) {
    if (
      !Array.isArray(
        section.topics
      )
    ) {
      throw new ProductionMasterLiveStagePlanError(
        "LIVE_STAGE_PLAN_SECTION_TOPICS_REQUIRED",
        `Section ${sectionIndex} must provide topics: string[].`
      );
    }


    if (
      !Array.isArray(
        section.questions
      )
    ) {
      throw new ProductionMasterLiveStagePlanError(
        "LIVE_STAGE_PLAN_SECTION_QUESTIONS_REQUIRED",
        `Section ${sectionIndex} must provide questions: string[].`
      );
    }


    const ownedTopics =
      [
        ...new Set(
          section.topics.map(
            (
              topic
            ) =>
              typeof topic ===
                "string"
                ? topic.trim()
                : ""
          )
        ),
      ].filter(Boolean);


    const ownedQuestions =
      [
        ...new Set(
          section.questions.map(
            (
              question
            ) =>
              typeof question ===
                "string"
                ? question.trim()
                : ""
          )
        ),
      ].filter(Boolean);


    for (
      const topic
      of ownedTopics
    ) {
      if (
        !knownTopicLabels.has(
          topic
        )
      ) {
        throw new ProductionMasterLiveStagePlanError(
          "LIVE_STAGE_PLAN_SECTION_UNKNOWN_TOPIC",
          `Section ${sectionIndex} references unknown topic: ${topic}`
        );
      }


      topicOwnerCount.set(
        topic,
        (
          topicOwnerCount.get(
            topic
          ) ??
          0
        ) +
        1
      );
    }


    for (
      const question
      of ownedQuestions
    ) {
      if (
        !knownQuestions.has(
          question
        )
      ) {
        throw new ProductionMasterLiveStagePlanError(
          "LIVE_STAGE_PLAN_SECTION_UNKNOWN_QUESTION",
          `Section ${sectionIndex} references unknown question: ${question}`
        );
      }


      questionOwnerCount.set(
        question,
        (
          questionOwnerCount.get(
            question
          ) ??
          0
        ) +
        1
      );
    }
  }


  for (
    const [
      topic,
      owners,
    ]
    of topicOwnerCount
  ) {
    if (
      owners !==
      1
    ) {
      throw new ProductionMasterLiveStagePlanError(
        owners ===
          0
          ? "LIVE_STAGE_PLAN_REQUIRED_TOPIC_UNOWNED"
          : "LIVE_STAGE_PLAN_REQUIRED_TOPIC_MULTIPLE_OWNERS",
        `${topic}:owners=${owners}`
      );
    }
  }


  for (
    const [
      question,
      owners,
    ]
    of questionOwnerCount
  ) {
    if (
      owners !==
      1
    ) {
      throw new ProductionMasterLiveStagePlanError(
        owners ===
          0
          ? "LIVE_STAGE_PLAN_REQUIRED_QUESTION_UNOWNED"
          : "LIVE_STAGE_PLAN_REQUIRED_QUESTION_MULTIPLE_OWNERS",
        `${question}:owners=${owners}`
      );
    }
  }



  /*
   * TEMPLATE_COVERAGE_PRODUCTION_GATE_V1
   *
   * Stage Plan remains the semantic planner.
   * ArticleExecutionPlan remains the sole structural authority.
   *
   * This gate only proves that the selected template's semantic
   * jobs are represented before the structural plan is compiled.
   */
  const selectedTemplatePolicy =
    resolveSelectedTemplatePolicyV1({
      research,
      mission,
    });


  const allowedTemplateRoles =
    new Set<ArticleSectionRoleV1>([
      ...selectedTemplatePolicy
        .requiredRoles,

      ...selectedTemplatePolicy
        .optionalRoles,

      ...selectedTemplatePolicy
        .evidenceSensitiveRoles,
    ]);


  const templateCoverageSections =
    plan.sections.map(
      (
        section,
        sectionIndex
      ) => {
        const rawRoles =
          (
            section as
              typeof section & {
                roles?:
                  unknown;
              }
          ).roles;


        if (
          !Array.isArray(
            rawRoles
          )
        ) {
          throw new ProductionMasterLiveStagePlanError(
            "LIVE_STAGE_PLAN_SECTION_ROLES_REQUIRED",
            `Section ${sectionIndex} must provide roles: string[].`
          );
        }


        const roles:
          ArticleSectionRoleV1[] =
            [];


        for (
          const value
          of rawRoles
        ) {
          if (
            typeof value !==
              "string" ||
            !allowedTemplateRoles.has(
              value as
                ArticleSectionRoleV1
            )
          ) {
            throw new ProductionMasterLiveStagePlanError(
              "LIVE_STAGE_PLAN_SECTION_ROLE_INVALID",
              `Section ${sectionIndex} contains an invalid template role: ${String(value)}`
            );
          }


          roles.push(
            value as
              ArticleSectionRoleV1
          );
        }


        const requiredClaimIds =
          Array.isArray(
            section.requiredClaimIds
          )
            ? section
                .requiredClaimIds
                .filter(
                  (
                    value
                  ): value is string =>
                    typeof value ===
                      "string" &&
                    value.trim()
                      .length >
                      0
                )
            : [];


        return {
          heading:
            section.heading,

          mission:
            section.mission,

          roles: [
            ...new Set(
              roles
            ),
          ],

          requiredClaimIds: [
            ...new Set(
              requiredClaimIds
            ),
          ],
        };
      }
    );


  let templateCoverage;

  try {
    templateCoverage =
      assertTemplateCoverageV1({
        policy:
          selectedTemplatePolicy,

        sections:
          templateCoverageSections,
      });
  } catch (
    cause
  ) {
    throw new ProductionMasterLiveStagePlanError(
      "LIVE_STAGE_PLAN_TEMPLATE_COVERAGE_FAILED",
      cause instanceof
        Error
        ? cause.message
        : String(
            cause
          )
    );
  }


  // ---- Stage 2: observed-query-locked signals ----
  /*
   * OBSERVED_QUERY_LOCK_V1
   *
   * The model may classify a query.
   * The model may NOT create query identity.
   *
   * QueryGraph receives only exact strings already present in
   * the live DataForSEO acquisition universe.
   */

  const observedByNormalized =
    new Map(
      rankingInputs
        .observedQueries
        .map(
          (
            query
          ) => [
            normalizeText(
              query
            ),

            query,
          ] as const
        )
    );


  const observedQuerySet =
    new Set(
      observedByNormalized
        .keys()
    );


  const groundedModelQueries =
    plan.queries.filter(
      (
        query
      ) =>
        observedQuerySet.has(
          normalizeText(
            query.query
          )
        )
    );


  const primaryNormalized =
    normalizeText(
      research.keyword
    );


  const modelPrimary =
    groundedModelQueries.find(
      (
        query
      ) =>
        normalizeText(
          query.query
        ) ===
        primaryNormalized
    );


  const semanticFallback =
    modelPrimary ??
    groundedModelQueries[0] ??
    plan.queries[0];


  if (
    !semanticFallback
  ) {
    throw new ProductionMasterLiveStagePlanError(
      "LIVE_STAGE_PLAN_QUERY_SEMANTICS_MISSING"
    );
  }


  const primaryQueryPlan =
    modelPrimary ?? {
      ...semanticFallback,

      query:
        research
          .keyword
          .trim(),

      intent:
        mission
          .missionIntent,

      subIntent:
        semanticFallback
          .subIntent
          .trim() ||
        "PRIMARY",

      cluster:
        semanticFallback
          .cluster
          .trim() ||
        mission.topic,
    };


  const groundedQueries = [
    primaryQueryPlan,

    ...groundedModelQueries.filter(
      (
        query
      ) =>
        normalizeText(
          query.query
        ) !==
        primaryNormalized
    ),
  ]
    .filter(
      (
        query,
        index,
        all
      ) =>
        all.findIndex(
          (
            candidate
          ) =>
            normalizeText(
              candidate.query
            ) ===
            normalizeText(
              query.query
            )
        ) ===
        index
    );


  const querySignals:
    ProductionMasterArtifactPipelineInput[
      "queryGraph"
    ]["signals"] =
      groundedQueries.map(
        (
          query
        ) => {
          const normalized =
            normalizeText(
              query.query
            );

          const observedQuery =
            observedByNormalized.get(
              normalized
            );


          if (
            !observedQuery
          ) {
            throw new ProductionMasterLiveStagePlanError(
              "LIVE_STAGE_PLAN_UNOBSERVED_QUERY_REJECTED",
              `Unobserved query rejected before QueryGraph: ${query.query}`
            );
          }


          const metrics =
            resolveMetricsForQuery({
              research,

              normalizedQuery:
                normalized,
            });


          const serpFrequency =
            resolveSerpFrequency({
              research,

              normalizedQuery:
                normalized,
            });


          return {
            query:
              observedQuery,

            intent:
              query.intent,

            subIntent:
              query
                .subIntent
                .trim() ||
              "general",

            cluster:
              query
                .cluster
                .trim() ||
              mission.topic,

            siteCoverage:
              query.siteCoverage,

            source:
              "DATAFORSEO",

            sourceConfidence:
              0.9,

            ...(
              metrics
                .searchVolume !==
                undefined
                ? {
                    searchVolume:
                      metrics
                        .searchVolume,
                  }
                : {}
            ),

            ...(
              metrics.cpc !==
                undefined
                ? {
                    cpc:
                      metrics.cpc,
                  }
                : {}
            ),

            ...(
              metrics
                .gscImpressions !==
                undefined
                ? {
                    gscImpressions:
                      metrics
                        .gscImpressions,
                  }
                : {}
            ),

            ...(
              metrics
                .gscClicks !==
                undefined
                ? {
                    gscClicks:
                      metrics
                        .gscClicks,
                  }
                : {}
            ),

            ...(
              metrics
                .gscPosition !==
                undefined
                ? {
                    gscPosition:
                      metrics
                        .gscPosition,
                  }
                : {}
            ),

            ...(
              serpFrequency !==
                undefined
                ? {
                    serpFrequency,
                  }
                : {}
            ),
          };
        }
      );


  if (
    !querySignals.some(
      (
        signal
      ) =>
        normalizeText(
          signal.query
        ) ===
        primaryNormalized
    )
  ) {
    throw new ProductionMasterLiveStagePlanError(
      "LIVE_STAGE_PLAN_PRIMARY_QUERY_MISSING_FROM_SIGNALS"
    );
  }


  if (
    querySignals.some(
      (
        signal
      ) =>
        !observedQuerySet.has(
          normalizeText(
            signal.query
          )
        )
    )
  ) {
    throw new ProductionMasterLiveStagePlanError(
      "LIVE_STAGE_PLAN_UNOBSERVED_QUERY_ESCAPED_LOCK"
    );
  }


  // ---- Stage 6A: expected coverage topics ----
  const expectedCoverageTopics: ProductionMasterArtifactPipelineInput["expectedCoverage"]["topics"] =
    plan.topics.map((t) => ({
      topic: t.topic.trim(),
      missionRelevance: Math.max(0, Math.min(1, t.missionRelevance)),
      evidenceRequirement: t.evidenceRequirement,
    }));

  // ---- Stage 6B: gap observations (topics must match expected coverage) ----
  const expectedTopicSet = new Set(
    expectedCoverageTopics.map((t) => normalizeText(t.topic))
  );

  /*
   * COMPETITOR_INFORMATION_GAIN_V1_PRODUCTION
   *
   * Uses already-fetched live SERP competitor pages.
   *
   * ZERO additional network calls.
   * ZERO LLM calls.
   * ZERO new query/topic identities.
   *
   * Only two existing fields may become more deterministic:
   *
   * - competitorCoverage
   * - originalValueOpportunity
   *
   * clarity / evidence / action remain semantic because DOM
   * structure alone cannot prove those judgments.
   */
  const competitorInformationGain =
    buildCompetitorInformationGainV1({
      competitors:
        research
          .serpIntelligence
          .competitors,

      topics:
        plan.topics.map(
          (
            topic
          ) =>
            topic.topic
        ),
    });


  const deterministicTopicOpportunities =
    applyCompetitorInformationGainV1({
      opportunities:
        plan.topics,

      informationGain:
        competitorInformationGain,
    });


  console.info(
    "[content competitive intelligence] information gain",
    {
      version:
        competitorInformationGain
          .version,

      confidence:
        competitorInformationGain
          .confidence,

      fetchedPages:
        competitorInformationGain
          .fingerprints
          .length,

      informationGainTopics:
        competitorInformationGain
          .informationGainTopics,

      assetCoverage:
        competitorInformationGain
          .assetCoverage,
    }
  );


  const gapObservations: ProductionMasterArtifactPipelineInput["gaps"]["observations"] =
    deterministicTopicOpportunities
      .filter((t) => expectedTopicSet.has(normalizeText(t.topic)))
      .map((t) => ({
        topic: t.topic.trim(),
        competitorCoverage: t.competitorCoverage,
        competitorClarity: t.competitorClarity,
        competitorEvidence: t.competitorEvidence,
        competitorAction: t.competitorAction,
        originalValueOpportunity: t.originalValueOpportunity,
      }));

  /*
   * PRODUCTION_ORIGINAL_VALUE_STAGE6C_V1
   *
   * Original value is a real planned asset derived from live SERP
   * coverage/gaps. It is NOT automatically verified evidence.
   */
  const originalValuePlan =
    planProductionOriginalValue({
      topic:
        research.keyword,

      serpCoverage:
        rankingInputs
          .serpCoverage,

      opportunities:
        deterministicTopicOpportunities,
    });


  /*
   * PRODUCTION_TEMPLATE_EVIDENCE_AND_LINKABILITY_GATE_V1
   *
   * Reuses the EXISTING Original Value authority.
   * It does not create a second original-value plan.
   *
   * Current rankingEvidenceAvailable=false is intentionally
   * fail-closed until real methodology evidence exists.
   */
  let productionTemplateEvidenceGate;

  try {
    productionTemplateEvidenceGate =
      assertProductionTemplateEvidenceGateV1({
        policy:
          selectedTemplatePolicy,

        templateCoverage,

        rankingEvidenceAvailable:
          false,

        location:
          mission.location,

        originalValueAssets:
          originalValuePlan
            .input
            .assets,
      });
  } catch (
    cause
  ) {
    throw new ProductionMasterLiveStagePlanError(
      "LIVE_STAGE_PLAN_TEMPLATE_EVIDENCE_GATE_FAILED",
      cause instanceof
        Error
        ? cause.message
        : String(
            cause
          )
    );
  }


  console.info(
    "[content stage planner] template/linkability gate",
    {
      template:
        selectedTemplatePolicy.id,

      templateCoverage:
        templateCoverage.status,

      linkability:
        productionTemplateEvidenceGate
          .linkability
          .status,

      plannedLinkableAssets:
        productionTemplateEvidenceGate
          .linkability
          .plannedLinkableAssetIds,

      verifiedLinkableAssets:
        productionTemplateEvidenceGate
          .linkability
          .verifiedLinkableAssetIds,

      warnings:
        productionTemplateEvidenceGate
          .warnings,
    }
  );


  // ---- Stage 7A/7B: evidence + claims ----
  const claimsInput: ProductionMasterArtifactPipelineInput["claimLedger"]["claims"] =
    plan.claims.map((c) => ({
      id: c.id.trim(),
      text: c.text.trim(),
      category: c.category,
      risk: c.risk,
    }));


  /*
   * LIVE_VERIFIED_EVIDENCE_STAGE7_V1
   *
   * Discovery URLs are first registered without factual authority.
   * We then safely fetch those real pages and promote only
   * claim-specific, deterministic high-overlap excerpts.
   *
   * SEARCH_SNIPPET / REFERENCE_ONLY are never promoted directly.
   */
  const baseEvidenceGraphInput =
    buildEvidenceFromLiveResearch(
      research
    );


  /*
   * SELF_HEALING_CLAIM_EVIDENCE_RECOVERY_V1
   *
   * Missing evidence is not a product-level terminal state.
   *
   * Recovery strategy:
   * 1. Verify normal article-level research.
   * 2. Identify only unresolved factual claims.
   * 3. Run repeated claim-specific discovery waves.
   * 4. Every discovered URL must still be fetched.
   * 5. Only deterministic VERIFIED_EXCERPT evidence is accepted.
   * 6. Re-check unresolved claims after every wave.
   * 7. Stop immediately once every claim is verified.
   *
   * SEARCH_SNIPPET / REFERENCE_ONLY never become factual authority.
   *
   * The wave budget prevents runaway provider spend or an infinite
   * request if the external search/fetch infrastructure is unavailable.
   * The pre-writer gate remains the final safety invariant and must
   * never be bypassed.
   */
  const MAX_EVIDENCE_RECOVERY_WAVES_V1 =
    6;


  const initialEvidenceGraphInput =
    await enrichLiveEvidenceGraphV1({
      graph:
        baseEvidenceGraphInput,

      claims:
        claimsInput,
    });


  const verifiedClaimIdsFromGraph =
    (
      graph:
        typeof initialEvidenceGraphInput
    ) =>
      new Set(
        graph
          .claimEvidence
          .filter(
            (
              evidence
            ) =>
              evidence.kind ===
                "VERIFIED_EXCERPT" &&
              evidence.relation ===
                "SUPPORTS" &&
              Boolean(
                evidence.excerpt
                  ?.trim()
              )
          )
          .map(
            (
              evidence
            ) =>
              evidence.claimId
          )
      );


  const initiallyVerifiedClaimIds =
    verifiedClaimIdsFromGraph(
      initialEvidenceGraphInput
    );


  let evidenceGraphInput =
    initialEvidenceGraphInput;


  let unresolvedEvidenceClaims =
    claimsInput.filter(
      (
        claim
      ) =>
        !initiallyVerifiedClaimIds.has(
          claim.id
        )
    );


  let fallbackEvidenceSourcesTotal =
    0;


  const evidenceRecoveryWaves:
    Array<{
      wave:
        number;

      query:
        string;

      unresolvedBefore:
        string[];

      discoveredSources:
        number;

      verifiedAfter:
        number;

      unresolvedAfter:
        string[];
    }> =
      [];


  const recoveryQuerySuffixes =
    [
      "",
      " official guidance",
      " consumer guidance",
      " government guidance",
      " help center",
      " facts",
    ];


  for (
    let recoveryWave =
      0;

    recoveryWave <
      MAX_EVIDENCE_RECOVERY_WAVES_V1 &&
    unresolvedEvidenceClaims.length >
      0;

    recoveryWave++
  ) {
    const unresolvedBefore =
      unresolvedEvidenceClaims.map(
        (
          claim
        ) =>
          claim.id
      );


    const recoveryPrimaryQuery =
      `${research.keyword}${recoveryQuerySuffixes[
        recoveryWave
      ] ?? ""}`.trim();


    const fallbackEvidenceSources =
      await discoverClaimEvidenceFallbackSourcesV1({
        claims:
          unresolvedEvidenceClaims,

        primaryQuery:
          recoveryPrimaryQuery,

        locationName:
          research.market
            .locationName,

        languageName:
          research.market
            .languageName,

        existingUrls:
          evidenceGraphInput
            .sources
            .map(
              (
                source
              ) =>
                source.url
            ),
      });


    fallbackEvidenceSourcesTotal +=
      fallbackEvidenceSources
        .length;


    if (
      fallbackEvidenceSources.length >
      0
    ) {
      /*
       * Put fresh sources first because fetchSourceBodies()
       * has its own safety bound. Old verified evidence is
       * retained in claimEvidence.
       */
      evidenceGraphInput =
        await enrichLiveEvidenceGraphV1({
          graph: {
            sources: [
              ...fallbackEvidenceSources,
              ...evidenceGraphInput
                .sources,
            ],

            claimEvidence: [
              ...evidenceGraphInput
                .claimEvidence,
            ],
          },

          claims:
            unresolvedEvidenceClaims,
        });
    }


    const verifiedAfterWave =
      verifiedClaimIdsFromGraph(
        evidenceGraphInput
      );


    unresolvedEvidenceClaims =
      claimsInput.filter(
        (
          claim
        ) =>
          !verifiedAfterWave.has(
            claim.id
          )
      );


    evidenceRecoveryWaves.push({
      wave:
        recoveryWave +
        1,

      query:
        recoveryPrimaryQuery,

      unresolvedBefore,

      discoveredSources:
        fallbackEvidenceSources
          .length,

      verifiedAfter:
        verifiedAfterWave
          .size,

      unresolvedAfter:
        unresolvedEvidenceClaims
          .map(
            (
              claim
            ) =>
              claim.id
          ),
    });


    console.info(
      "[content evidence recovery wave]",
      evidenceRecoveryWaves[
        evidenceRecoveryWaves.length -
          1
      ]
    );
  }


  const finallyVerifiedClaimIds =
    verifiedClaimIdsFromGraph(
      evidenceGraphInput
    );


  console.info(
    "[content evidence closure]",
    {
      claims:
        claimsInput.length,

      initiallyVerified:
        initiallyVerifiedClaimIds
          .size,

      fallbackSources:
        fallbackEvidenceSourcesTotal,

      recoveryWaves:
        evidenceRecoveryWaves,

      finallyVerified:
        finallyVerifiedClaimIds
          .size,

      unresolvedAfterFallback:
        claimsInput
          .filter(
            (
              claim
            ) =>
              !finallyVerifiedClaimIds.has(
                claim.id
              )
          )
          .map(
            (
              claim
            ) =>
              claim.id
          ),
    }
  );


  // ---- Stage 8A/8B ----
  const questions = [...new Set(plan.questions.map((q) => q.trim()).filter(Boolean))];

  const originalValueFocus =
    originalValuePlan
      .focusTopic
      ? normalizeText(
          originalValuePlan
            .focusTopic
        )
      : "";


  const preferredAssetSectionIndex =
    originalValueFocus
      ? plan.sections.findIndex(
          (
            section
          ) =>
            normalizeText(
              `${section.heading} ${section.mission}`
            ).includes(
              originalValueFocus
            )
        )
      : -1;


  const assetSectionIndex =
    preferredAssetSectionIndex >=
      0
      ? preferredAssetSectionIndex
      : (
          plan.sections.length >
            1
            ? 1
            : 0
        );


  const sectionClaimPlans =
    plan.sections.map(
      (
        section,
        sectionIndex
      ) => {
        const raw =
          (
            section as
              typeof section & {
                requiredClaimIds?:
                  unknown;
              }
          ).requiredClaimIds;


        if (
          !Array.isArray(
            raw
          )
        ) {
          throw new ProductionMasterLiveStagePlanError(
            "LIVE_STAGE_PLAN_SECTION_CLAIM_IDS_REQUIRED",
            `Section ${sectionIndex} must provide requiredClaimIds.`
          );
        }


        const requiredClaimIds:
          string[] =
            [];


        for (
          const value
          of raw
        ) {
          if (
            typeof value !==
            "string" ||
            value.trim()
              .length ===
              0
          ) {
            throw new ProductionMasterLiveStagePlanError(
              "LIVE_STAGE_PLAN_SECTION_CLAIM_ID_INVALID",
              `Section ${sectionIndex} contains an invalid requiredClaimId.`
            );
          }


          requiredClaimIds.push(
            value.trim()
          );
        }


        return {
          requiredClaimIds: [
            ...new Set(
              requiredClaimIds
            ),
          ],
        };
      }
    );


  const sectionEvidenceAssignments =
    assignVerifiedEvidenceToExplicitSectionsV2({
      sections:
        sectionClaimPlans,

      claims:
        claimsInput,

      evidenceGraph:
        evidenceGraphInput,
    });


  /*
   * PRODUCTION_INTERNAL_LINK_SELECTION_V1
   *
   * Existing crawled URLs only.
   * No invented URL.
   * No invented anchor.
   * No fixed internal-link quota.
   */
  const internalLinkSelection =
    buildInternalLinkSelectionV1({
      siteHostname:
        research
          .keywordContext
          ?.hostname ??
        "",

      /*
       * CREATE does not yet guarantee a final canonical URL.
       */
      articleTargetUrl:
        null,

      candidates:
        research
          .internalLinkCandidates ??
        [],

      sections:
        plan.sections.map(
          (
            section,
            index
          ) => ({
            id:
              `section-${index + 1}`,

            heading:
              section.heading,

            mission:
              section.mission,

            topics:
              section.topics,
          })
        ),
    });


  const internalLinksBySectionId =
    new Map(
      internalLinkSelection
        .assignments
        .map(
          (
            assignment
          ) => [
            assignment.sectionId,
            assignment.targetUrls,
          ] as const
        )
    );


  const sectionsInput: ProductionMasterArtifactPipelineInput["sectionBlueprints"]["sections"] =
    plan.sections.map(
      (
        s,
        index
      ) => ({
        heading:
          s.heading.trim(),

        mission:
          s.mission.trim(),

        expectedOutcome:
          s.expectedOutcome.trim(),

        requiredClaims:
          [
            ...(
              sectionEvidenceAssignments[
                index
              ]?.requiredClaims ??
              []
            ),
          ],

        evidenceIds:
          [
            ...(
              sectionEvidenceAssignments[
                index
              ]?.evidenceIds ??
              []
            ),
          ],

        internalLinks:
          [
            ...(
              internalLinksBySectionId.get(
                `section-${index + 1}`
              ) ??
              []
            ),
          ],

        ...(
          originalValuePlan
            .assetId &&
          index ===
            assetSectionIndex
            ? {
                asset:
                  originalValuePlan
                    .assetId,
              }
            : {}
        ),
      })
    );


  /*
   * LIVE_ARTICLE_EXECUTION_PLAN_V1
   *
   * This is the canonical immutable bridge between live Research
   * and Writer execution.
   *
   * No topic-specific rules.
   * No keyword-density rules.
   * No fixed article length.
   */
  const topicIdByLabel =
    new Map(
      plannedTopicLabels.map(
        (
          topic,
          index
        ) => [
          topic,
          `topic-${index + 1}`,
        ] as const
      )
    );


  const questionIdByLabel =
    new Map(
      plannedQuestions.map(
        (
          question,
          index
        ) => [
          question,
          `question-${index + 1}`,
        ] as const
      )
    );


  const verifiedClaimIds =
    new Set(
      evidenceGraphInput
        .claimEvidence
        .filter(
          (
            evidence
          ) =>
            evidence.relation ===
              "SUPPORTS" &&
            evidence.kind ===
              "VERIFIED_EXCERPT" &&
            Boolean(
              evidence.excerpt
                ?.trim()
            )
        )
        .map(
          (
            evidence
          ) =>
            evidence.claimId
        )
    );


  const verifiedEvidenceIds =
    evidenceGraphInput
      .claimEvidence
      .filter(
        (
          evidence
        ) =>
          evidence.relation ===
            "SUPPORTS" &&
          evidence.kind ===
            "VERIFIED_EXCERPT" &&
          Boolean(
            evidence.excerpt
              ?.trim()
          )
      )
      .map(
        (
          evidence
        ) =>
          evidence.id
      );


  /*
   * PRODUCTION_MEDIA_REQUIREMENTS_V1
   *
   * Derived ONLY from the existing assigned OriginalValueAsset.
   *
   * No second asset planner.
   * No fixed image count.
   * No invented screenshot/chart/video.
   */
  const assignedOriginalValueAsset =
    originalValuePlan
      .assetId
      ? originalValuePlan
          .input
          .assets
          .find(
            (
              asset
            ) =>
              asset.id ===
              originalValuePlan
                .assetId
          ) ??
        null
      : null;


  if (
    originalValuePlan
      .assetId &&
    !assignedOriginalValueAsset
  ) {
    throw new ProductionMasterLiveStagePlanError(
      "LIVE_STAGE_PLAN_MEDIA_ASSIGNED_ASSET_NOT_FOUND",
      originalValuePlan.assetId
    );
  }


  const mediaRequirements =
    assignedOriginalValueAsset
      ? buildMediaRequirementsForAssignedAssetV1({
          sectionId:
            `section-${assetSectionIndex + 1}`,

          asset:
            assignedOriginalValueAsset,
        })
      : Object.freeze(
          []
        );


  console.info(
    "[content media requirements]",
    {
      count:
        mediaRequirements.length,

      requirements:
        mediaRequirements.map(
          (
            requirement
          ) => ({
            id:
              requirement.id,

            sectionId:
              requirement.sectionId,

            assetId:
              requirement.assetId,

            type:
              requirement.type,

            status:
              requirement.status,
          })
        ),
    }
  );


  const executionSections =
    plan.sections.map(
      (
        section,
        index
      ) => {
        const assignment =
          sectionEvidenceAssignments[
            index
          ];


        const requiredClaimIds =
          [
            ...(
              assignment
                ?.requiredClaims ??
              []
            ),
          ];


        const evidenceIds =
          [
            ...(
              assignment
                ?.evidenceIds ??
              []
            ),
          ];


        const hasUnsupportedRequiredClaim =
          requiredClaimIds.some(
            (
              claimId
            ) =>
              !verifiedClaimIds.has(
                claimId
              )
          );


        return {
          id:
            `section-${index + 1}`,

          heading:
            section.heading.trim(),

          level:
            2 as const,

          mission:
            section.mission.trim(),

          requiredTopicIds:
            section.topics.map(
              (
                topic
              ) => {
                const id =
                  topicIdByLabel.get(
                    topic.trim()
                  );


                if (!id) {
                  throw new ProductionMasterLiveStagePlanError(
                    "LIVE_STAGE_PLAN_SECTION_TOPIC_ID_RESOLUTION_FAILED",
                    topic
                  );
                }


                return id;
              }
            ),

          requiredQuestionIds:
            section.questions.map(
              (
                question
              ) => {
                const id =
                  questionIdByLabel.get(
                    question.trim()
                  );


                if (!id) {
                  throw new ProductionMasterLiveStagePlanError(
                    "LIVE_STAGE_PLAN_SECTION_QUESTION_ID_RESOLUTION_FAILED",
                    question
                  );
                }


                return id;
              }
            ),

          requiredEntityIds:
            [],

          requiredClaimIds,

          evidenceIds,

          state:
            hasUnsupportedRequiredClaim
              ? "DEFERRED_NO_EVIDENCE" as const
              : "WRITABLE" as const,
        };
      }
    );


  const articleExecutionPlanBase =
    buildArticleExecutionPlanV1({
      websiteId:
        mission.websiteId,

      topic:
        mission.topic,

      primaryQuery:
        research.keyword.trim(),

      intent:
        plan.intent.trim(),

      pageType:
        plan.pageType.trim(),

      riskClass:
        mission.riskClass,

      pageAction:
        plan.action,

      /*
       * The Stage planner already decided which information jobs
       * belong to THIS page.
       *
       * Therefore every selected Stage-plan topic/question is a
       * required coverage job for this execution instance.
       *
       * This is topic-agnostic and does not impose any particular
       * number of topics or sections.
       */
      requiredTopics:
        plannedTopicLabels.map(
          (
            topic,
            index
          ) => ({
            id:
              `topic-${index + 1}`,

            label:
              topic,

            priority:
              "MUST" as const,
          })
        ),

      requiredQuestions:
        plannedQuestions.map(
          (
            question,
            index
          ) => ({
            id:
              `question-${index + 1}`,

            label:
              question,

            priority:
              "MUST" as const,
          })
        ),

      requiredEntities:
        [],

      verifiedEvidenceIds,

      sections:
        executionSections,
    });


  /*
   * ARTICLE_EXECUTION_PLAN_MEDIA_LOCK_V1
   *
   * ArticleExecutionPlan remains the sole post-lock authority.
   */
  const articleExecutionPlan:
    Readonly<ArticleExecutionPlanV1> =
      Object.freeze({
        ...articleExecutionPlanBase,

        mediaRequirements:
          Object.freeze([
            ...mediaRequirements,
          ]),
      });



  /*
   * Stage 1 boundary:
   *
   * SearchMission contains mission semantics only.
   * Query intent belongs to Stage 2 QueryGraph and MUST NOT
   * leak into the immutable SearchMission contract.
   */
  const missionSemantic = {
    websiteId: mission.websiteId,
    topic: mission.topic,
    audience: mission.audience,
    readerGoal: mission.readerGoal,
    businessRelationship: mission.businessRelationship,
    jurisdiction: mission.jurisdiction,
    language: mission.language,
    location: mission.location,
    riskClass: mission.riskClass,
  };

  const stages: ProductionMasterLiveStageContract = {
    mission: missionSemantic,

    queryGraph: {
      missionIntent: mission.missionIntent,
      signals: querySignals,
    },

    expectedCoverage: {
      topics: expectedCoverageTopics,
    },

    gaps: {
      observations: gapObservations,
    },

    originalValue:
      originalValuePlan
        .input,

    evidenceGraph: evidenceGraphInput,

    claimLedger: {
      claims: claimsInput,
      asOf: new Date(),
    },

    masterBlueprint: {
      action: plan.action,
      primaryQuery:
        research
          .keyword
          .trim(),
      queryNodeIds: [],
      intent: plan.intent.trim(),
      pageType: plan.pageType.trim(),
      questions,

      internalLinkTargets:
        [
          ...internalLinkSelection
            .approvedTargetUrls,
        ],
    },

    sectionBlueprints: {
      sections: sectionsInput,
    },

    internalLinkPlan:
      [
        ...internalLinkSelection
          .concretePlan,
      ],
    styleRules: [],
  };

  const bundle = buildProductionMasterLiveSourceBundle({ research, stages });

  const searchMissionInput: ExplicitSearchMissionInput = {
    audience: mission.audience,
    readerGoal: mission.readerGoal,
    businessRelationship: mission.businessRelationship,
    jurisdiction: mission.jurisdiction,
    language: mission.language,
    location: mission.location,
    riskClass: mission.riskClass,
  };

  return Object.freeze({
    masterArtifacts: bundle.input,
    searchMissionInput,
    research,
    articleExecutionPlan,
  });
}
