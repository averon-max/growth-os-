// PUBLICATION_READINESS_GATE_V2 + EDITORIAL_CLOSURE_AND_EVIDENCE_V2
// 1) PROCEDURE_FEASIBILITY: can a reader actually carry out the instructions with what the article
//    tells them to have (missing tools, dead-end fallbacks, contradictions, missing stop rules)?
// 2) EVIDENCE_CONTRACT: for each critical claim, which source text supports or contradicts it, with a
//    word-for-word quote verified against the fetched page text AND checked to be about the claim.
// 3) EVIDENCE_RECOVERY: weak critical claims trigger a targeted search on official domains; new pages
//    are fetched, re-verified and offered to the editor as citable sources.
// 4) evaluateReadiness: READY only with no gate failures, no failed checks, score >= minimum and zero
//    open critical issues.
import type OpenAI from "openai";
import { log } from "./logger";
import { normUrl } from "./article-writer";
import type { ScorecardIssue } from "./editorial-scorecard";
import { matchHeading } from "./editorial-scorecard";
import { chatJson, hasArray } from "./llm-json";

const stripLinks = (md: string) => md.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1 <$2>");
const normH = (x: string) => x.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export async function checkProcedureFeasibility(client: OpenAI, keyword: string, markdown: string, research: string, headings: string[]): Promise<ScorecardIssue[]> {
  const prompt = `You are a safety and feasibility reviewer for a step-by-step article about "${keyword}". Read it as a reader who has ONLY the equipment, materials, skills and access the article tells them to have, at the moment each step happens.

Report every real problem of these types:
- MISSING_TOOL: a step requires a tool, material, measurement or access that the article never tells the reader to have, or calls optional without saying how to complete the step without it.
- DEADLOCK: a requirement, check or stop rule the reader cannot satisfy in their situation and that has no executable fallback, including circular fallbacks that need the very thing being checked (for example "have it checked before you go" when going there is the only way to get it checked), and a "confirm X first" with no instruction for when X is not confirmed.
- CONTRADICTION: two places give different instructions, order or values, or call the same thing optional in one place and required in another.
- MISSING_STOP: a foreseeable dangerous situation in a step with no stop or get-help instruction.
- UNSAFE_FALLBACK: a fallback for a missing tool, measurement or condition that lowers the safety margin (tighten less, inflate less, skip or postpone a safety check, keep going) while a firmer conservative action exists; the fix gives that action with what the reader has plus the soonest professional check (for example tighten as firmly as the supplied wrench allows, in the star pattern, and have the torque checked at the nearest shop).
- UNSAFE_ORDER: a step done before the object is made safe (leaving the vehicle, opening the trunk or fetching tools before the engine is off and the parking brake is set; touching parts before power is off).

Rules: report only problems present in the current text, quoting a few words. One defect = one issue, even if it shows up in several places: name the main section in "section" and every other section that must change in the same edit in "alsoEdit" (for example the equipment list when a step needs a tool). The fix is a concrete edit using only facts in the article or the RESEARCH, choosing the conservative option the sources support; if no source gives a fallback, the fix states the dependency honestly (what to have or check before starting, and to stop and call for help otherwise) instead of inventing one. Return JSON {"issues":[{"section":"<exact ## heading>","alsoEdit":["<exact ## heading>"],"type":"MISSING_TOOL|DEADLOCK|CONTRADICTION|MISSING_STOP|UNSAFE_FALLBACK|UNSAFE_ORDER","problem":"...","fix":"..."}]}; {"issues":[]} if the procedure is complete and executable. At most 6.

RESEARCH:
${research.slice(0, 6000)}

ARTICLE:
${stripLinks(markdown)}`;
  const parsed = await chatJson<{ issues: unknown[] }>(client, "PROCEDURE_FEASIBILITY", prompt, { maxTokens: 8000, validate: hasArray("issues") });
  const issues: ScorecardIssue[] = [];
  for (const it of parsed.issues) {
    const o = (it ?? {}) as Record<string, unknown>;
    const section = matchHeading(String(o.section ?? ""), headings);
    const problem = String(o.problem ?? "").trim();
    const fix = String(o.fix ?? "").trim();
    if (!section || !problem || !fix) continue;
    const alsoEdit = (Array.isArray(o.alsoEdit) ? o.alsoEdit : []).map((h) => matchHeading(String(h), headings)).filter((h): h is string => !!h && h !== section).slice(0, 2);
    const type = String(o.type ?? "FEASIBILITY").toUpperCase().replace(/[^A-Z_]/g, "");
    issues.push({ section, alsoEdit, dimension: "content", severity: "critical", source: "feasibility", key: `feasibility:${normH(section)}`, problem: `${type}: ${problem}`, fix });
  }
  log("orchestrator", "PROCEDURE_FEASIBILITY", { issues });
  return issues.slice(0, 6);
}

