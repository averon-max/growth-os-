import type { ContentGenerator } from "./generator";
import { ContentGenerationError } from "./generator";
import type { ContentBriefInput, GeneratedBrief, GeneratedArticle, ContentOutlineSection } from "./types";

const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_TIMEOUT_MS = 60000;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

interface GeminiCandidate {
  content?: { parts?: { text?: string }[] };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 2000;
const RETRYABLE_STATUS_CODES = new Set([429, 503]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = requireEnv("GEMINI_API_KEY");

  let lastError: ContentGenerationError | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

    try {
      const res = await fetch(`${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        lastError = new ContentGenerationError(`Gemini API error ${res.status}: ${body.slice(0, 300)}`);

        if (RETRYABLE_STATUS_CODES.has(res.status) && attempt < MAX_RETRIES) {
          await sleep(BASE_BACKOFF_MS * 2 ** attempt);
          continue;
        }
        throw lastError;
      }

      const data = (await res.json()) as GeminiResponse;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new ContentGenerationError("Gemini returned no content");
      }
      return text;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new ContentGenerationError("Gemini request failed after retries");
}

function parseJson<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ContentGenerationError("Gemini returned malformed JSON");
  }
}

export const geminiGenerator: ContentGenerator = {
  modelName: GEMINI_MODEL,

  async generateBrief(input: ContentBriefInput): Promise<GeneratedBrief> {
    const topKeywordsBlock = input.topKeywords && input.topKeywords.length > 0
      ? `\n\nReal keyword performance already observed on this website (from Search Console):\n${input.topKeywords
          .map((k) => `- "${k.keyword}" -- position ${k.position ?? "unranked"}, ${k.clicks} clicks, ${k.impressions} impressions/mo, volume ${k.volume ?? "unknown"}`)
          .join("\n")}`
      : "";

    const relatedKeywordsBlock = input.relatedKeywords && input.relatedKeywords.length > 0
      ? `\n\nReal related keywords (from DataForSEO):\n${input.relatedKeywords
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

The outline must have exactly one H1-equivalent implied by the article title (not included here), 4-8 H2/H3 sections, each with a one-sentence summary of what it covers. Respond with JSON only.`;

    console.log("[gemini] FULL PROMPT >>>\n" + prompt + "\n<<< END PROMPT");
    const text = await callGemini(prompt);
    const parsed = parseJson<GeneratedBrief>(text);

    if (!parsed.primaryKeyword || !Array.isArray(parsed.outline) || parsed.outline.length === 0) {
      throw new ContentGenerationError("Gemini returned an incomplete brief");
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

    const text = await callGemini(prompt);
    const parsed = parseJson<GeneratedArticle>(text);

    if (!parsed.title || !parsed.bodyMarkdown) {
      throw new ContentGenerationError("Gemini returned an incomplete article");
    }

    return parsed;
  },
};
