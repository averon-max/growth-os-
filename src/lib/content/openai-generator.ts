import {
  normalizeGeneratedSectionCandidateV1,
} from "./section-candidate-normalization-v1";

import {
  currentContentProviderStageV1,
  recordContentProviderRequestV1,
  runWithContentProviderDispatchMetaV1,
} from "./content-provider-request-context-v1";

import {
  recordWriterModelExchangeV1,
  recordWriterTraceV1,
  recordWriterForensicArtifactV1,
  hashTraceTextV1,
} from "./writer-trace-v1";

import OpenAI from "openai";
import { ContentRunBudgetExceededErrorV1 } from "./content-run-budget-v1";
import type {
  SerpReplayPairwiseGeneratorV1,
} from "./serp-replay";

import {
  buildSerpReplayPairwisePrompt,
  parseSerpReplayPairwiseCandidateV1,
} from "./serp-replay-prompt";

import type {
  MasterArticleSemanticCriticCandidateV1,
  MasterArticleSemanticCriticGenerator,
} from "./master-article-semantic-critics";

import {
  finalizeMasterArticleSemanticCriticRunV1,
  normalizeMasterArticleSemanticCriticCandidateV1,
} from "./master-article-semantic-critics";

import {
  buildMasterArticleSemanticCriticPrompt,
} from "./master-article-semantic-critic-prompt";

import type {
  MasterSectionRepairGenerator,
  SectionRepairInputV1,
} from "./master-section-repair";

import {
  buildMasterSectionRepairPrompt,
} from "./master-section-repair-prompt";

import type {
  MasterSectionSemanticVerifier,
  SectionSemanticVerificationCandidateV1,
} from "./master-section-semantic-verifier";

import {
  extractSectionSemanticProseUnitsV1,
  finalizeSectionSemanticVerificationV1,
} from "./master-section-semantic-verifier";

import {
  buildMasterSectionSemanticVerificationPrompt,
} from "./master-section-semantic-prompt";

import type {
  GeneratedArticleShellCandidateV1,
  MasterArticleShellGenerator,
} from "./master-article-shell-generator";

import {
  finalizeGeneratedArticleShellV1,
} from "./master-article-shell-generator";

import {
  buildMasterArticleShellPrompt,
} from "./master-article-shell-prompt";

import type {
  GeneratedSectionCandidateV1,
  MasterArticleGenerator,
} from "./master-article-generator";

import {
  finalizeGeneratedSectionV1,
} from "./master-article-generator";

import {
  buildMasterSectionPrompt,
} from "./master-section-prompt";

import type {
  ArticleCritiqueInput,
  ArticleCritiqueResult,
  ArticleCriticFinding,
  ArticleRewriteInput,
  ArticleReviewGenerator,
} from "./generator";

import { ContentGenerationError } from "./generator";
import type { ContentBriefInput, GeneratedBrief, GeneratedArticle, ContentOutlineSection } from "./types";

const OPENAI_TIMEOUT_MS = 60000;

const MAX_RETRIES =
  5;

function requireEnv(
  name:
    string
): string {
  const value =
    process.env[
      name
    ];

  if (!value) {
    throw new Error(
      `${name} is not set`
    );
  }

  return value;
}

function sleep(
  ms:
    number
): Promise<void> {
  return new Promise(
    (
      resolve
    ) =>
      setTimeout(
        resolve,
        ms
      )
  );
}

export type ContentAiProvider = "openai";


export type OpenAiReasoningEffort =
  | "none"
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "max";


export function resolveContentAiProvider(
  env:
    Record<string, string | undefined> =
      process.env
): ContentAiProvider {
  /*
   * GPT_ONLY_PROVIDER_SELECTION_V1
   *
   * Growth OS Content production supports OpenAI only.
   * Legacy Gemini/Groq transport functions may remain as
   * unreachable implementation history until cleanup.
   */
  const provider =
    env.CONTENT_AI_PROVIDER
      ?.trim()
      .toLowerCase();

  if (
    !provider ||
    provider ===
      "openai"
  ) {
    return "openai";
  }

  throw new ContentGenerationError(
    `Unsupported CONTENT_AI_PROVIDER in GPT-only Content runtime: ${provider}`
  );
}


export function resolveOpenAiContentModel(
  env:
    Record<string, string | undefined> =
      process.env
): string {
  return (
    env.OPENAI_CONTENT_MODEL
      ?.trim() ||
    "gpt-5.6-luna"
  );
}


export function resolveOpenAiReasoningEffort(
  env:
    Record<string, string | undefined> =
      process.env
): OpenAiReasoningEffort {
  const value =
    (
      env.OPENAI_CONTENT_REASONING
        ?.trim()
        .toLowerCase() ||
      "low"
    );

  if (
    value === "none" ||
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "xhigh" ||
    value === "max"
  ) {
    return value;
  }

  throw new ContentGenerationError(
    `Unsupported OPENAI_CONTENT_REASONING: ${value}`
  );
}


const OPENAI_MODEL =
  resolveOpenAiContentModel();


function selectedContentModelName(): string {
  /*
   * GPT_ONLY_CONTENT_MODEL_IDENTITY_V1
   *
   * Telemetry/generatedBy must reflect the provider that
   * actually receives production Content requests.
   */
  return resolveOpenAiContentModel();
}



