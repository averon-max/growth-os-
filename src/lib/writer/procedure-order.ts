// PROCEDURE_DEPENDENCY_GRAPH: the model only EXTRACTS the steps (what each step uses, obtains, requires
// and produces, with one shared vocabulary); the ORDER is validated by plain code, so a step can never
// use a tool before the step that fetches it, or need a state ("outside the vehicle", "nuts loosened")
// before the step that creates it. Runs on the procedure plan and on the final article.
import type OpenAI from "openai";
import { chatJson } from "./llm-json";
import { log } from "./logger";

export interface StepNode {
  n: number;
  section: string;
  action: string;
  uses: string[];
  obtains: string[];
  requires: string[];
  produces: string[];
}

export type OrderViolationKind = "USED_BEFORE_OBTAINED" | "REQUIRED_BEFORE_PRODUCED" | "DUPLICATE_STEP";

export interface OrderViolation {
  kind: OrderViolationKind;
  step: number;
  section: string;
  item: string;
  otherStep: number;
  message: string;
}

const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\b(the|a|an|your)\b/g, " ").replace(/\s+/g, " ").trim().replace(/s$/, "");

/** Deterministic order check over the extracted steps. */
export function validateStepOrder(steps: StepNode[]): OrderViolation[] {
  const sorted = [...steps].sort((a, b) => a.n - b.n);
  const obtainedAt = new Map<string, number>();
  const producedAt = new Map<string, number[]>();
  for (const s of sorted) {
    for (const o of s.obtains) if (!obtainedAt.has(norm(o))) obtainedAt.set(norm(o), s.n);
    for (const p of s.produces) producedAt.set(norm(p), [...(producedAt.get(norm(p)) ?? []), s.n]);
  }
  const out: OrderViolation[] = [];
  for (const s of sorted) {
    for (const u of s.uses) {
      const at = obtainedAt.get(norm(u));
      // an item no step fetches is assumed to be at hand; one that IS fetched is unavailable before that step
      if (at !== undefined && at > s.n && !s.obtains.some((o) => norm(o) === norm(u))) {
        out.push({ kind: "USED_BEFORE_OBTAINED", step: s.n, section: s.section, item: u, otherStep: at, message: `Step ${s.n} ("${s.action}") uses "${u}", which is only obtained in step ${at}` });
      }
    }
    for (const r of s.requires) {
      const at = producedAt.get(norm(r));
      if (at && at.every((x) => x > s.n) && !s.produces.some((p) => norm(p) === norm(r))) {
        out.push({ kind: "REQUIRED_BEFORE_PRODUCED", step: s.n, section: s.section, item: r, otherStep: at[0], message: `Step ${s.n} ("${s.action}") needs "${r}", which only step ${at[0]} makes true` });
      }
    }
  }
  for (const [state, at] of Array.from(producedAt.entries())) {
    if (at.length > 1) out.push({ kind: "DUPLICATE_STEP", step: at[1], section: sorted.find((s) => s.n === at[1])?.section ?? "", item: state, otherStep: at[0], message: `"${state}" is done twice (steps ${at[0]} and ${at[1]})` });
  }
  return out;
}

export async function extractSteps(client: OpenAI, keyword: string, text: string, kind: "plan" | "article"): Promise<StepNode[]> {
  const prompt = `Extract the procedure for "${keyword}" exactly as the TEXT presents it. Do not judge or correct it.
${kind === "article" ? "If the text gives a numbered summary (a table or list) AND detailed sections, follow the numbered summary's order and give for each step the ## section heading that explains it; otherwise follow the order of the sections." : "Follow the numbered steps of the plan; section is \"plan\"."}
Return JSON {"items":["<short canonical name of every tool, material or object a step uses>"],"states":["<short canonical name of every condition a step creates or needs, e.g. outside the vehicle, lug nuts loosened, vehicle raised, vehicle fully lowered>"],"steps":[{"n":1,"section":"<## heading or plan>","action":"<6-12 words>","uses":["<items>"],"obtains":["<items this step takes out, gathers, buys or prepares>"],"requires":["<states that must already be true for this step>"],"produces":["<states this step makes true>"]}]}
Rules: use ONLY names from your own items and states lists, spelled identically every time. Items are tools, equipment, materials and documents the reader handles; the object being worked on and its own parts (for example a car's wheel and its nuts, or a laptop's battery) are NOT items: never put them in "uses" or "obtains" (removing a part is an action that produces a state, e.g. "lug nuts removed"). List an item in "obtains" only for a step that explicitly takes it out of storage or gets it; a tools list before the steps is not a step. Record what each step really needs: placing something next to a wheel needs "outside the vehicle"; tightening to a torque value needs "torque wrench". SAFE_STATE: a step where the person leaves the controls, gets out, opens a compartment (trunk, hood, panel), fetches tools or handles parts requires the object to be made safe first: put one shared state for it (for example "vehicle secured" = engine off, parking brake on, in Park) in that step's "requires", and in "produces" of the step that does it.

TEXT:
${text.replace(/\]\((https?:\/\/[^)\s]+)\)/g, "]").slice(0, 16000)}`;
  const parsed = await chatJson<{ steps: unknown[] }>(client, `PROCEDURE_ORDER_${kind.toUpperCase()}`, prompt, { maxTokens: 8000, validate: (x) => Array.isArray((x as { steps?: unknown }).steps) });
  const arr = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : []);
  return parsed.steps.map((s, i) => {
    const o = (s ?? {}) as Record<string, unknown>;
    return { n: Number(o.n) || i + 1, section: String(o.section ?? ""), action: String(o.action ?? ""), uses: arr(o.uses), obtains: arr(o.obtains), requires: arr(o.requires), produces: arr(o.produces) };
  });
}

export async function checkProcedureOrder(client: OpenAI, keyword: string, text: string, kind: "plan" | "article"): Promise<{ steps: StepNode[]; violations: OrderViolation[] }> {
  const steps = await extractSteps(client, keyword, text, kind);
  const violations = validateStepOrder(steps);
  log(kind === "plan" ? "article-writer" : "orchestrator", "PROCEDURE_ORDER", { kind, steps: steps.length, violations });
  return { steps, violations };
}
