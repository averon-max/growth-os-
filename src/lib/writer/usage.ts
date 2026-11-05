// TOKEN_LEDGER: every model call of a run is counted by step (input, cached input, output, reasoning), so the
// cost of an article is visible and can be capped. Nothing here changes what the model writes, except that
// purely mechanical JSON steps run with low reasoning effort on reasoning models (WRITER_CHEAP_EFFORT=off disables).
import { log } from "./logger";

type Totals = { calls: number; input: number; cached: number; output: number; reasoning: number };
const byStep = new Map<string, Totals>();
// PROMPT_CACHE_KEY: requests that share a long prefix are routed to the same cache when they carry the same key;
// without it only the system prompt was cached in the first real v9 run (18k of 216k input tokens)
let cacheKey: string | null = null;
let cacheKeyRejected = false;
export function setCacheKey(key: string | null): void { cacheKey = key ? key.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60) : null; }

/** Which pipeline step a prompt belongs to (from its fixed opening words). */
export function stepOf(prompt: string): string {
  const p = prompt.trimStart();
  const starts: [string, string][] = [
    ["You are a strict senior editor scoring", "critic"],
    ["You are a strict fact checker for a published article section", "section_factcheck"],
    ["You are a safety and feasibility reviewer", "feasibility"],
    ["You are verifying the evidence", "evidence"],
    ["Re-verify specific claims", "evidence_verify"],
    ["You are revising", "repair"],
    ["You are an editor. Rewrite", "repetition_repair"],
    ["Create H1 and meta", "h1_meta"],
    ["Extract the substantive points", "consensus"],
    ["Create ONE consistent procedure plan", "plan"],
    ["You are a fact checker. Check this procedure plan", "plan_validate"],
    ["Step audit for", "plan_audit"],
    ["Fix the ORDER of this procedure plan", "plan_order_fix"],
    ["Extract the procedure for", "order_extract"],
    ["Choose the FAQ questions", "faq_select"],
    ["ARTICLE HEADINGS:", "faq_dedupe"],
    ["Topic: ", "authority"],
  ];
  for (const [s, step] of starts) if (p.startsWith(s)) return step;
  if (p.includes("TASK 1 — FORMAT")) return "topics";
  if (p.includes('You are writing the "')) return "section";
  return "other";
}

/** Steps that only extract or classify (JSON); low reasoning effort does not change what is written. */
const CHEAP_STEPS = new Set(["consensus", "order_extract", "faq_select", "faq_dedupe", "authority"]);
const isReasoningModel = (m: string) => /^(o\d|gpt-5)/i.test(m);

type Usage = { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number }; completion_tokens_details?: { reasoning_tokens?: number } } | null | undefined;

export function recordUsage(step: string, usage: Usage): void {
  if (!usage) return;
  const t = byStep.get(step) ?? { calls: 0, input: 0, cached: 0, output: 0, reasoning: 0 };
  t.calls++;
  t.input += usage.prompt_tokens ?? 0;
  t.cached += usage.prompt_tokens_details?.cached_tokens ?? 0;
  t.output += usage.completion_tokens ?? 0;
  t.reasoning += usage.completion_tokens_details?.reasoning_tokens ?? 0;
  byStep.set(step, t);
}

export function resetUsage(): void { byStep.clear(); }
const CACHED_STEPS = new Set(["section", "section_factcheck", "critic", "repair", "feasibility", "evidence", "evidence_verify"]);

export function usageTotals(): Totals {
  const all: Totals = { calls: 0, input: 0, cached: 0, output: 0, reasoning: 0 };
  for (const t of Array.from(byStep.values())) { all.calls += t.calls; all.input += t.input; all.cached += t.cached; all.output += t.output; all.reasoning += t.reasoning; }
  return all;
}

/** WRITER_TOKEN_BUDGET (input + output tokens per article): optional extra work stops once it is spent. */
export function overBudget(): boolean {
  const b = Number(process.env.WRITER_TOKEN_BUDGET ?? 0);
  if (!(b > 0)) return false;
  const t = usageTotals();
  return t.input + t.output >= b;
}

export function usageReport(): Record<string, unknown> {
  const steps = Array.from(byStep.entries()).sort((a, b) => (b[1].input + b[1].output) - (a[1].input + a[1].output)).map(([step, t]) => ({ step, ...t }));
  const total = usageTotals();
  return { total, cachedShare: total.input ? Math.round((total.cached / total.input) * 100) / 100 : 0, steps, budget: Number(process.env.WRITER_TOKEN_BUDGET ?? 0) || null };
}

/** One human line for the terminal and the summary. */
export function usageLine(): string {
  const t = usageTotals();
  const k = (n: number) => `${Math.round(n / 100) / 10}k`;
  const top = Array.from(byStep.entries()).sort((a, b) => (b[1].input + b[1].output) - (a[1].input + a[1].output)).slice(0, 5).map(([s, x]) => `${s} ${k(x.input + x.output)}`).join(", ");
  return `TOKENS ${t.calls} calls: input ${k(t.input)} (cached ${k(t.cached)}), output ${k(t.output)} (reasoning ${k(t.reasoning)}); biggest: ${top}`;
}

type CreateFn = (body: Record<string, unknown>, opts?: unknown) => Promise<{ usage?: Usage }>;
/** Counts every call of this client; mechanical steps get low reasoning effort on reasoning models. */
export function tracked<T extends { chat: { completions: { create: unknown } } }>(client: T): T {
  const comp = client.chat.completions as unknown as { create: CreateFn };
  const orig = comp.create.bind(comp);
  comp.create = async (body, opts) => {
    const msgs = (body.messages as { content?: unknown }[] | undefined) ?? [];
    const step = stepOf(String(msgs[msgs.length - 1]?.content ?? ""));
    const effort = process.env.WRITER_CHEAP_EFFORT ?? "low";
    let b = CHEAP_STEPS.has(step) && effort !== "off" && isReasoningModel(String(body.model ?? "")) && body.reasoning_effort === undefined ? { ...body, reasoning_effort: effort } : body;
    const withKey = cacheKey && !cacheKeyRejected && process.env.WRITER_CACHE_KEY !== "off" && CACHED_STEPS.has(step) && b.prompt_cache_key === undefined;
    if (withKey) b = { ...b, prompt_cache_key: `growth-os-${step}-${cacheKey}` };
    let res: { usage?: Usage };
    try {
      res = await orig(b, opts);
    } catch (e) {
      // an endpoint that does not know the field: drop it for the rest of the run, never fail the article
      if (!withKey || !/prompt_cache_key|unrecognized|unknown parameter/i.test(String((e as Error)?.message ?? e))) throw e;
      cacheKeyRejected = true;
      const { prompt_cache_key: _drop, ...rest } = b;
      res = await orig(rest, opts);
    }
    recordUsage(step, res?.usage);
    return res;
  };
  return client;
}

export function logUsage(): void {
  log("orchestrator", "USAGE_REPORT", usageReport());
}