async function callOpenAiApi(
  prompt:
    string,
  options?:
    Readonly<{
      reasoningEffort?:
        OpenAiReasoningEffort;
    }>
): Promise<string> {
  /*
   * OPENAI_RESPONSES_TRANSPORT_V1
   *
   * Cost strategy:
   * - gpt-5.6-luna
   * - low reasoning for normal generation
   * - none for classification/verifier work
   * - low verbosity
   * - no persisted response state
   */

  const client =
    new OpenAI({
      apiKey:
        requireEnv(
          "OPENAI_API_KEY"
        ),

      maxRetries:
        0,

      timeout:
        OPENAI_TIMEOUT_MS,
    });

  const effort =
    options
      ?.reasoningEffort ??
    resolveOpenAiReasoningEffort();

  const rawMax =
    Number(
      process.env
        .OPENAI_MAX_OUTPUT_TOKENS ??
      "5000"
    );

  const maxOutputTokens =
    Number.isFinite(
      rawMax
    ) &&
    rawMax >=
      512
      ? Math.floor(
          rawMax
        )
      : 5000;

  const forensicStageV1 = currentContentProviderStageV1() ?? "content.ai.json";
  const forensicPromptHashV1 = hashTraceTextV1(prompt);

  // Explicit opt-in only: reasoning summaries are not private chain-of-thought.
  // When off, the provider request is byte-for-byte logically unchanged.
  const diagnosticReasoningSummaryV1 =
    process.env.GROWTH_OS_WRITER_TRACE_REASONING_SUMMARY === "1" && effort !== "none";
  recordWriterTraceV1("model.request_configuration", {
    stage: forensicStageV1, promptSha256: forensicPromptHashV1,
    model: OPENAI_MODEL, reasoningEffort: effort,
    maxOutputTokens, providerRetries: MAX_RETRIES,
    storeResponse: false, format: "json_object", verbosity: "low",
    reasoningSummaryRequested: diagnosticReasoningSummaryV1,
  });
  recordWriterForensicArtifactV1("model.request_input", {
    stage: forensicStageV1, promptSha256: forensicPromptHashV1,
    model: OPENAI_MODEL, reasoningEffort: effort, maxOutputTokens,
    developerMessage: "Return valid JSON only. Follow the requested contract exactly. Never invent evidence, rankings, metrics, claims, search observations, or business facts.",
    prompt,
    storeResponse: false,
  });

  let lastError:
    ContentGenerationError |
    null =
      null;

  for (
    let attempt = 0;
    attempt <=
      MAX_RETRIES;
    attempt++
  ) {
    try {
      /*
       * CONTENT_PROVIDER_REQUEST_BUDGET_V1:openai
       *
       * OpenAI SDK has maxRetries=0.
       * Therefore this is exactly one physical provider attempt.
       */
      recordContentProviderRequestV1({
        provider:
          "openai",

        model:
          OPENAI_MODEL,

        attempt:
          attempt +
          1,

        prompt,
      });


      const response =
        await client.responses.create({
          model:
            OPENAI_MODEL,

          reasoning: {
            effort,
            ...(diagnosticReasoningSummaryV1 ? { summary: "auto" as const } : {}),
          },

          input: [
            {
              role:
                "developer",

              content:
                "Return valid JSON only. Follow the requested contract exactly. Never invent evidence, rankings, metrics, claims, search observations, or business facts.",
            },

            {
              role:
                "user",

              content:
                prompt,
            },
          ],

          text: {
            format: {
              type:
                "json_object",
            },

            verbosity:
              "low",
          },

          max_output_tokens:
            maxOutputTokens,

          store:
            false,
        });

      const output =
        response
          .output_text
          ?.trim();

      if (!output) {
        throw new ContentGenerationError("OpenAI returned no content");
      }

      const availableReasoningSummariesV1 = response.output.flatMap(item =>
        item.type === "reasoning" && Array.isArray(item.summary)
          ? item.summary.map(summary => summary.text)
          : []
      );
      recordWriterTraceV1("model.reasoning_summary_availability", {
        stage: forensicStageV1, promptSha256: forensicPromptHashV1,
        requested: diagnosticReasoningSummaryV1,
        returnedSummaries: availableReasoningSummariesV1.length,
      });
      if (availableReasoningSummariesV1.length > 0) {
        recordWriterForensicArtifactV1("model.available_reasoning_summaries", {
          summaries: availableReasoningSummariesV1,
        });
      }
      recordWriterTraceV1("model.response_metadata", {
        stage: forensicStageV1, promptSha256: forensicPromptHashV1,
        model: OPENAI_MODEL,
        requestAttempt: attempt + 1,
        responseId: response.id ?? null,
        responseStatus: response.status ?? null,
      });
      recordWriterForensicArtifactV1("model.response_envelope", {
        stage: forensicStageV1, promptSha256: forensicPromptHashV1,
        response,
        requestAttempt: attempt + 1,
      });
      recordWriterTraceV1("model.usage", {
        stage: forensicStageV1, promptSha256: forensicPromptHashV1,
        model: OPENAI_MODEL,
        reasoningEffort: effort,
        inputTokens: response.usage?.input_tokens ?? null,
        outputTokens: response.usage?.output_tokens ?? null,
        totalTokens: response.usage?.total_tokens ?? null,
      });

      return output;
    } catch (
      cause
    ) {
      if (cause instanceof ContentRunBudgetExceededErrorV1) {
        throw cause;
      }

      const status =
        typeof cause ===
          "object" &&
        cause !== null &&
        "status" in cause &&
        typeof (
          cause as {
            status?:
              unknown;
          }
        ).status ===
          "number"
          ? (
              cause as {
                status:
                  number;
              }
            ).status
          : null;

      const message =
        cause instanceof
          Error
          ? cause.message
          : String(
              cause
            );

      recordWriterTraceV1("model.request_failed_attempt", {
        stage: forensicStageV1, promptSha256: forensicPromptHashV1,
        model: OPENAI_MODEL,
        requestAttempt: attempt + 1,
        status,
        errorName: cause instanceof Error ? cause.name : "unknown",
        // The full error may contain provider data, do not log unsanitized details.
      });
      lastError =
        new ContentGenerationError(
          `OpenAI API error ${
            status ??
            "unknown"
          }: ${message.slice(
            0,
            600
          )}`
        );

      const retryable =
        (
          status !== null &&
          [
            408,
            409,
            413,
            429,
            500,
            502,
            503,
            504,
          ].includes(
            status
          )
        ) ||
        /timeout|timed out|fetch failed|network|ECONN|ENET|EAI_AGAIN/i.test(
          message
        );

      if (
        retryable &&
        attempt <
          MAX_RETRIES
      ) {
        const retryAfterMs =
          Math.min(
            1000 *
              2 ** attempt,
            8000
          );

        console.warn(
          "[openai] temporary provider failure",
          {
            model:
              OPENAI_MODEL,

            effort,

            status,

            attempt:
              attempt +
              1,

            retryAfterMs,
          }
        );

        await sleep(
          retryAfterMs
        );

        continue;
      }

      throw lastError;
    }
  }

  throw (
    lastError ??
    new ContentGenerationError(
      "OpenAI request failed after retries"
    )
  );
}