export interface PageText {
  url: string;
  title: string;
  text: string;
  kind: "OFFICIAL" | "COMPETITOR";
  position?: number;
  origin?: "authority" | "competitor" | "cited" | "recovery";
}

export type EvidenceStatus = "supported" | "partial" | "unsupported" | "contradicted" | "unverified" | "deferred" | "removed";

export interface EvidenceRecord {
  claimId: string;
  section: string;
  claim: string;
  citedUrl: string | null;
  sourceUrl: string | null;
  sourceKind: "OFFICIAL" | "COMPETITOR" | null;
  quote: string;
  quoteVerified: boolean;
  status: EvidenceStatus;
  applicability: string;
  critical: boolean;
  kind: "precaution" | "instruction" | "value";
  missing?: string;
  note?: string;
}

const normText = (x: string) => x.toLowerCase().replace(/[\u2018\u2019\u201B]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2010-\u2015]/g, "-").replace(/[^a-z0-9'"%.-]+/g, " ").replace(/\s+/g, " ").trim();

/** True when the quote (or at least 8 consecutive words of it) appears in the page text. */
export function quoteInText(quote: string, text: string): boolean {
  const q = normText(quote), t = normText(text);
  if (q.length < 12) return false;
  if (t.includes(q)) return true;
  const w = q.split(" ");
  if (w.length < 8) return false;
  for (let i = 0; i + 8 <= w.length; i++) if (t.includes(w.slice(i, i + 8).join(" "))) return true;
  return false;
}

const STOP = new Set("about above after again against also always before being below between both cannot could does doing down during each every from further have having here into itself just more most must never once only other over same should some such than that their them then there these they this those through under until very were what when where which while with would your yours yourself the and for are but not you all any can had her was one our out use".split(" "));
// "tire-pressure" = "tire pressure", "tire's" = "tire", "loosening" = "loosen"
const stem = (w: string) => w.replace(/'s$/, "").replace(/(ing|ed|es|s)$/, "").slice(0, 5);
const contentWords = (x: string) => Array.from(new Set(normText(x).replace(/[-'"]/g, (c) => (c === "-" ? " " : c)).split(" ").map((w) => w.replace(/^['"]+|['".]+$/g, "")).filter((w) => w.length >= 4 && !STOP.has(w)).map(stem)));

/** SEMANTIC_MATCH: a real quote from the page that is about something else is not evidence for the claim. */
/** A claim that states a concrete, checkable value (number, price, percentage, limit, date). */
export const hasConcreteValue = (claim: string) =>
  /\$\s?\d|\d\s?%|\b(?:19|20)\d\d\b|\b\d[\d,.]*\s?(?:percent|°|degrees|mph|miles?|mi|psi|kwh|kw|watts?|volts?|amps?|ah|hours?|hrs?|minutes?|mins?|seconds?|days?|weeks?|months?|years?|lbs?|pounds?|oz|ounces?|kg|grams?|g|feet|foot|ft|inches?|in|sq|square|gallons?|liters?|cups?|tbsp|tsp|times|x)\b|\b(?:twice|half|double|triple|dozen)\b/i.test(claim);
const numbersOf = (x: string) => Array.from(x.replace(/,(?=\d{3})/g, "").matchAll(/\d+(?:\.\d+)?/g)).map((m) => m[0]);

export function quoteMatchesClaim(quote: string, claim: string): boolean {
  const c = contentWords(claim), q = new Set(contentWords(quote));
  if (!c.length || !q.size) return false;
  // NUMBER_MATCH: a verified quote that states every number of the claim is about the claim
  const nums = numbersOf(claim);
  if (nums.length && nums.every((n) => numbersOf(quote).includes(n)) && c.some((w) => q.has(w))) return true;
  const hits = c.filter((w) => q.has(w)).length;
  return c.length < 3 ? hits >= 1 : hits >= 2;
}

export interface EvidenceContext {
  client: OpenAI;
  keyword: string;
  headings: () => string[];
  pages: PageText[]; // grows with cited and recovered pages
  authorityDomains: string[];
  search?: (query: string) => Promise<{ url: string; title: string; description: string }[]>;
  fetchText?: (url: string) => Promise<string>;
}

// the excerpts used to be cut at 3000 chars, so facts further down a page looked "unsupported"
const pagesBlock = (pages: PageText[]) => {
  const per = Math.min(6000, Math.floor(48000 / Math.max(1, pages.length)));
  return pages.map((p, i) => `[S${i + 1}] (${p.kind}) ${p.url} — ${p.title}\n${p.text.slice(0, per)}`).join("\n\n");
};
const WEAK: EvidenceStatus[] = ["unsupported", "unverified", "contradicted"];

function finalizeRecord(o: Record<string, unknown>, ctx: EvidenceContext, base?: EvidenceRecord): EvidenceRecord | null {
  const claim = String(o.claim ?? o.currentClaim ?? base?.claim ?? "").trim();
  if (!claim) return null;
  const byUrl = new Map(ctx.pages.map((p) => [normUrl(p.url), p]));
  const sourceUrl = typeof o.sourceUrl === "string" && o.sourceUrl ? o.sourceUrl : null;
  const page = sourceUrl ? byUrl.get(normUrl(sourceUrl)) : undefined;
  const quote = String(o.quote ?? "").trim();
  const quoteVerified = !!page && quoteInText(quote, page.text);
  const allowed: EvidenceStatus[] = ["supported", "partial", "unsupported", "contradicted", "deferred"];
  let status = (allowed.includes(String(o.status) as EvidenceStatus) ? String(o.status) : "unsupported") as EvidenceStatus;
  let note: string | undefined;
  // a verdict that rests on a quote we cannot find in the fetched text, or a quote about something else, is not evidence
  if ((status === "supported" || status === "partial" || status === "contradicted") && !quoteVerified) { status = "unverified"; note = "quote not found in the fetched page text"; }
  else if ((status === "supported" || status === "partial") && !quoteMatchesClaim(quote, claim)) { status = "unverified"; note = "quote is not about the claim"; }
  return {
    claimId: base?.claimId ?? "",
    section: matchHeading(String(o.section ?? base?.section ?? ""), ctx.headings()) ?? String(o.section ?? base?.section ?? ""),
    claim,
    citedUrl: typeof o.citedUrl === "string" && o.citedUrl ? o.citedUrl : base?.citedUrl ?? null,
    sourceUrl: page ? page.url : sourceUrl,
    sourceKind: page ? page.kind : null,
    quote,
    quoteVerified,
    status,
    applicability: String(o.applicability ?? base?.applicability ?? ""),
    critical: base?.critical ?? o.critical === true,
    kind: base?.kind ?? (["precaution", "instruction", "value"].includes(String(o.kind)) ? (String(o.kind) as EvidenceRecord["kind"]) : "value"),
    missing: status === "partial" ? String(o.missing ?? "") : undefined,
    note,
  };
}

export async function buildEvidenceContract(ctx: EvidenceContext, markdown: string): Promise<EvidenceRecord[]> {
  const usable = ctx.pages.filter((p) => p.text.length > 300).slice(0, 12);
  if (!usable.length) {
    log("orchestrator", "EVIDENCE_CONTRACT", { skipped: "no source texts available", records: [] });
    return [];
  }
  const prompt = `You are verifying the evidence behind an article about "${ctx.keyword}" (US audience).

SOURCE TEXTS (excerpts of pages the article can cite; each starts with its URL):
${pagesBlock(usable)}

ARTICLE (links shown as text <url>):
${stripLinks(markdown)}

List up to 15 CRITICAL CLAIMS: every sentence that carries a link, plus every safety rule, numeric value or limit, legal or regulatory statement, and money or health statement. CLAIM_DECOMPOSITION: each claim is ONE atomic, checkable fact; split a sentence with several instructions or facts into separate claims (copy the exact words of the part). For each claim return:
- section: the exact ## heading it is in
- claim: the sentence copied word-for-word from the article, without the <url>
- citedUrl: the URL shown on it, or null
- sourceUrl: the SOURCE TEXT URL that best supports or contradicts it, or null
- quote: copied word-for-word from that source text (at most 30 words), the passage that supports or contradicts THIS claim; "" if none
- status: supported (a source text states it), partial (states part of it, or only under narrower conditions), unsupported (no source text states it), contradicted (a source text states something incompatible), deferred (the sentence only tells the reader to check the manual, label or provider and asserts no specific fact)
- applicability: the conditions under which the claim holds according to the source (vehicle, product, region, version), or ""
- missing: for partial, the exact part of the claim the source does NOT state; otherwise ""
- kind: precaution (a warning or stop rule that makes the reader MORE careful), instruction (how to do a step), or value (a number, limit, distance, speed, pressure, legal rule, or a permission that something is OK)
- critical: true if following a wrong version could cause injury, legal trouble or financial loss
Return JSON {"claims":[...]}.`;
  const parsed = await chatJson<{ claims: unknown[] }>(ctx.client, "EVIDENCE_CONTRACT", prompt, { maxTokens: 10000, validate: hasArray("claims") });
  const records: EvidenceRecord[] = [];
  for (const c of parsed.claims) {
    const r = finalizeRecord((c ?? {}) as Record<string, unknown>, ctx);
    if (r) records.push({ ...r, claimId: `C${records.length + 1}` });
  }
  log("orchestrator", "EVIDENCE_CONTRACT", { pages: usable.map((p) => ({ url: p.url, kind: p.kind, origin: p.origin ?? null, position: p.position ?? null })), summary: summarize(records), records });
  return records;
}

/** Re-checks specific claims against the CURRENT article and the given pages (after recovery or after repairs). */
export async function verifyClaims(ctx: EvidenceContext, claims: EvidenceRecord[], markdown: string, pages: PageText[], step: string): Promise<EvidenceRecord[]> {
  if (!claims.length) return [];
  const usable = pages.filter((p) => p.text.length > 300).slice(0, 12);
  const prompt = `Re-verify specific claims of an article about "${ctx.keyword}" (US audience).

SOURCE TEXTS:
${pagesBlock(usable) || "(none)"}

CURRENT ARTICLE (links shown as text <url>):
${stripLinks(markdown)}

CLAIMS TO RE-VERIFY:
${claims.map((c) => `[${c.claimId}] (section: ${c.section}) ${c.claim}`).join("\n")}

For each claim id: find its current version in the ARTICLE (it may have been rewritten or removed). Return JSON {"claims":[{"id":"C1","currentClaim":"<the current sentence word-for-word, or null if the claim is no longer in the article>","sourceUrl":"<url or null>","quote":"<word-for-word from that source text, max 30 words, or \\"\\">","status":"supported|partial|unsupported|contradicted|deferred","applicability":"..."}]}. deferred = the current sentence only tells the reader to check the manual, label or provider and asserts no specific fact.`;
  const parsed = await chatJson<{ claims: unknown[] }>(ctx.client, step, prompt, { maxTokens: 8000, validate: hasArray("claims") });
  const byId = new Map(claims.map((c) => [c.claimId, c]));
  const out: EvidenceRecord[] = [];
  for (const c of parsed.claims) {
    const o = (c ?? {}) as Record<string, unknown>;
    const base = byId.get(String(o.id ?? ""));
    if (!base) continue;
    if (o.currentClaim === null || o.currentClaim === "null") { out.push({ ...base, status: "removed", note: "claim no longer in the article" }); continue; }
    const r = finalizeRecord({ ...o, claim: o.currentClaim }, { ...ctx, pages: usable }, base);
    if (r) out.push(r);
  }
  // a claim the verifier did not report stays as it was
  for (const c of claims) if (!out.some((r) => r.claimId === c.claimId)) out.push(c);
  return out;
}

/** EVIDENCE_RECOVERY: targeted official-domain search for weak critical claims (max 3 searches). */
export async function recoverEvidence(ctx: EvidenceContext, records: EvidenceRecord[], markdown: string): Promise<{ records: EvidenceRecord[]; recovered: PageText[] }> {
  const weak = records.filter((r) => r.critical && WEAK.includes(r.status)).slice(0, 3);
  if (!weak.length || !ctx.search || !ctx.fetchText) return { records, recovered: [] };
  const known = new Set(ctx.pages.map((p) => normUrl(p.url)));
  const isAuthority = (u: string) => { try { const h = new URL(u).hostname.replace(/^www\./, ""); return /\.(gov|edu)$/.test(h) || ctx.authorityDomains.some((d) => h === d || h.endsWith(`.${d}`)); } catch { return false; } };
  const recovered: PageText[] = [];
  const tried: Record<string, string[]> = {};
  for (const r of weak) {
    const terms = normText(r.claim).split(" ").filter((w) => w.length >= 4 && !STOP.has(w)).slice(0, 8).join(" ");
    const scope = ctx.authorityDomains.length ? ` (${ctx.authorityDomains.slice(0, 4).map((d) => `site:${d}`).join(" OR ")})` : " (site:.gov OR site:.edu)";
    const query = `${terms}${scope}`;
    try {
      const results = (await ctx.search(query)).filter((x) => isAuthority(x.url) && !known.has(normUrl(x.url)));
      tried[r.claimId] = results.slice(0, 2).map((x) => x.url);
      for (const x of results.slice(0, 1)) {
        const text = await ctx.fetchText(x.url);
        known.add(normUrl(x.url));
        if (text.length > 300) recovered.push({ url: x.url, title: x.title, text, kind: "OFFICIAL", origin: "recovery" });
      }
    } catch (e) {
      tried[r.claimId] = [`search failed: ${String(e)}`];
    }
  }
  if (!recovered.length) {
    log("orchestrator", "EVIDENCE_RECOVERY", { weak: weak.map((r) => r.claimId), tried, recovered: [] });
    return { records, recovered };
  }
  ctx.pages.push(...recovered);
  const rechecked = await verifyClaims(ctx, weak, markdown, [...recovered, ...ctx.pages.filter((p) => !recovered.includes(p))], "EVIDENCE_RECOVERY_VERIFY");
  const merged = records.map((r) => rechecked.find((x) => x.claimId === r.claimId) ?? r);
  log("orchestrator", "EVIDENCE_RECOVERY", { weak: weak.map((r) => r.claimId), tried, recovered: recovered.map((p) => p.url), after: rechecked.map((r) => ({ claimId: r.claimId, status: r.status, sourceUrl: r.sourceUrl })) });
  return { records: merged, recovered };
}

/** Critical claims that are contradicted or unproven become critical ledger issues with a stable key. */
/**
 * Evidence findings become ledger issues with a stable key. Severity follows what a wrong version would do:
 * - contradicted by a source: critical (blocks publication)
 * - unproven VALUE (number, limit, legal rule, permission): critical (blocks)
 * - unproven precaution or instruction: major (the editor tries to source it; does not block, because a
 *   conservative warning that no fetched page happens to repeat is not a publication risk)
 * - partly supported: major (word it as far as the source goes)
 */
export function evidenceIssues(records: EvidenceRecord[], headings: string[], citable: { url: string; title: string }[] = []): ScorecardIssue[] {
  const issues: ScorecardIssue[] = [];
  const isCitable = (u: string | null) => !!u && citable.some((c) => normUrl(c.url) === normUrl(u));
  for (const r of records) {
    if (!r.critical || !headings.includes(r.section)) continue;
    if (r.status === "partial" && r.missing) {
      issues.push({ section: r.section, dimension: "eeat", severity: "major", source: "evidence", key: `evidence:${r.claimId}:partial`, problem: `[${r.claimId}] "${r.claim.slice(0, 140)}" is only partly supported; the source does not state: ${r.missing.slice(0, 160)}`, fix: `Word the claim exactly as far as ${r.sourceUrl ?? "the source"} supports it${isCitable(r.sourceUrl) ? ` and attach that link` : ""}; keep the unsupported part only as an instruction to check it with whoever sets it (manual or label, local code office, provider).` });
      continue;
    }
    if (!WEAK.includes(r.status)) continue;
    // a source whose quote is about something else is not offered as the link for this claim
    const link = r.status === "unsupported" || r.note === "quote is not about the claim" || r.status === "contradicted" ? null : isCitable(r.sourceUrl) ? r.sourceUrl : null;
    // only a concrete value (number, price, limit, date) blocks; a general statement the model labeled "value" is fixed, not blocking
    const isValue = r.kind === "value" && hasConcreteValue(r.claim);
    // a precaution that is STRICTER than a competitor page (no bricks or rocks as wheel chocks) is not a factual error:
    // only an official source contradicting it, or a contradicted value or instruction, blocks publication
    const saferThanCompetitor = r.status === "contradicted" && r.kind === "precaution" && r.sourceKind !== "OFFICIAL";
    const blocking = (r.status === "contradicted" && !saferThanCompetitor) || isValue;
    issues.push({
      section: r.section,
      dimension: "eeat",
      severity: blocking ? "critical" : "major",
      source: "evidence",
      key: `evidence:${r.claimId}`,
      problem: r.status === "contradicted"
        ? `[${r.claimId}] "${r.claim.slice(0, 160)}" is contradicted by ${r.sourceUrl}: "${r.quote}"`
        : `[${r.claimId}] ${isValue ? "value" : r.kind === "value" ? "statement" : r.kind} without verified support (${r.status}${r.note ? `: ${r.note}` : ""}): "${r.claim.slice(0, 160)}"`,
      fix: r.status === "contradicted"
        ? `Correct the claim so it matches the source passage (keep its conditions: ${r.applicability || "as stated by the source"}), or remove it.`
        : isValue
          ? `${link ? `Attach ${link} if it states this exact value, or ` : ""}replace the specific value with an instruction to check it with whoever sets it (the owner's manual or label for a product, the local building or code office for codes and permits, the provider for prices and plans); never keep an unsourced number, limit or permission.`
          : `Keep the ${r.kind === "precaution" ? "warning" : "instruction"} (do not weaken a safety step); attach a link from SOURCES that states it${link ? `, for example ${link}` : ""}, or word it as general practical advice.`,
    });
  }
  return issues;
}

export const summarize = (records: EvidenceRecord[]) => records.reduce<Record<string, number>>((m, r) => ((m[r.status] = (m[r.status] ?? 0) + 1), m), {});

export type CheckStatus = "PASSED" | "FAILED" | "SKIPPED";

export interface Readiness {
  status: "READY" | "REVIEW_REQUIRED";
  /** FAIL_CLOSED: a check that did not run is FAILED, never "no problems found" */
  checkStatus: Record<string, CheckStatus>;
  reasons: string[];
  editorialScore: number | null;
  openCritical: { id: string; section: string; source?: string; problem: string }[];
  evidence: Record<string, number>;
  checkFailures: string[];
}

export function evaluateReadiness(input: {
  qualityFailures: string[];
  finalScore: number | null;
  minScore: number;
  openCritical: { id: string; section: string; source?: string; problem: string }[];
  evidence: EvidenceRecord[];
  checkFailures?: string[];
  checkStatus?: Record<string, CheckStatus>;
}): Readiness {
  const reasons = [...input.qualityFailures];
  for (const [k, v] of Object.entries(input.checkStatus ?? {})) if (v === "FAILED" && !(input.checkFailures ?? []).some((f) => f.startsWith(k))) reasons.push(`check failed: ${k}`);
  for (const f of input.checkFailures ?? []) reasons.push(`check failed: ${f}`);
  if (input.finalScore === null) reasons.push("editorial score unavailable");
  else if (input.finalScore < input.minScore) reasons.push(`editorial score ${input.finalScore} < ${input.minScore}`);
  for (const e of input.openCritical) reasons.push(`open critical issue ${e.id} (${e.source ?? "scorecard"}, ${e.section}): ${e.problem.slice(0, 160)}`);
  return {
    status: reasons.length ? "REVIEW_REQUIRED" : "READY",
    checkStatus: input.checkStatus ?? {},
    reasons,
    editorialScore: input.finalScore,
    openCritical: input.openCritical.map((e) => ({ id: e.id, section: e.section, source: e.source, problem: e.problem })),
    evidence: summarize(input.evidence),
    checkFailures: input.checkFailures ?? [],
  };
}
