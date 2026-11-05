// EDITORIAL_SCORECARD: score the finished article on the 7-class editorial scorecard
// (SEO / Content / E-E-A-T / AEO / GEO / UX / Business), rewrite only the sections the
// critic names, re-score, and keep the rewrite only when it helps.
// v2 (ISSUE_CLOSURE): every issue has a severity; critical issues (from the critic, the procedure
// feasibility check or the evidence contract) go into a ledger and stay OPEN until a later check
// confirms them fixed in the current text. A high average never closes a critical issue.
// Guards: no new URLs outside the verified pool, links and subheadings kept, length within bounds,
// and no new cross-section repetition.
import type OpenAI from "openai";
import { log } from "./logger";
import { overBudget, usageTotals } from "./usage";
import { cleanSectionText, normUrl } from "./article-writer";
import type { GeneratedArticle, SourceItem } from "./article-writer";
import { chatJson, LlmJsonError } from "./llm-json";

export const SCORE_DIMENSIONS = ["seo", "content", "eeat", "aeo", "geo", "ux", "business"] as const;
export type ScoreDimension = (typeof SCORE_DIMENSIONS)[number];
export type Severity = "critical" | "major" | "minor";
const SEVERITY_RANK: Record<Severity, number> = { critical: 0, major: 1, minor: 2 };
// SCORE_CAPS: a dimension with an open critical issue cannot score above 6, with a major issue above 8
const SEVERITY_CAP: Record<Severity, number> = { critical: 6, major: 8, minor: 10 };

export interface ScorecardIssue {
  section: string;
  dimension: ScoreDimension;
  problem: string;
  fix: string;
  severity: Severity;
  source?: "scorecard" | "feasibility" | "evidence" | "order" | "tools" | "format";
  /** stable identity of the defect across rounds (e.g. "evidence:C3"); scorecard issues are matched by meaning */
  key?: string;
  /** other ## sections that must change in the same edit (e.g. the equipment list for a step that needs a tool) */
  alsoEdit?: string[];
}

export interface LedgerEntry extends ScorecardIssue {
  id: string;
  status: "open" | "closed";
  foundInRound: number | "final";
  closedBy?: string;
  reports: number; // how many checks reported this defect (re-reports update the entry instead of adding K-numbers)
}

export interface Scorecard {
  scores: Record<ScoreDimension, number>;
  overall: number;
  issues: ScorecardIssue[];
  closure: Record<string, { closed: boolean; reason: string }>;
}