/* OpenAI is the only live Content provider. */
export async function callContentAiJson(
  prompt:
    string,
  options?:
    Readonly<{
      forceAlternateProvider?:
        boolean;

      reasoningEffort?:
        OpenAiReasoningEffort;
    }>
): Promise<string> {
  /*
   * GPT_ONLY_CONTENT_RUNTIME_V1
   *
   * Canonical Growth OS Content AI transport is OpenAI only.
   *
   * forceAlternateProvider remains in the public/internal API
   * for compatibility with existing recovery callers, but it
   * NEVER changes vendors.
   *
   * Gemini/Groq legacy transport helpers may remain below as
   * dead compatibility code until cleanup, but this dispatcher
   * cannot reach them.
   */
  if (
    !process.env
      .OPENAI_API_KEY
      ?.trim()
  ) {
    throw new ContentGenerationError(
      "OPENAI_API_KEY is not configured"
    );
  }

  const effort =
    options
      ?.reasoningEffort ??
    resolveOpenAiReasoningEffort();

  if (
    options
      ?.forceAlternateProvider
  ) {
    console.warn(
      "[content ai] GPT-only structured recovery using OpenAI"
    );
  }

  const output = await callOpenAiApi(prompt, { reasoningEffort: effort });
  recordWriterModelExchangeV1({
    stage: currentContentProviderStageV1() ?? "content.ai.json",
    model: OPENAI_MODEL,
    prompt,
    output,
  });
  return output;
}


function parseJson<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ContentGenerationError("OpenAI returned malformed JSON");
  }
}

function criticRecord(
  value: unknown
): Record<string, unknown> | null {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value
    )
  ) {
    return null;
  }

  return value as
    Record<string, unknown>;
}

function sanitizeCritiqueResult(
  role:
    ArticleCritiqueInput["role"],
  raw:
    unknown
): ArticleCritiqueResult {
  const root =
    criticRecord(
      raw
    );
  if (
    !root ||
    typeof root.pass !==
      "boolean" ||
    !Array.isArray(
      root.findings
    )
  ) {
    throw new ContentGenerationError(
      "OpenAI returned malformed critic response"
    );
  }



  const rawFindings =
    Array.isArray(
      root?.findings
    )
      ? root.findings
      : [];

  const findings:
    ArticleCriticFinding[] =
      [];

  for (
    const item
    of rawFindings
  ) {
    const finding =
      criticRecord(
        item
      );

    if (!finding) {
      continue;
    }

    const severity =
      finding.severity;

    if (
      severity !==
        "BLOCKER" &&
      severity !==
        "MAJOR" &&
      severity !==
        "MINOR"
    ) {
      continue;
    }

    const code =
      typeof finding.code ===
        "string"
        ? finding.code.trim()
        : "";

    const message =
      typeof finding.message ===
        "string"
        ? finding.message.trim()
        : "";

    const evidence =
      typeof finding.evidence ===
        "string"
        ? finding.evidence.trim()
        : "";

    const instruction =
      typeof finding.instruction ===
        "string"
        ? finding.instruction.trim()
        : "";

    if (
      !code ||
      !message ||
      !instruction
    ) {
      continue;
    }

    findings.push({
      code:
        code
          .toUpperCase()
          .replace(
            /[^A-Z0-9_]+/g,
            "_"
          )
          .slice(
            0,
            80
          ),

      severity,

      message:
        message.slice(
          0,
          500
        ),

      evidence:
        evidence.slice(
          0,
          600
        ),

      instruction:
        instruction.slice(
          0,
          600
        ),
    });

    if (
      findings.length >=
      12
    ) {
      break;
    }
  }

  return {
    role,

    pass:
      !findings.some(
        (finding) =>
          finding.severity ===
            "BLOCKER" ||
          finding.severity ===
            "MAJOR"
      ),

    findings,
  };
}

