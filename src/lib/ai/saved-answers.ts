/*
 * AI answers (OpenAI) are saved like DataForSEO answers: in ApiCache, category "ai", kept for the days set in
 * Settings → Data and deletable there. Every answer is saved; an answer is REUSED only when the caller asks for it
 * with the AI_REUSE header (research questions whose answer should not change: SERP topics, official sources,
 * keyword choice). Article writing never sends the header, so writing the same keyword again gives a new article.
 */

export const AI_REUSE_HEADER = "x-hyprlyx-ai-reuse";
/** Pass as the second argument of client.chat.completions.create(body, AI_REUSE). */
export const AI_REUSE = { headers: { [AI_REUSE_HEADER]: "1" } };

type Json = Record<string, unknown>;

// Dollars per 1M tokens [input, output]. Approximate list prices; OPENAI_PRICE_INPUT / OPENAI_PRICE_OUTPUT override.
const PRICES: [RegExp, number, number][] = [
  [/^gpt-4o-mini/, 0.15, 0.6],
  [/^gpt-4o/, 2.5, 10],
  [/^gpt-4\.1-nano/, 0.1, 0.4],
  [/^gpt-4\.1-mini/, 0.4, 1.6],
  [/^gpt-4\.1/, 2, 8],
  [/^gpt-5(\.\d+)?-nano/, 0.05, 0.4],
  [/^gpt-5(\.\d+)?-mini/, 0.25, 2],
  [/^o4-mini|^o3-mini/, 1.1, 4.4],
];

/** Approximate cost of one answer from its token usage (cached input billed at 10%). */
export function aiCost(model: string, usage: Json | undefined): number {
  if (!usage) return 0;
  const envIn = Number(process.env.OPENAI_PRICE_INPUT);
  const envOut = Number(process.env.OPENAI_PRICE_OUTPUT);
  const hit = PRICES.find(([re]) => re.test(model));
  const pin = Number.isFinite(envIn) && envIn > 0 ? envIn : (hit?.[1] ?? 1.25);
  const pout = Number.isFinite(envOut) && envOut > 0 ? envOut : (hit?.[2] ?? 10);
  const input = Number(usage.prompt_tokens ?? usage.input_tokens ?? 0) || 0;
  const output = Number(usage.completion_tokens ?? usage.output_tokens ?? 0) || 0;
  const details = (usage.prompt_tokens_details ?? usage.input_tokens_details ?? {}) as Json;
  const cached = Math.min(input, Number(details.cached_tokens ?? 0) || 0);
  return ((input - cached) * pin + cached * pin * 0.1 + output * pout) / 1_000_000;
}

/** Whether an answer is complete enough to save (no cut-off or empty answers, JSON answers must parse). */
export function usableAnswer(request: Json, answer: Json): boolean {
  if (answer.error) return false;
  if (Array.isArray(answer.choices)) {
    const choice = answer.choices[0] as Json | undefined;
    const message = (choice?.message ?? {}) as Json;
    if (!choice || choice.finish_reason === "length") return false;
    const content = typeof message.content === "string" ? message.content.trim() : "";
    if (content === "" && !Array.isArray(message.tool_calls)) return false;
    const format = (request.response_format ?? {}) as Json;
    if (content && (format.type === "json_object" || format.type === "json_schema")) {
      try { JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] ?? content); } catch { return false; }
    }
    return true;
  }
  if (answer.object === "response") return answer.status === "completed";
  return answer.object === "embedding" || answer.object === "list";
}

/** A saved answer handed back again: token counts are zeroed so the writer's token budget is not charged twice. */
export function asReused(answer: Json): Json {
  const usage = answer.usage as Json | undefined;
  if (!usage) return answer;
  const zero = (o: Json): Json =>
    Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === "number" ? 0 : v && typeof v === "object" ? zero(v as Json) : v]));
  return { ...answer, usage: zero(usage) };
}