const normH = (x: string) => x.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const wc = (x: string) => x.split(/\s+/).filter(Boolean).length;
const linksOf = (x: string) => Array.from(x.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)).map((m) => m[1]);
const h3sOf = (x: string) => Array.from(x.matchAll(/^###\s+(.+)$/gm)).map((m) => m[1].trim());

/** Maps a heading the model wrote to the exact article heading (or undefined). */
export function matchHeading(raw: string, headings: string[]): string | undefined {
  const n = normH(String(raw ?? "").replace(/^#+\s*/, ""));
  return headings.find((h) => normH(h) === n) ?? headings.find((h) => n.length > 3 && (normH(h).includes(n) || n.includes(normH(h))));
}

export function parseSeverity(x: unknown): Severity {
  const s = String(x ?? "").toLowerCase();
  return s === "critical" ? "critical" : s === "minor" ? "minor" : "major";
}

const ISSUE_STOP = new Set("the and that this with from into have has does should would could must when then than also only section article reader text instruction instructions current says said".split(" "));
const issueWords = (x: string) => new Set(x.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length > 3 && !ISSUE_STOP.has(w)).map((w) => w.slice(0, 6)));
export function issueSimilarity(a: string, b: string): number {
  const A = issueWords(a), B = issueWords(b);
  if (!A.size || !B.size) return 0;
  let n = 0; A.forEach((w) => { if (B.has(w)) n++; });
  return n / (A.size + B.size - n);
}

/** EDITORIAL_ISSUE_IDENTITY_V1: one open ledger entry per defect. A re-report (same key, or same meaning in the
 * same section group) updates the existing entry and keeps its id instead of creating K3, K4... */
export function mergeIssue(ledger: LedgerEntry[], issue: ScorecardIssue, round: number | "final", nextId: () => string): LedgerEntry {
  const sectionsOf = (i: ScorecardIssue) => new Set([i.section, ...(i.alsoEdit ?? [])]);
  const mine = sectionsOf(issue);
  // a keyed defect that was closed earlier but is reported again is REOPENED under its old id
  const reopened = issue.key ? ledger.find((e) => e.status === "closed" && e.key === issue.key) : undefined;
  if (reopened && !ledger.some((e) => e.status === "open" && e.key === issue.key)) {
    Object.assign(reopened, { status: "open", closedBy: undefined, problem: issue.problem, fix: issue.fix });
    reopened.reports++;
    return reopened;
  }
  // two different keyed defects stay separate, also across checkers (each has its own closure test)
  const distinctKeys = (e: LedgerEntry) => !!issue.key && !!e.key && e.key !== issue.key;
  const same = ledger.find((e) => e.status === "open" && !distinctKeys(e) && (
    (issue.key && e.key === issue.key) ||
    (Array.from(sectionsOf(e)).some((x) => mine.has(x)) && issueSimilarity(`${e.problem} ${e.fix}`, `${issue.problem} ${issue.fix}`) >= 0.2) ||
    issueSimilarity(e.problem, issue.problem) >= 0.45
  ));
  if (same) {
    // a keyed checker report adopts the critic's matching entry: the stricter, code-verified check decides closure
    if (issue.key && !same.key) { same.key = issue.key; same.source = issue.source; }
    same.problem = issue.problem;
    same.fix = issue.fix;
    same.alsoEdit = Array.from(new Set([...(same.alsoEdit ?? []), ...(issue.alsoEdit ?? []), ...(issue.section !== same.section ? [issue.section] : [])])).filter((h) => h !== same.section).slice(0, 2);
    same.reports++;
    return same;
  }
  const entry: LedgerEntry = { ...issue, id: nextId(), status: "open", foundInRound: round, reports: 1 };
  ledger.push(entry);
  return entry;
}

/** Parses and validates the critic's JSON. Overall is computed here (after caps), never taken from the model. */
export function parseScorecard(raw: string, headings: string[]): Scorecard | null {
  let parsed: { scores?: Record<string, unknown>; issues?: unknown[]; closure?: unknown[] };
  try {
    parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
  } catch {
    return null;
  }
  const scores = {} as Record<ScoreDimension, number>;
  for (const d of SCORE_DIMENSIONS) {
    const v = Number(parsed.scores?.[d]);
    if (!Number.isFinite(v)) return null;
    scores[d] = Math.max(0, Math.min(10, Math.round(v * 10) / 10));
  }
  const issues: ScorecardIssue[] = [];
  for (const it of Array.isArray(parsed.issues) ? parsed.issues : []) {
    const o = (it ?? {}) as Record<string, unknown>;
    const dim = String(o.dimension ?? "").toLowerCase().replace(/[^a-z]/g, "") as ScoreDimension;
    const heading = matchHeading(String(o.section ?? ""), headings);
    const problem = String(o.problem ?? "").trim();
    const fix = String(o.fix ?? "").trim();
    if (!heading || !SCORE_DIMENSIONS.includes(dim) || !problem || !fix) continue;
    const alsoEdit = (Array.isArray(o.alsoEdit) ? o.alsoEdit : []).map((h) => matchHeading(String(h), headings)).filter((h): h is string => !!h && h !== heading).slice(0, 2);
    issues.push({ section: heading, dimension: dim, problem, fix, severity: parseSeverity(o.severity), source: "scorecard", ...(alsoEdit.length ? { alsoEdit } : {}) });
  }
  issues.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
  for (const i of issues) scores[i.dimension] = Math.min(scores[i.dimension], SEVERITY_CAP[i.severity]);
  const overall = Math.round((SCORE_DIMENSIONS.reduce((n, d) => n + scores[d], 0) / SCORE_DIMENSIONS.length) * 10) / 10;
  const closure: Scorecard["closure"] = {};
  for (const c of Array.isArray(parsed.closure) ? parsed.closure : []) {
    const o = (c ?? {}) as Record<string, unknown>;
    if (typeof o.id === "string") closure[o.id] = { closed: o.closed === true, reason: String(o.reason ?? "") };
  }
  return { scores, overall, issues: issues.slice(0, 8), closure };
}

export interface ScorecardContext {
  client: OpenAI;
  keyword: string;
  h1: string;
  meta: string;
  sections: GeneratedArticle["sections"]; // mutated in place when a repair is kept
  research: string;
  questions: string[];
  sources: SourceItem[];
  allowedUrls: Set<string>; // normalized with normUrl
  serpAvgWords: number;
  toMarkdown: () => string;
  repetitionCount: () => number;
  /** phrases the repetition guard reports, fed back into a retried rewrite */
  repetitionPhrases?: () => string[];
  rounds?: number;
  target?: number;
  /** Specialised checks run in parallel with the first score (procedure feasibility, evidence contract). */
  preChecks?: () => Promise<ScorecardIssue[]>;
  /** Re-run on the final text to confirm specialised critical issues are really closed. */
  finalCheck?: () => Promise<ScorecardIssue[]>;
  /** Plain-code checks (no model) re-run after every round: the only judge of their own issues (sources "tools" and "format"). */
  codeCheck?: () => ScorecardIssue[];
  /** FORMAT_CONTRACT of the article's template, shown to the critic and to every repair */
  format?: string;
}

/** issues whose closure only a plain-code check decides */
const CODE_SOURCES = new Set(["tools", "format"]);

const model = () => process.env.OPENAI_CONTENT_MODEL ?? "gpt-4o";
// CITATION_BUDGET: a URL may appear at most twice in the article (the orchestrator caps it afterwards),
// so sources that are already used twice are shown as unavailable instead of being offered again
const sourcesBlock = (ctx: ScorecardContext) => {
  const uses: Record<string, number> = {};
  for (const s of ctx.sections) for (const u of linksOf(s.content)) uses[normUrl(u)] = (uses[normUrl(u)] ?? 0) + 1;
  return ctx.sources.map((s) => {
    const n = uses[normUrl(s.url)] ?? 0;
    return `- (${s.kind}${n >= 2 ? ", already cited twice: do not cite again" : n === 0 ? ", not cited yet" : ""}) ${s.title} — ${s.url}`;
  }).join("\n");
};

async function scoreArticle(ctx: ScorecardContext, openCritical: LedgerEntry[]): Promise<Scorecard | null> {
  const md = ctx.toMarkdown();
  const headings = ctx.sections.filter((s) => s.level === 2).map((s) => s.heading);
  const prompt = `You are a strict senior editor scoring an article that targets the Google query "${ctx.keyword}" (US audience). Score each dimension 0-10. 10 = nothing meaningful left to improve; 9 = only minor polish; 7 = clear gaps a competitor page does better.

DIMENSIONS
- seo: matches the search intent; the keyword and close variants appear naturally in the H1, the opening sentence and some headings; headings are descriptive; title and meta are accurate and specific.
- content: complete against the RESEARCH points that matter to the searcher; accurate; specific (named tools, conditions, values from sources); at least one insight the ranking pages miss; every instruction can actually be carried out with what the article tells the reader to have; no padding or repetition.
- eeat: key factual, safety, legal or money claims are linked to relevant, authoritative sources (official bodies preferred); region-specific rules are labeled with their country; appropriately cautious; no unsupported absolute claims; no first person.
- aeo: every section opens with a direct answer; each question subheading is answered in its first 1-2 sentences; the FAQ answers real user questions directly.
- geo: key sentences are self-contained and quotable (subject + claim + condition in one sentence); consistent terminology; at least one reusable table or checklist; numbers keep their conditions.
- ux: logical order for the task; scannable; length fits the intent (the ranking pages average ${ctx.serpAvgWords} words; the article length is given above the ARTICLE): no micro-sections of one or two sentences, no walls of text; no meta phrases such as "as noted above".
- business: the reader can act on it: clear next step, when to get professional help or which option to choose; trustworthy tone; no hype.

SEVERITY of each issue
- critical: could lead a reader into an unsafe, illegal, costly or impossible action; a factual error; an instruction that cannot be completed as written (a required tool or check with no executable path); two places that contradict each other.
- major: a clear gap that a competitor page handles better.
- minor: polish.

Return JSON: {"scores":{"seo":n,"content":n,"eeat":n,"aeo":n,"geo":n,"ux":n,"business":n},"issues":[{"section":"<exact ## heading>","alsoEdit":["<other exact ## headings that must change in the same edit, or none>"],"dimension":"<dimension key>","severity":"critical|major|minor","problem":"<what is weak, quoting a few words>","fix":"<the concrete edit, covering every section in alsoEdit>"}],"closure":[{"id":"<id>","closed":true|false,"reason":"<quote the current text that fixes it, or say what is still wrong>"}]} ("closure" is [] when no OPEN CRITICAL ISSUES are listed)
ISSUE RULES: at most 6 issues, critical first. Every issue must be fixable by rewriting ONE ## section using only facts already in the article, the RESEARCH or the SOURCES. Never ask for new statistics, quotes, studies, images, author bios, schema, dates or links that are not in SOURCES. Citations are inline links by design: never ask for a separate sources or references section, and never ask for a new section. Keep the FAQ as ### question headings with prose answers (answer engines need them): never suggest turning it into a table or bullets. Do not re-raise a point the current text already handles. One defect = one issue: when a fix needs two sections to change together (a step needs a tool that the equipment list must include), list the main section in "section" and the other in "alsoEdit". The PROCEDURE PLAN inside RESEARCH is internal planning: never require its exact columns or wording. PEOPLE ALSO ASK lists candidate questions, not requirements: never require a question about a different task or topic than the query (for example a tire-size or tread rule in a tire-change guide). If a problem is the same defect as one of the OPEN CRITICAL ISSUES below, do NOT list it again in "issues": report it only in "closure" (and say what is still wrong).
${ctx.format ? `\nFORMAT CONTRACT (judge format fit under ux and aeo: a missing core element of this format is a major issue; a claim of hands-on testing, lab results, personal use or an invented case that the SOURCES do not show is critical):\n${ctx.format}\n` : ""}
RESEARCH (what ranking pages cover and what searchers ask):
${ctx.research.slice(0, 9000)}
${ctx.questions.length ? `\nPEOPLE ALSO ASK: ${ctx.questions.join(" | ")}` : ""}

SOURCES (the only citable URLs):
${sourcesBlock(ctx)}
${openCritical.length ? `\nOPEN CRITICAL ISSUES FROM EARLIER CHECKS: verify each one against the CURRENT article and report it in "closure" (closed only if the current text fully fixes it):\n${openCritical.map((e) => `[${e.id}] (section: ${e.section}) ${e.problem}`).join("\n")}\n` : ""}
ARTICLE LENGTH: ${wc(md)} words

ARTICLE
# ${ctx.h1}
Meta description: ${ctx.meta}

${md}`;
  try {
    const parsed = await chatJson<unknown>(ctx.client, "EDITORIAL_SCORECARD", prompt, { maxTokens: 8000, validate: (x) => parseScorecard(JSON.stringify(x), headings) !== null });
    return parseScorecard(JSON.stringify(parsed), headings);
  } catch (e) {
    log("orchestrator", "EDITORIAL_SCORECARD_FAILED", { error: String(e), attempts: e instanceof LlmJsonError ? e.attempts : undefined });
    return null;
  }
}

export interface RepairCheckOptions {
  minRatio?: number;
  maxRatio?: number;
  keptElsewhere?: Set<string>; // normalized URLs still cited in other sections
}

/** Returns the reasons a rewritten section is rejected (empty array = accepted). */
export function checkRepair(original: string, out: string, allowedUrls: Set<string>, headingsMayChange: boolean, opts: RepairCheckOptions = {}): string[] {
  const reasons: string[] = [];
  if (!out.trim()) return ["empty"];
  const origLinks = new Set(linksOf(original).map(normUrl));
  const outLinks = linksOf(out).map(normUrl);
  if (Array.from(origLinks).some((u) => !outLinks.includes(u) && !opts.keptElsewhere?.has(u))) reasons.push("dropped a link");
  if (outLinks.some((u) => !allowedUrls.has(u))) reasons.push("link outside the verified pool");
  const h3a = h3sOf(original), h3b = h3sOf(out);
  if (headingsMayChange ? Math.abs(h3a.length - h3b.length) > 1 : h3a.some((h) => !h3b.includes(h)) || h3b.length > h3a.length + 1) reasons.push("subheadings changed");
  if (/^\|/m.test(original) && !/^\|/m.test(out)) reasons.push("dropped the table");
  const ratio = wc(out) / Math.max(1, wc(original));
  if (ratio < (opts.minRatio ?? 0.7) || ratio > (opts.maxRatio ?? 1.35)) reasons.push(`length ratio ${ratio.toFixed(2)}`);
  if (/^##\s/m.test(out)) reasons.push("contains an H2");
  return reasons;
}

const REPAIR_RULES = (ctx: ScorecardContext, others: string[], headingsMayChange: boolean, shrinkAllowed: boolean) => `RULES
- Change only what the issues require; keep every other fact, number, table and example.
- ${headingsMayChange ? "You may rename or merge at most one ### subheading per section if an issue asks for it; keep all others." : "Keep every ### subheading exactly as written, in the same order."}
- Keep every existing markdown link with its exact URL${shrinkAllowed ? " (a link may go only together with a sentence an issue asks you to remove)" : ""}. You may add a link ONLY with a URL copied exactly from SOURCES, placed on a claim that source supports. Never write the label "Source:".
- Use only facts from these SECTIONS, the RESEARCH or the SOURCES. Never invent numbers, prices, studies, quotes or personal experience. Never write in first person.
- Every instruction must be doable with what the article tells the reader to have; when a tool may be missing, give the conservative fallback the sources support, and never a fallback that depends on the thing it replaces. A "confirm X first" needs an instruction for when X cannot be confirmed (stop and get help).
- Open with the direct answer. No meta references to other sections. Do not cover topics owned by these sections: ${others.join(" | ")}.
- Each instruction appears in exactly ONE section: never copy a sentence, or a phrase of five or more words, from another section of the article.
- Keep each section's length within ${shrinkAllowed ? "50% shorter to 25% longer than" : "25% of"} its original. No ## headings, no commentary, no code fences.`;

const issueFlags = (issues: ScorecardIssue[]) => {
  const all = issues.map((i) => `${i.problem} ${i.fix}`).join(" ");
  return {
    headingsMayChange: /subhead|heading|rename|split|merge/i.test(all),
    shrinkAllowed: /shorten|condense|remove|delete|\bcut\b|compact|trim|merge|tighten the|redundan|repeat/i.test(all),
    // a format fix that adds a table, a checklist or numbered steps legitimately makes the section longer
    growAllowed: /\badd (?:a|the)\b[^.]{0,40}\b(?:table|checklist|list|steps|decision rules)\b|\bput the complete checklist\b|\bas a (?:bulleted|numbered) list\b/i.test(all),
  };
};

/** Rewrites one or several sections in ONE call so that dependent parts (equipment list + the step that needs it) change together. */
async function repairGroup(ctx: ScorecardContext, secs: GeneratedArticle["sections"], issues: ScorecardIssue[], avoid: string[] = []): Promise<{ texts: string[]; reasons: string[] }> {
  const others = ctx.sections.filter((s) => s.level === 2 && !secs.includes(s)).map((s) => s.heading);
  const { headingsMayChange, shrinkAllowed, growAllowed } = issueFlags(issues);
  const keptElsewhere = new Set(ctx.sections.filter((s) => !secs.includes(s)).flatMap((s) => linksOf(s.content).map(normUrl)));
  const joint = secs.length > 1;
  const prompt = `You are revising ${joint ? `${secs.length} sections` : "ONE section"} of an article about "${ctx.keyword}" (US audience) to fix specific editorial issues. Fix every CRITICAL issue completely; a critical issue that is only softened stays open.${joint ? " The sections depend on each other: make them consistent (a tool a step needs is in the equipment list; optional vs required is stated the same way in every section)." : ""}

ISSUES TO FIX
${issues.map((i) => `- [${i.severity.toUpperCase()} / ${i.dimension}${i.alsoEdit?.length ? ` / sections: ${[i.section, ...i.alsoEdit].join(" + ")}` : joint ? ` / section: ${i.section}` : ""}] ${i.problem} -> ${i.fix}`).join("\n")}

${REPAIR_RULES(ctx, others, headingsMayChange, shrinkAllowed)}${growAllowed ? "\n- An issue asks you to ADD a table, list or decision rules: the section may grow up to 80% for it; never pad anything else." : ""}${ctx.format ? `\n- Keep the article format: ${ctx.format}` : ""}
${avoid.length ? `- Your previous rewrite repeated wording that other sections already use. Do NOT use these phrases or close paraphrases of them: ${avoid.map((p) => `"${p}"`).join("; ")}\n` : ""}
SOURCES
${sourcesBlock(ctx)}

RESEARCH
${ctx.research.slice(0, 7000)}

${joint ? `Output every section in this exact format, in this order, and nothing else:\n${secs.map((s) => `=== ${s.heading} ===\n<section body>`).join("\n")}\n\nSECTIONS:\n${secs.map((s) => `=== ${s.heading} ===\n${s.content}`).join("\n\n")}` : `Output ONLY the section body in markdown.\n\nSECTION HEADING: ${secs[0].heading}\nSECTION BODY:\n${secs[0].content}`}`;
  try {
    const res = await ctx.client.chat.completions.create({ model: model(), messages: [{ role: "user", content: prompt }], max_completion_tokens: joint ? 10000 : 6000 });
    const raw = (res.choices[0]?.message?.content ?? "").trim().replace(/^```(?:markdown|md)?\s*/i, "").replace(/```\s*$/, "").trim();
    let bodies: string[];
    if (joint) {
      const parts = raw.split(/^===\s*(.+?)\s*===\s*$/m);
      const map = new Map<string, string>();
      for (let i = 1; i + 1 < parts.length; i += 2) map.set(normH(parts[i]), parts[i + 1].trim());
      bodies = secs.map((s) => map.get(normH(s.heading)) ?? "");
    } else {
      bodies = [raw];
    }
    const texts = bodies.map((b, i) => {
      const lead = b.match(/^#{1,2}\s+(.+)\n+/);
      const t = lead && normH(lead[1]) === normH(secs[i].heading) ? b.slice(lead[0].length).trim() : b;
      return cleanSectionText(t);
    });
    // all-or-nothing: a joint fix applied to only one section would recreate the inconsistency
    const reasons = texts.flatMap((t, i) => checkRepair(secs[i].content, t, ctx.allowedUrls, headingsMayChange, { minRatio: shrinkAllowed ? 0.5 : 0.7, maxRatio: growAllowed ? 1.8 : issues.some((i) => i.severity === "critical") ? 1.6 : 1.35, keptElsewhere: shrinkAllowed ? keptElsewhere : undefined }).map((r) => (joint ? `${secs[i].heading}: ${r}` : r)));
    return { texts, reasons };
  } catch (e) {
    return { texts: [], reasons: [`error: ${String(e)}`] };
  }
}

export interface ScorecardRun {
  initial: Scorecard | null;
  final: Scorecard | null;
  repaired: string[];
  ledger: LedgerEntry[];
  openCritical: LedgerEntry[];
  /** non-blocking gaps the plain-code checks still see in the final text (missing format elements) */
  codeGaps: ScorecardIssue[];
}

/** Groups issues into repair units: sections that must change together share one unit (max 3 sections per unit). */
export function groupRepairs(toFix: ScorecardIssue[], maxUnits = 3): { sections: string[]; issues: ScorecardIssue[] }[] {
  const units: { sections: string[]; issues: ScorecardIssue[] }[] = [];
  for (const i of toFix) {
    if (/^sources$/i.test(i.section)) continue;
    const wanted = [i.section, ...(i.alsoEdit ?? [])];
    const hit = units.find((u) => wanted.some((w) => u.sections.includes(w)));
    if (hit) {
      for (const w of wanted) if (!hit.sections.includes(w) && hit.sections.length < 3) hit.sections.push(w);
      hit.issues.push(i);
      continue;
    }
    // units with a critical issue are always repaired; others fill up to maxUnits per round (hard cap 5)
    if ((i.severity !== "critical" && units.length >= maxUnits) || units.length >= 5) continue;
    units.push({ sections: wanted.slice(0, 3), issues: [i] });
  }
  return units;
}

export async function runEditorialScorecard(ctx: ScorecardContext): Promise<ScorecardRun> {
  const rounds = ctx.rounds ?? 2;
  const target = ctx.target ?? 9.5;
  const ledger: LedgerEntry[] = [];
  let seq = 0;
  const nextId = () => `K${++seq}`;
  const openEntries = () => ledger.filter((e) => e.status === "open");

  const [first, pre] = await Promise.all([scoreArticle(ctx, []), ctx.preChecks ? ctx.preChecks().catch(() => [] as ScorecardIssue[]) : Promise.resolve([] as ScorecardIssue[])]);
  let current = first;
  const initial = current;
  for (const i of pre) if (i.severity === "critical") mergeIssue(ledger, i, 0, nextId);
  const preNonCritical = pre.filter((i) => i.severity !== "critical");
  for (const i of current?.issues ?? []) if (i.severity === "critical") mergeIssue(ledger, i, 0, nextId);
  log("orchestrator", "EDITORIAL_SCORECARD", { round: 0, overall: current?.overall ?? null, scores: current?.scores ?? null, issues: current?.issues ?? [], preCheckIssues: pre, openCritical: openEntries() });

  const repaired: string[] = [];
  // NON_REGRESSION: the text and ledger as they were before any repair
  const original = ctx.sections.map((s) => ({ content: s.content, wordCount: s.wordCount }));
  const originalLedger = ledger.map((e) => ({ ...e }));
  const originalOpen = openEntries().length;
  let codeMajors: ScorecardIssue[] = []; // format gaps the code still sees after the last round
  for (let round = 1; round <= rounds; round++) {
    if (!current) break;
    const open = openEntries();
    const pendingCode = (round === 1 ? preNonCritical : codeMajors).filter((i) => CODE_SOURCES.has(i.source ?? ""));
    // a format gap the code still sees is repaired even when the critic's score already looks high
    if (!open.length && !pendingCode.length && (current.overall >= target || !current.issues.length)) break;
    // POLISH_ROUNDS: a round runs only for something blocking (open critical, format gap). Score-only polish gave about
    // +0.1 in the 15-template matrix, and in the first v10 runs both polish rounds were reverted (8.6 -> 8.4, 8.1 -> 7.6)
    // after paying for rewrites and a re-score (WRITER_POLISH=on keeps them)
    if (!open.length && !pendingCode.length && process.env.WRITER_POLISH !== "on") { log("orchestrator", "EDITORIAL_POLISH_SKIPPED", { round, overall: current.overall }); break; }
    if (round > 1 && overBudget()) { log("orchestrator", "TOKEN_BUDGET_STOP", { round, ...usageTotals() }); break; }
    const toFix: ScorecardIssue[] = [...open, ...(round === 1 ? preNonCritical : codeMajors), ...current.issues.filter((i) => i.severity !== "critical")]
      .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
    const units = groupRepairs(toFix);
    const snapshot = ctx.sections.map((s) => ({ content: s.content, wordCount: s.wordCount }));
    const ledgerSnapshot = ledger.map((e) => ({ ...e }));
    const repetitionBefore = ctx.repetitionCount();
    const repairedNow: string[] = [];
    type Unit = (typeof units)[number];
    type Attempt = { u: Unit; secs: GeneratedArticle["sections"]; texts: string[]; reasons: string[] };
    const secsOf = (u: Unit) => u.sections.map((h) => ctx.sections.find((s) => s.level === 2 && s.heading === h)).filter((s): s is GeneratedArticle["sections"][number] => !!s);
    // REPETITION_AWARE_REPAIR: rewrites are generated in parallel, then applied one unit at a time; a unit that
    // would add cross-section repetition is not applied but retried once with the repeated phrases to avoid
    const apply = (x: Attempt, attempt: number): string[] | null => {
      const base = { round, attempt, heading: x.secs.map((s) => s.heading).join(" + "), issues: x.u.issues.map((i) => `${i.severity}/${i.dimension}`), wordsBefore: x.secs.map((s) => wc(s.content)), wordsAfter: x.texts.map(wc) };
      if (x.reasons.length) { log("orchestrator", "EDITORIAL_SCORECARD_REPAIR", { ...base, accepted: false, reasons: x.reasons }); return null; }
      const prev = x.secs.map((s) => ({ content: s.content, wordCount: s.wordCount }));
      x.secs.forEach((s, i) => { s.content = x.texts[i]; s.wordCount = wc(x.texts[i]); });
      if (ctx.repetitionCount() > repetitionBefore) {
        const phrases = (ctx.repetitionPhrases?.() ?? []).slice(0, 6);
        x.secs.forEach((s, i) => { s.content = prev[i].content; s.wordCount = prev[i].wordCount; });
        log("orchestrator", "EDITORIAL_SCORECARD_REPAIR", { ...base, accepted: false, reasons: ["creates cross-section repetition"], repeated: phrases });
        return phrases;
      }
      log("orchestrator", "EDITORIAL_SCORECARD_REPAIR", { ...base, accepted: true, reasons: [] });
      repairedNow.push(...x.secs.map((s) => s.heading));
      return null;
    };
    const first = (await Promise.all(units.map(async (u): Promise<Attempt | null> => {
      const secs = secsOf(u);
      return secs.length ? { u, secs, ...(await repairGroup(ctx, secs, u.issues)) } : null;
    }))).filter((x): x is Attempt => !!x);
    const retry: { u: Unit; secs: Attempt["secs"]; phrases: string[] }[] = [];
    for (const x of first) {
      const phrases = apply(x, 1);
      if (phrases) retry.push({ u: x.u, secs: x.secs, phrases });
    }
    const second = await Promise.all(retry.map(async (r): Promise<Attempt> => ({ u: r.u, secs: r.secs, ...(await repairGroup(ctx, r.secs, r.u.issues, r.phrases)) })));
    for (const x of second) apply(x, 2);
    const restore = () => {
      ctx.sections.forEach((s, i) => { s.content = snapshot[i].content; s.wordCount = snapshot[i].wordCount; });
      ledger.splice(0, ledger.length, ...ledgerSnapshot);
    };
    if (!repairedNow.length) break;
    // SELECTIVE_ROLLBACK: undo only the repair units that created the new repetition, keep the others
    if (ctx.repetitionCount() > repetitionBefore) {
      const undone: string[] = [];
      const idxOf = (u: (typeof units)[number]) => u.sections.map((h) => ctx.sections.findIndex((s) => s.level === 2 && s.heading === h)).filter((i) => i >= 0 && repairedNow.includes(ctx.sections[i].heading));
      const setTo = (idxs: number[], src: "snapshot" | Map<number, { content: string; wordCount: number }>) => idxs.forEach((i) => { const v = src === "snapshot" ? snapshot[i] : src.get(i)!; ctx.sections[i].content = v.content; ctx.sections[i].wordCount = v.wordCount; });
      while (ctx.repetitionCount() > repetitionBefore) {
        // try undoing each remaining unit alone; undo the one that removes the most repetition (ties: least severe)
        let best: { u: (typeof units)[number]; count: number; rank: number } | null = null;
        for (const u of units) {
          const idxs = idxOf(u);
          if (!idxs.length) continue;
          const current = new Map(idxs.map((i) => [i, { content: ctx.sections[i].content, wordCount: ctx.sections[i].wordCount }]));
          setTo(idxs, "snapshot");
          const count = ctx.repetitionCount();
          setTo(idxs, current);
          const rank = Math.min(...u.issues.map((i) => SEVERITY_RANK[i.severity]));
          if (!best || count < best.count || (count === best.count && rank > best.rank)) best = { u, count, rank };
        }
        if (!best) break;
        const idxs = idxOf(best.u);
        setTo(idxs, "snapshot");
        for (const h of idxs.map((i) => ctx.sections[i].heading)) { undone.push(h); repairedNow.splice(repairedNow.indexOf(h), 1); }
      }
      log("orchestrator", "EDITORIAL_SCORECARD_PARTIAL_ROLLBACK", { round, undone, kept: repairedNow, repetitionOk: ctx.repetitionCount() <= repetitionBefore });
      if (ctx.repetitionCount() > repetitionBefore || !repairedNow.length) {
        restore();
        log("orchestrator", "EDITORIAL_SCORECARD_REVERTED", { round, reason: "repairs introduced cross-section repetition" });
        break;
      }
    }
    const next = await scoreArticle(ctx, open);
    if (!next) {
      restore();
      log("orchestrator", "EDITORIAL_SCORECARD_REVERTED", { round, reason: "re-score failed" });
      break;
    }
    let closedNow = 0;
    for (const e of open) {
      if (CODE_SOURCES.has(e.source ?? "")) continue; // a code-checked issue is closed only by its own check (below)
      const c = next.closure[e.id];
      if (c?.closed) { e.status = "closed"; e.closedBy = `round ${round} re-check: ${c.reason}`.slice(0, 300); closedNow++; }
    }
    const before = ledger.length;
    const codeMajorsBefore = codeMajors;
    let codeFixed = 0;
    if (ctx.codeCheck) {
      const code = ctx.codeCheck();
      const still = code.filter((i) => i.severity === "critical");
      const keys = new Set(still.map((i) => i.key));
      for (const e of open) if (CODE_SOURCES.has(e.source ?? "") && e.status === "open" && !keys.has(e.key)) { e.status = "closed"; e.closedBy = `round ${round}: the ${e.source} check passes on the current text`; closedNow++; }
      for (const i of still) mergeIssue(ledger, i, round, nextId); // a defect the repair introduced opens a new entry
      codeMajors = code.filter((i) => i.severity !== "critical");
      const nowKeys = new Set(code.map((i) => i.key));
      codeFixed = pendingCode.filter((i) => !nowKeys.has(i.key)).length; // format gaps this round closed
    }
    for (const i of next.issues) if (i.severity === "critical") mergeIssue(ledger, i, round, nextId);
    const newCritical = ledger.length - before;
    log("orchestrator", "EDITORIAL_SCORECARD", { round, overall: next.overall, scores: next.scores, issues: next.issues, closure: next.closure, openCritical: openEntries() });
    // keep the round if the score did not fall, or if it closed critical issues without opening new ones
    // and lost at most 1 point (safety fixes may cost polish, but not the whole article)
    if (next.overall < current.overall && !(closedNow + codeFixed > 0 && newCritical === 0 && next.overall >= current.overall - 1)) {
      restore();
      codeMajors = codeMajorsBefore;
      log("orchestrator", "EDITORIAL_SCORECARD_REVERTED", { round, reason: `score fell ${current.overall} -> ${next.overall}` });
      break;
    }
    current = next;
    repaired.push(...repairedNow);
  }

  // FINAL_CHECK: re-run the specialised checks on the final text; their verdict is authoritative for their own issues
  if (ctx.finalCheck && repaired.length) { // unchanged text would only re-roll the same verdict
    const fin = await ctx.finalCheck().catch(() => null);
    if (fin) {
      const finCritical = fin.filter((i) => i.severity === "critical"); // majors from the final check do not block
      const finFeasSections = new Set(finCritical.filter((i) => i.source === "feasibility").map((i) => i.section));
      const finKeys = new Set(finCritical.map((i) => i.key).filter(Boolean));
      for (const e of ledger) {
        if (e.status !== "open") continue;
        if (e.source === "feasibility" && !finFeasSections.has(e.section) && !(e.alsoEdit ?? []).some((h) => finFeasSections.has(h))) { e.status = "closed"; e.closedBy = "final feasibility check found no problem here"; }
        if (e.source === "evidence" && e.key && !finKeys.has(e.key)) { e.status = "closed"; e.closedBy = "final evidence check: supported, deferred to the manual, or removed"; }
        if (e.source === "order" && e.key && !finKeys.has(e.key)) { e.status = "closed"; e.closedBy = "final dependency check: order is valid"; }
        if (CODE_SOURCES.has(e.source ?? "") && e.key && !finKeys.has(e.key)) { e.status = "closed"; e.closedBy = `final ${e.source} check passes`; }
      }
      for (const i of finCritical) mergeIssue(ledger, i, "final", nextId);
      log("orchestrator", "EDITORIAL_FINAL_CHECK", { issues: fin });
    }
  }
  // NON_REGRESSION: the editor never hands back a worse article unless it closed critical issues
  if (initial && current && repaired.length && current.overall < initial.overall && openEntries().length >= originalOpen) {
    ctx.sections.forEach((s, i) => { s.content = original[i].content; s.wordCount = original[i].wordCount; });
    ledger.splice(0, ledger.length, ...originalLedger.map((e) => ({ ...e })));
    log("orchestrator", "EDITORIAL_NON_REGRESSION", { restored: true, from: current.overall, to: initial.overall, openBefore: originalOpen });
    current = initial;
    repaired.length = 0;
  }
  const openCritical = openEntries();
  const codeGaps = (ctx.codeCheck?.() ?? []).filter((i) => i.severity !== "critical");
  log("orchestrator", "EDITORIAL_SCORECARD_RESULT", { initial: initial?.overall ?? null, final: current?.overall ?? null, finalScores: current?.scores ?? null, repaired, openCritical, closedCritical: ledger.filter((e) => e.status === "closed"), codeGaps });
  return { initial, final: current, repaired, ledger, openCritical, codeGaps };
}