function criticInstruction(
  role:
    ArticleCritiqueInput["role"]
): string {
  switch (role) {
    case "SEARCH_INTENT":
      return [
        "Audit whether the article genuinely satisfies the exact search intent and user job.",
        "Check whether the main answer appears early.",
        "Check whether page format matches the research context.",
        "Check required topics, same-intent questions, and evidence-backed SERP gaps.",
        "Treat only requirements explicitly present in the planned outline or authoritative research context as mandatory coverage.",
        "Do not invent missing-section requirements from general domain knowledge. If a subject is absent from the approved outline and research requirements, do not flag it as missing.",
        "Flag shallow coverage, intent drift, irrelevant sections, missing key answers, or a page that solves the wrong problem.",
        "Do not demand arbitrary word counts, heading counts, keyword density, or exact-match repetition.",
      ].join("\n");

    case "FACT_CLAIM":
      return [
        "Audit every material factual and product claim with adversarial skepticism.",
        "For external claims, only source records marked VERIFIED_EXCERPT are publication-grade evidence. SEARCH_SNIPPET and REFERENCE_ONLY records are discovery context only.",
        "If a material external claim is supported, reference its stable source ID in the evidence field.",
        "Product capabilities, metrics, guarantees, data sources, awards, superlatives, customers, datasets, monitoring coverage, and security claims require verified support in the research context.",
        "General non-quantified educational explanations do not automatically require VERIFIED_EXCERPT. Reserve evidence-blocking findings for sensitive external claims such as prices or fees, rankings or best-of claims, legal or regulatory assertions, precise guarantees/timing/completeness, named third-party capabilities, and unsupported product claims.",
        "SEARCH_SNIPPET and REFERENCE_ONLY material is discovery context only and cannot authorize a sensitive claim.",
        "Do not mark a generic benefit or explanatory statement unverified merely because no external excerpt exists unless it falls into one of those sensitive categories.",
        "Flag invented or overconfident statistics, citations, studies, sources, and capabilities.",
        "Never fabricate evidence in order to repair a claim.",
        "If support is absent, instruct the writer to remove, qualify, or narrow the statement.",
      ].join("\n");

    case "EDITORIAL":
      return [
        "Audit the article as a demanding senior human editor.",
        "Flag generic AI introductions, filler, repetition, vague claims, empty transitions, robotic conclusions, redundant headings, shallow explanation, and unnecessary verbosity.",
        "Prefer direct answers, specificity, useful reasoning, and clear information architecture.",
        "Do not force keywords unnaturally.",
        "Do not invent facts or examples that require unavailable evidence.",
      ].join("\n");

    default:
      return "";
  }
}

