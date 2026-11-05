// LLM_JSON: structured model calls with schema validation and ONE bounded retry.
// "Unexpected end of JSON input" came from reasoning models spending the whole token budget
// before writing the answer (empty content, finish_reason "length"). The retry doubles the
// budget and asks for compact JSON; a second failure raises LlmJsonError so callers can
// record a failed check instead of silently treating it as "no problems found".
import type OpenAI from "openai";

export interface LlmJsonAttempt {
  finishReason: string | null;
  chars: number;
  error: string;
}

export class LlmJsonError extends Error {
  readonly code = "LLM_JSON_FAILED" as const;
  constructor(readonly step: string, readonly attempts: LlmJsonAttempt[]) {
    super(`${step}: no valid JSON after ${attempts.length} attempt(s): ${attempts.map((a) => `${a.error} (finish=${a.finishReason}, chars=${a.chars})`).join("; ")}`);
    this.name = "LlmJsonError";
  }
}

export async function chatJson<T>(
  client: OpenAI,
  step: string,
  prompt: string,
  opts: { maxTokens?: number; validate?: (x: unknown) => boolean; model?: string } = {}
): Promise<T> {
  const attempts: LlmJsonAttempt[] = [];
  let max = opts.maxTokens ?? 6000;
  for (let i = 0; i < 2; i++) {
    const res = await client.chat.completions.create({
      model: opts.model ?? process.env.OPENAI_CONTENT_MODEL ?? "gpt-4o",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: i === 0 ? prompt : `${prompt}\n\nReturn ONLY one compact JSON object. No prose, no markdown.` }],
      max_completion_tokens: max,
    });
    const choice = res.choices[0] as { message?: { content?: string | null }; finish_reason?: string | null } | undefined;
    const content = (choice?.message?.content ?? "").trim();
    const finishReason = choice?.finish_reason ?? null;
    try {
      const parsed: unknown = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] ?? content);
      if (!opts.validate || opts.validate(parsed)) return parsed as T;
      attempts.push({ finishReason, chars: content.length, error: "schema mismatch" });
    } catch (e) {
      attempts.push({ finishReason, chars: content.length, error: e instanceof Error ? e.message : String(e) });
    }
    max = Math.min(max * 2, 16000);
  }
  throw new LlmJsonError(step, attempts);
}

export const hasArray = (key: string) => (x: unknown) => !!x && typeof x === "object" && Array.isArray((x as Record<string, unknown>)[key]);