export const openAiGenerator:
  ArticleReviewGenerator &
  MasterArticleGenerator &
  MasterArticleShellGenerator
  & MasterSectionSemanticVerifier
  & MasterSectionRepairGenerator
  & MasterArticleSemanticCriticGenerator
  & SerpReplayPairwiseGeneratorV1 = {
  modelName:
    selectedContentModelName(),

  async generateBrief(input: ContentBriefInput): Promise<GeneratedBrief> {
    const topKeywordsBlock = input.topKeywords && input.topKeywords.length > 0
      ? `\n\nReal keyword performance already observed on this website (from Search Console):\n${input.topKeywords
          .map((k) => `- "${k.keyword}" -- position ${k.position ?? "unranked"}, ${k.clicks} clicks, ${k.impressions} impressions/mo, volume ${k.volume ?? "unknown"}`)
          .join("\n")}`
      : "";

    const relatedKeywordsBlock = input.relatedKeywords && input.relatedKeywords.length > 0
      ? `\n\nObserved related queries (primary, approved secondary, and supporting research; metrics are unknown when not observed):\n${input.relatedKeywords
          .map((k) => `- "${k.keyword}" -- volume ${k.searchVolume ?? "unknown"}, difficulty ${k.keywordDifficulty ?? "unknown"}, CPC ${k.cpc ?? "unknown"}`)
          .join("\n")}`
      : "";

    const prompt = `You are an SEO content strategist for the business "${input.businessName}" (website: ${input.websiteUrl}).

An SEO opportunity was detected:
Topic: ${input.topic}
Reason: ${input.reason}
Recommended action: ${input.recommendation}
${topKeywordsBlock}${relatedKeywordsBlock}

Ground your primaryKeyword and secondaryKeywords choices in the real data above when it is present -- prefer keywords with actual observed clicks/impressions or real search volume over invented ones. If no real data is provided above, reason from the topic as before.

Produce a content brief as JSON with this exact shape:
{
  "searchIntent": "informational" | "commercial" | "transactional" | "navigational",
  "primaryKeyword": "string",
  "secondaryKeywords": ["string", "..."],
  "outline": [{ "heading": "string", "level": 2, "summary": "string" }]
}

The outline must assume exactly one page-level H1 represented by the article title and not included in the outline.

There is no required or ideal number of H2 or H3 headings.

Create an H2 only when there is a genuinely distinct major sub-intent, user question, process stage, comparison, concept, or topic required to satisfy the search intent.

Create an H3 only when a specific H2 genuinely requires meaningful subdivision.

Do not add headings to hit a numerical target, increase article length, repeat keywords, or imitate competitor heading counts.

Every heading must earn its place by improving the information architecture.

Respond with JSON only.`;

    const text = await callContentAiJson(prompt);
    const parsed = parseJson<GeneratedBrief>(text);

    if (!parsed.primaryKeyword || !Array.isArray(parsed.outline) || parsed.outline.length === 0) {
      throw new ContentGenerationError("OpenAI returned an incomplete brief");
    }

    return parsed;
  },

  async generateArticle(input): Promise<GeneratedArticle> {
    const outlineText = input.outline.map((s: ContentOutlineSection) => `H${s.level}: ${s.heading} — ${s.summary}`).join("\n");

    const prompt = `You are an SEO content writer for the business "${input.businessName}" (website: ${input.websiteUrl}).

Write a complete article following this brief:
Primary keyword: ${input.primaryKeyword}
Secondary keywords: ${input.secondaryKeywords.join(", ")}
Search intent: ${input.searchIntent}

Reason:
${input.reason}

Editorial constraints and verified evidence:
${input.recommendation}

FACTUAL REQUIREMENTS:
- Never invent facts about the business or product.
- Never infer product capabilities from competitors, SERP results, the topic, the industry, or the company name.
- Never invent dataset sizes, breach-record counts, customer counts, dark-web coverage, stealer-log coverage, monitoring capabilities, guarantees, awards, or superlatives.
- If a product-specific claim is not explicitly verified in the evidence above, omit it.
- Generic educational cybersecurity statements must be written cautiously and without fabricated sources.
- Make the title and H1 clearly aligned with the primary search intent. Exact-match wording is preferred only when it reads naturally.

Outline:
${outlineText}

Write for humans first, avoid keyword stuffing, use the outline as structure. Produce JSON with this exact shape:
{
  "title": "string, 30-60 chars",
  "metaDescription": "string, 120-160 chars",
  "h1": "string",
  "bodyMarkdown": "string, full article body in markdown using ## and ### headings matching the outline"
}

Respond with JSON only.`;

    const text = await callContentAiJson(prompt);
    const parsed = parseJson<GeneratedArticle>(text);

    if (!parsed.title || !parsed.bodyMarkdown) {
      throw new ContentGenerationError("OpenAI returned an incomplete article");
    }

    return parsed;
  },
  async generateArticleShell(
    input
  ) {
    const prompt =
      buildMasterArticleShellPrompt(
        input
      );

    const text =
      await callContentAiJson(
        prompt
      );

    const candidate =
      parseJson<
        GeneratedArticleShellCandidateV1
      >(
        text
      );

    return finalizeGeneratedArticleShellV1({
      contract:
        input,

      modelName:
        selectedContentModelName(),

      candidate,
    });
  },

  async generateSection(
    input
  ) {
    const prompt =
      buildMasterSectionPrompt(
        input
      );

    const text =
      await callContentAiJson(
        prompt
      );

    const candidate =
      parseJson<
        GeneratedSectionCandidateV1
      >(
        text
      );

    return finalizeGeneratedSectionV1({
      contract:
        input,

      modelName:
        selectedContentModelName(),

      candidate:
        normalizeGeneratedSectionCandidateV1({
          contract:
            input,

          candidate,
        }),
    });
  },

  async reviewMasterArticleSemantics(
    input
  ) {
    const prompt =
      buildMasterArticleSemanticCriticPrompt(
        input
      );

    const response =
      await callContentAiJson(
        prompt
      );

    const candidate =
      parseJson<
        MasterArticleSemanticCriticCandidateV1
      >(
        response
      );

    return finalizeMasterArticleSemanticCriticRunV1({
      contract:
        input.contract,

      context:
        input.context,

      modelName:
        selectedContentModelName(),

      candidate:
          normalizeMasterArticleSemanticCriticCandidateV1({
            contract:
              input.contract,

            candidate,
          }),
    });
  },

  async compareSerpReplayPair(
    input
  ) {
    const prompt =
      buildSerpReplayPairwisePrompt(
        input
      );


    /*
     * Reuse the existing production content-AI transport.
     *
     * Preserve shared OpenAI retry, timeout and JSON response handling.
     */
    const response =
      await callContentAiJson(
        prompt
      );


    const parsed =
      parseJson<unknown>(
        response
      );


    /*
     * First boundary:
     * strict closed JSON shape.
     *
     * Second boundary lives in serp-replay.ts and validates
     * supplied evidence IDs + directional evidence semantics.
     */
    return parseSerpReplayPairwiseCandidateV1(
      parsed
    );
  },


  async repairSection(
    input:
      Readonly<SectionRepairInputV1>
  ) {
    const prompt =
      buildMasterSectionRepairPrompt(
        input
      );


    if (process.env.CONTENT_SEMANTIC_DEBUG === "1") {
      console.info("[repair prompt size]", {
        sectionIndex: input.contract.sectionIndex,
        promptChars: prompt.length,
        estimatedInputTokens: Math.ceil(prompt.length / 4),
      });
    }

    const response =
      await callContentAiJson(
        prompt
      );

    const candidate =
      parseJson<
        GeneratedSectionCandidateV1
      >(
        response
      );

    try {
      const repaired =
        finalizeGeneratedSectionV1({
          contract:
            input.contract,

          modelName:
            selectedContentModelName(),

          candidate:
            normalizeGeneratedSectionCandidateV1({
              contract:
                input.contract,

              candidate,
            }),
        });


      if (
        process.env
          .CONTENT_REPAIR_DEBUG ===
        "1"
      ) {
        const initialBlockers =
          input.semanticVerification
            ?.units
            .filter(
              (
                unit
              ) =>
                unit.classification ===
                  "UNSUPPORTED" ||
                unit.classification ===
                  "CONTRADICTED"
            )
            .map(
              (
                unit
              ) => ({
                unitId:
                  unit.unitId,

                classification:
                  unit.classification,

                matchedClaimId:
                  unit.matchedClaimId,

                evidenceIds:
                  unit.evidenceIds,

                rationale:
                  unit.rationale,
              })
            ) ??
          [];


        console.error(
          "[repair success trace]",
          JSON.stringify(
            {
              sectionIndex:
                input.contract
                  .sectionIndex,

              heading:
                input.contract
                  .blueprint
                  .heading,

              requiredClaims:
                input.contract
                  .blueprint
                  .requiredClaims,

              evidenceIds:
                input.contract
                  .blueprint
                  .evidenceIds,

              initialBlockers,

              originalBody:
                input.section
                  .bodyMarkdown,

              repairedBody:
                repaired
                  .bodyMarkdown,

              originalReferences: {
                claims:
                  input.section
                    .referencedClaimIds,

                evidence:
                  input.section
                    .referencedEvidenceIds,
              },

              repairedReferences: {
                claims:
                  repaired
                    .referencedClaimIds,

                evidence:
                  repaired
                    .referencedEvidenceIds,
              },
            },
            null,
            2
          )
        );
      }


      return repaired;
    } catch (
      cause
    ) {
      console.error(
        "\n================ REPAIR FAILURE TRACE ================"
      );

      console.error(
        "SECTION",
        {
          index:
            input.contract.sectionIndex,

          heading:
            input.contract.blueprint.heading,

          requiredClaims:
            input.contract.blueprint.requiredClaims,

          forbiddenClaims:
            input.contract.blueprint.forbiddenClaims,

          evidenceIds:
            input.contract.blueprint.evidenceIds,
        }
      );

      console.error(
        "ORIGINAL SECTION",
        {
          bodyLength:
            input.section.bodyMarkdown.length,

          bodyPreview:
            input.section.bodyMarkdown.slice(
              0,
              2500
            ),

          coveredQueryNodeIds:
            input.section.coveredQueryNodeIds,

          referencedClaimIds:
            input.section.referencedClaimIds,

          referencedEvidenceIds:
            input.section.referencedEvidenceIds,

          assetUsed:
            input.section.assetUsed,
        }
      );

      console.error(
        "RECONCILIATION",
        input.reconciliation
      );

      console.error(
        "SEMANTIC VERIFICATION",
        input.semanticVerification
      );

      console.error(
        "RAW REPAIR RESPONSE",
        response.slice(
          0,
          4000
        )
      );

      console.error(
        "PARSED REPAIR CANDIDATE",
        candidate
      );

      console.error(
        "FINALIZER ERROR",
        cause instanceof Error
          ? cause.message
          : String(cause)
      );

      console.error(
        "======================================================\n"
      );

      throw cause;
    }
  },

  async verifySectionClaims(
    input
  ) {
    /*
     * SECTION_SEMANTIC_UNIT_CONTINUATION_V1
     *
     * Provider responses may be valid JSON yet omit trailing units
     * when the verification batch is large.
     *
     * Safety properties:
     * - initial deterministic unit set remains authoritative
     * - exactly one continuation call is allowed
     * - continuation receives ONLY missing stable unit IDs
     * - outputs are merged, never synthesized
     * - canonical finalizer still requires exact 1:1 coverage
     * - UNSUPPORTED / CONTRADICTED classifications remain blocking
     */
    const expectedUnits =
      extractSectionSemanticProseUnitsV1({
        sectionIndex:
          input.contract.sectionIndex,

        bodyMarkdown:
          input.section.bodyMarkdown,
      });


    const prompt =
      buildMasterSectionSemanticVerificationPrompt(
        input
      );


    const response =
      await callContentAiJson(
        prompt,
        {
          reasoningEffort:
            "none",
        }
      );


    const candidate =
      parseJson<
        SectionSemanticVerificationCandidateV1
      >(
        response
      );


    const finalize = (
      value:
        SectionSemanticVerificationCandidateV1
    ) =>
      finalizeSectionSemanticVerificationV1({
        contract:
          input.contract,

        section:
          input.section,

        modelName:
          selectedContentModelName(),

        candidate:
          value,
      });


    const candidateUnits = (
      value:
        SectionSemanticVerificationCandidateV1
    ): unknown[] => {
      const record =
        value as unknown as {
          units?:
            unknown[];
        };


      return Array.isArray(
        record.units
      )
        ? record.units
        : [];
    };


    const returnedUnitIds = (
      values:
        readonly unknown[]
    ): Set<string> => {
      const ids =
        new Set<string>();


      for (
        const value
        of values
      ) {
        if (
          typeof value !==
            "object" ||
          value ===
            null
        ) {
          continue;
        }


        const unitId =
          (
            value as {
              unitId?:
                unknown;
            }
          ).unitId;


        if (
          typeof unitId ===
            "string" &&
          unitId.trim()
            .length >
            0
        ) {
          ids.add(
            unitId.trim()
          );
        }
      }


      return ids;
    };


    const debugFailure = ({
      phase,
      rawResponse,
      value,
      error,
      missingUnitIds,
    }: {
      phase:
        "INITIAL" |
        "CONTINUATION";

      rawResponse:
        string;

      value:
        SectionSemanticVerificationCandidateV1;

      error:
        unknown;

      missingUnitIds?:
        readonly string[];
    }) => {
      if (
        process.env
          .CONTENT_SEMANTIC_DEBUG !==
        "1"
      ) {
        return;
      }


      const units =
        candidateUnits(
          value
        );


      console.error(
        "\n============================================================"
      );

      console.error(
        "SEMANTIC UNIT COUNT DEBUG"
      );

      console.error(
        JSON.stringify(
          {
            protocol:
              "SECTION_SEMANTIC_UNIT_CONTINUATION_V1",

            phase,

            sectionIndex:
              input.contract
                .sectionIndex,

            sectionNumber:
              input.contract
                .sectionNumber,

            heading:
              input.contract
                .blueprint
                .heading,

            expectedUnitCount:
              expectedUnits.length,

            expectedUnits,

            candidateUnitCount:
              units.length,

            candidateUnits:
              units,

            missingUnitIds:
              missingUnitIds ??
              [],

            rawResponse,

            error:
              error instanceof
                Error
                ? error.message
                : String(
                    error
                  ),
          },
          null,
          2
        )
      );

      console.error(
        "============================================================\n"
      );
    };


    try {
      const finalized =
          finalize(
            candidate
          );

        /*
         * SEMANTIC_BLOCK_OBSERVABILITY_V3
         *
         * Debug-only telemetry.
         *
         * IMPORTANT:
         * - does not alter classifications
         * - does not alter evidence requirements
         * - does not convert BLOCK to PASS
         * - does not alter repair behavior
         */
        if (
          finalized.status ===
            "BLOCK" &&
          process.env
            .CONTENT_SEMANTIC_DEBUG ===
            "1"
        ) {
          console.error(
            "\n================ SEMANTIC VALID BLOCK ================"
          );

          console.error(
            JSON.stringify(
              {
                sectionIndex:
                  input.contract.sectionIndex,

                sectionNumber:
                  input.contract.sectionNumber,

                heading:
                  input.contract.blueprint.heading,

                mission:
                  input.contract.blueprint.mission,

                expectedOutcome:
                  input.contract.blueprint.expectedOutcome,

                requiredClaims:
                  input.contract.blueprint.requiredClaims,

                forbiddenClaims:
                  input.contract.blueprint.forbiddenClaims,

                evidenceIds:
                  input.contract.blueprint.evidenceIds,

                bodyMarkdown:
                  input.section.bodyMarkdown,

                coveredQueryNodeIds:
                  input.section.coveredQueryNodeIds,

                referencedClaimIds:
                  input.section.referencedClaimIds,

                referencedEvidenceIds:
                  input.section.referencedEvidenceIds,

                verification:
                  finalized,
              },
              null,
              2
            )
          );

          console.error(
            "========================================================\n"
          );
        }

        return finalized;
    } catch (
      error
    ) {
      const message =
        error instanceof
          Error
          ? error.message
          : String(
              error
            );


      if (
        message !==
        "SECTION_SEMANTIC_UNIT_COUNT_MISMATCH"
      ) {
        debugFailure({
          phase:
            "INITIAL",

          rawResponse:
            response,

          value:
            candidate,

          error,
        });

        throw error;
      }


      const initialUnits =
        candidateUnits(
          candidate
        );


      const initialIds =
        returnedUnitIds(
          initialUnits
        );


      const missingUnits =
        expectedUnits.filter(
          (
            unit
          ) =>
            !initialIds.has(
              unit.id
            )
        );


      const missingUnitIds =
        missingUnits.map(
          (
            unit
          ) =>
            unit.id
        );


      debugFailure({
        phase:
          "INITIAL",

        rawResponse:
          response,

        value:
          candidate,

        error,

        missingUnitIds,
      });


      /*
       * A count mismatch with no missing known IDs means the
       * response contains duplicates / unknown IDs. Do not retry
       * that malformed shape: the canonical finalizer owns it.
       */
      if (
        missingUnitIds.length ===
        0
      ) {
        throw error;
      }


      const continuationPrompt =
        buildMasterSectionSemanticVerificationPrompt({
          contract:
            input.contract,

          section:
            input.section,

          unitIds:
            missingUnitIds,
        });


      /*
       * CONTENT_SEMANTIC_CONTINUATION_TELEMETRY_V1
       *
       * This is a second physical provider request within the same
       * logical verifySectionClaims() call.
       */
      const continuationResponse =
        await runWithContentProviderDispatchMetaV1(
          {
            continuation:
              true,
          },

          () =>
            callContentAiJson(
              continuationPrompt,
              {
                reasoningEffort:
                  "none",
              }
            )
        );


      const continuationCandidate =
        parseJson<
          SectionSemanticVerificationCandidateV1
        >(
          continuationResponse
        );


      const continuationUnits =
        candidateUnits(
          continuationCandidate
        );


      const mergedCandidate =
        {
          ...(
            candidate as unknown as
              Record<
                string,
                unknown
              >
          ),

          units: [
            ...initialUnits,
            ...continuationUnits,
          ],
        } as unknown as
          SectionSemanticVerificationCandidateV1;


      try {
        /*
         * Critical boundary:
         *
         * We DO NOT declare success ourselves.
         * The same canonical strict finalizer now receives the
         * merged provider output and rechecks:
         * - exact count
         * - duplicates
         * - unknown IDs
         * - missing IDs
         * - claim IDs
         * - evidence IDs
         * - publication-grade evidence
         * - classification semantics
         */
        return finalize(
          mergedCandidate
        );
      } catch (
        continuationError
      ) {
        debugFailure({
          phase:
            "CONTINUATION",

          rawResponse:
            continuationResponse,

          value:
            mergedCandidate,

          error:
            continuationError,

          missingUnitIds,
        });

        throw continuationError;
      }
    }
  },

  async critiqueArticle(
    input:
      ArticleCritiqueInput
  ): Promise<ArticleCritiqueResult> {
    const prompt = [
      "You are an independent adversarial article critic.",
      "",
      `ROLE: ${input.role}`,
      "",
      criticInstruction(
        input.role
      ),
      "",
      "AUTHORITATIVE RESEARCH CONTEXT:",
      input.researchContext,
      "",
      `PRIMARY QUERY: ${input.primaryKeyword}`,
      `SEARCH INTENT: ${input.searchIntent}`,
      `SECONDARY QUERY CLUSTER: ${input.secondaryKeywords.join(", ") || "none"}`,
      "",
      "PLANNED OUTLINE:",
      input.outline
        .map(
          (section) =>
            `H${section.level}: ${section.heading} — ${section.summary}`
        )
        .join("\n"),
      "",
      "ARTICLE TO AUDIT:",
      JSON.stringify(
        input.article,
        null,
        2
      ),
      "",
      "Return JSON only:",
      "{",
      `  \"role\": \"${input.role}\",`,
      '  "pass": true,',
      '  "findings": [',
      "    {",
      '      "code": "UPPER_SNAKE_CASE",',
      '      "severity": "BLOCKER" | "MAJOR" | "MINOR",',
      '      "message": "specific problem",',
      '      "evidence": "specific excerpt or observation",',
      '      "instruction": "specific repair instruction"',
      "    }",
      "  ]",
      "}",
      "",
      "BLOCKER means the article cannot safely proceed without correction.",
      "MAJOR means a substantial problem requiring rewrite.",
      "MINOR means optional polish and cannot independently block publication.",
      "Do not invent findings merely to return criticism.",
      "If no meaningful issue exists, return an empty findings array.",
      "Do not rewrite the article during this step.",
    ].join("\n");

    const text =
      await callContentAiJson(
        prompt,
        {
          reasoningEffort:
            "none",
        }
      );

    const parsed =
      parseJson<unknown>(
        text
      );

    return sanitizeCritiqueResult(
      input.role,
      parsed
    );
  },

  async rewriteArticle(
    input:
      ArticleRewriteInput
  ): Promise<GeneratedArticle> {
    const prompt = [
      "You are the senior revision editor in a high-stakes publishing workflow.",
      "",
      "Revise only what is necessary to resolve every supplied finding while preserving useful accurate material.",
      "",
      "AUTHORITATIVE RESEARCH CONTEXT:",
      input.researchContext,
      "",
      `PRIMARY QUERY: ${input.primaryKeyword}`,
      `SEARCH INTENT: ${input.searchIntent}`,
      `SECONDARY QUERY CLUSTER: ${input.secondaryKeywords.join(", ") || "none"}`,
      "",
      "PLANNED OUTLINE:",
      input.outline
        .map(
          (section) =>
            `H${section.level}: ${section.heading} — ${section.summary}`
        )
        .join("\n"),
      "",
      "CURRENT ARTICLE:",
      JSON.stringify(
        input.article,
        null,
        2
      ),
      "",
      "CRITIC FINDINGS:",
      JSON.stringify(
        input.findings,
        null,
        2
      ),
      "",
      "REVISION RULES:",
      "- Resolve every supplied finding, including editorial MINOR findings selected for rewrite.",
      "- Never invent facts, statistics, citations, studies, sources, capabilities, guarantees, awards, customers, datasets, or monitoring coverage.",
      "- Unsupported claims must be removed, qualified, or narrowed instead of being given fabricated evidence.",
      "- If a planned section itself requires unavailable verified evidence, remove that section cleanly rather than inventing support or preserving unsupported price, ranking, comparison, legal, or third-party claims.",
      "- Preserve passages that are already accurate and useful.",
      "- Answer the primary user job early.",
      "- Avoid keyword stuffing and unnatural exact-match repetition.",
      "- Do not pad word count.",
      "- Do not manufacture headings to hit a count.",
      "- Exactly one canonical H1 belongs in the h1 field.",
      "- bodyMarkdown must not contain an H1.",
      "",
      "Return JSON only:",
      "{",
      '  "title": "string",',
      '  "metaDescription": "string",',
      '  "h1": "string",',
      '  "bodyMarkdown": "full markdown article body using ## and ### headings"',
      "}",
    ].join("\n");

    const text =
      await callContentAiJson(
        prompt
      );

    const parsed =
      parseJson<GeneratedArticle>(
        text
      );

    if (
      !parsed.title ||
      !parsed.h1 ||
      !parsed.bodyMarkdown
    ) {
      throw new ContentGenerationError(
        "OpenAI returned an incomplete rewritten article"
      );
    }

    return parsed;
  },


};
