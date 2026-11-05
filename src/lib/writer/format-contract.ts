// FORMAT_CONTRACT: every article format (template) has its own deliverable. The template prompts in
// templates.ts never reached the writer once the outline became SERP-driven, so a comparison had no
// comparison table, a pricing page no price up front, a roundup no selection method. Here each format gets
//  - writer rules every section sees, plus a duty for the first and the last content section;
//  - plain-code checks (no model) whose issues only these checks can close, re-run after every repair round.
import type { ArticleCategory } from "./templates";
import { CATEGORY_LABELS } from "./templates";
import type { ScorecardIssue } from "./editorial-scorecard";

export interface FormatContract {
  category: ArticleCategory;
  label: string;
  /** rules every section of this format follows */
  rules: string;
  /** duty of the first content section */
  first?: string;
  /** duty of the last content section before the FAQ */
  last?: string;
  /** H1 pattern for this format */
  h1?: string;
}

const C: Record<ArticleCategory, Omit<FormatContract, "category" | "label">> = {
  "definition": {
    rules: "Definition page: the article's first sentence answers what the subject is in one self-contained sentence (\"X is ...\"). Each section has one job (scope, how it works, how it is measured, an example, common mistakes) with no overlap. Name at least two limits or cases where it does not apply.",
    first: "FORMAT_FIRST: open with a one-sentence definition (\"<subject> is ...\"), then its scope: what it includes and what it does not",
    h1: "What Is <subject>? <the specific angle>",
  },
  "how-it-works": {
    rules: "How-it-works page: explain the mechanism as ordered stages; for each stage say what happens, what triggers it and what it produces. Name who or what is involved, give one concrete worked example and state the known limitations.",
    first: "FORMAT_FIRST: a one-sentence summary of how it works, then the stages as a numbered list or a table",
    h1: "How <subject> Works: <the key mechanism>",
  },
  "how-to": {
    rules: "How-to guide: each step is one action with a checkable result; state prerequisites and roughly how long the task takes when sources give it; tell the reader how to confirm it worked.",
    first: "FORMAT_FIRST: the steps as one numbered table (Step | Action | What to check)",
    last: "FORMAT_LAST: how to confirm the task succeeded and what to do if it did not",
  },
  "troubleshooting": {
    rules: "Troubleshooting page: map symptoms to causes to fixes. For each cause give a check the reader can do to confirm it, the fix, and when to stop and get professional help. Start with the most likely and the cheapest-to-check cause; name exact warning lights, codes, sounds or error messages when sources give them.",
    first: "FORMAT_FIRST: the most likely causes first, as a table: Symptom | Likely cause | Quick check | Fix",
    last: "FORMAT_LAST: when to stop and get professional help, naming the specific signs",
    h1: "Why <problem> Happens and How to Fix It",
  },
  "comparison": {
    rules: "Comparison page: compare the options on the same criteria, with values from the sources or labeled typical; state the key difference up front; never declare one universal winner: say which option fits which need.",
    first: "FORMAT_FIRST: state the key difference in the first two sentences, then a comparison table with one row per criterion and one column per option",
    last: "FORMAT_LAST: decision rules: \"Choose <option> if ...\" for every option",
    h1: "<Option A> vs <Option B>: <the key difference>",
  },
  "best-options": {
    rules: "Best-options page: say how the options were selected (criteria and public evidence: specs, published tests, user ratings, prices); never claim hands-on testing. For each option: what it is, who it is best for, its main strength, its main weakness and a typical price with an \"as of <Month Year>\" date or a hedge. Include one comparison table.",
    first: "FORMAT_FIRST: the top picks in one sentence each (best overall, best value, best for a specific need), then the selection criteria",
    last: "FORMAT_LAST: how to choose: decision rules by need and budget",
    h1: "Best <product> for <use case>: <number> Picks Compared",
  },
  "alternatives": {
    rules: "Alternatives page: start with why people look for an alternative (cost, missing features, limits). For each alternative: the key difference from the original, strengths, weaknesses, the ideal user and a typical price with a date or a hedge. Include one comparison table; never claim hands-on testing.",
    first: "FORMAT_FIRST: the best alternative for each common need in one sentence each, then why people switch",
    last: "FORMAT_LAST: decision rules: \"Choose <alternative> if ...\"",
    h1: "<Original> Alternatives: <what they offer instead>",
  },
  "review": {
    rules: "Review page: say what the review is based on (published specs, independent tests, verified user reports) and never claim personal testing, lab results or long-term use that the SOURCES do not show. Cover the real features, performance evidence, the price with its date, pros and cons, and a clear verdict.",
    first: "FORMAT_FIRST: the verdict in two sentences (who it is for and the main trade-off), then what this review is based on",
    last: "FORMAT_LAST: the verdict as decision rules: buy if ..., skip if ..., and the best alternative for those who skip",
    h1: "<Product> Review: <the verdict in a few words>",
  },
  "pricing": {
    rules: "Pricing page: give the typical price range in the first sentence with its scope (US, what is included, as of <Month Year>). Every price states its source or is labeled typical, with its date. Explain what changes the cost, the hidden or extra costs, and the free or cheaper options. Include a pricing table: Item or plan | Typical price | What is included.",
    first: "FORMAT_FIRST: the typical price range in the first sentence (with scope and date), then the pricing table",
    last: "FORMAT_LAST: how to get a fair price: what to ask for and what to compare between quotes",
    h1: "How Much Does <subject> Cost? <year> Prices and What Changes Them",
  },
  "benefits-risks": {
    rules: "Benefits-and-risks page: give both sides with their conditions and evidence, never hype. For each benefit say for whom and under which condition; for each risk say how likely and how serious, with its source. Say who benefits most and who should be cautious or avoid it.",
    first: "FORMAT_FIRST: the balanced answer in two sentences: the main benefit and the main risk, each with its condition",
    last: "FORMAT_LAST: who should and who should not, as decision rules",
  },
  "beginners-guide": {
    rules: "Beginner's guide: assume no prior knowledge; define each term in plain words the first time it appears; explain why it matters; give a numbered way to get started; name the common beginner mistakes.",
    first: "FORMAT_FIRST: what it is and why it matters, in two plain sentences",
    last: "FORMAT_LAST: next steps after the basics, in order",
    h1: "<subject> for Beginners: <what the reader will be able to do>",
  },
  "checklist": {
    rules: "Checklist page: the full checklist comes first so readers can scan it: one checkable action per item, starting with a verb. Later sections explain items briefly and never repeat the list.",
    first: "FORMAT_FIRST: the complete checklist as a bulleted list, one checkable action per item, each starting with a verb",
    h1: "<task> Checklist: <number> Steps to <outcome>",
  },
  "case-study": {
    rules: "Case-study page: use only real cases named in the SOURCES and never invent a company, person or result. Cover the starting situation, the challenge, the approach in detail, measurable results with numbers and dates linked to their source, and the lessons. If no real case is in the sources, present a clearly labeled hypothetical example.",
    first: "FORMAT_FIRST: the result in one sentence (who, what changed, by how much, when), linked to its source",
    last: "FORMAT_LAST: the lessons a reader can apply, as specific actions",
  },
  "statistics": {
    rules: "Statistics page: every statistic has an inline source link and the year it refers to in the same sentence; give the sample or scope when the source states it; never round without saying so; never combine numbers from different sources into one figure; separate what the data shows from interpretation.",
    first: "FORMAT_FIRST: the single most important number in the first sentence, with its source link and year",
    last: "FORMAT_LAST: the limits of the data (sample, period, method) and what it does not show",
    h1: "<topic> Statistics (<year>): <the key finding>",
  },
  "industry-analysis": {
    rules: "Industry analysis: separate confirmed trends (data with a source link and its date) from forecasts (always attributed: who forecasts what, by when); explain what drives each trend and what it means for businesses or users; never present speculation as fact.",
    first: "FORMAT_FIRST: the main shift in one sentence with its key number, source and date",
    last: "FORMAT_LAST: what readers should do now, by role",
    h1: "<industry> in <year>: <the key shift>",
  },
};

// EXPLANATION_NOT_INSTRUCTIONS: in the matrix an explainer told readers to "check the cell's manual" and "stop and get
// help" while they were only learning how solar panels work; safety boilerplate belongs to tasks the reader performs
const EXPLANATORY = new Set<ArticleCategory>(["definition", "how-it-works", "statistics", "industry-analysis", "case-study"]);
const EXPLAIN_NOTE = " This page explains; the reader is not performing a task: never tell them to check a manual or label, stop, or get help, except for a real decision or action they would take (buying, installing, operating, hiring).";

export function formatContract(category: ArticleCategory | string): FormatContract {
  const cat = (category in C ? category : "definition") as ArticleCategory;
  const c = C[cat];
  return { category: cat, label: CATEGORY_LABELS[cat], ...c, rules: EXPLANATORY.has(cat) ? c.rules + EXPLAIN_NOTE : c.rules };
}

// ---------- plain-code checks ----------
type Sec = { heading: string; content: string; level: number };
const contentSections = (secs: Sec[]) => secs.filter((s) => s.level === 2 && !/faq|frequently asked/i.test(s.heading));
const protectLinks = (t: string) => t.replace(/\]\((?:https?:\/\/|#)[^)\s]*\)/g, "](L)");
/** First prose sentence of a section (headings, tables and lists skipped). */
export function firstSentence(t: string): string {
  const body = protectLinks(t).split("\n").filter((l) => l.trim() && !/^\s*(#|\||[-*•]\s|\d+[.)]\s)/.test(l)).join(" ");
  return (body.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? body).trim();
}
export const hasTable = (t: string) => /^\s*\|.*\|\s*$/m.test(t) && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/m.test(t);
export const listItems = (t: string) => (t.match(/^\s*(?:- \[[ xX]\]|[-*•]|\d+[.)])\s+\S/gm) ?? []).length;
const numbered = (t: string) => (t.match(/^\s*\d+[.)]\s+\S/gm) ?? []).length >= 3 || hasTable(t);
const sentences = (t: string) => protectLinks(t).split(/\n+|(?<=[.!?])\s+(?=[A-Z(*])/).map((s) => s.trim()).filter(Boolean);
const STAT = /\d+(?:\.\d+)?\s?%|\b\d[\d,.]*\s?(?:million|billion|trillion)\b/i;
const MONEY = /\$\s?\d|\b\d[\d,.]*\s?(?:USD|dollars)\b/i;
const DATED = /\bas of (?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+20\d\d\b|\bas of 20\d\d\b|\b(?:in|for|since|during) 20\d\d\b|\(20\d\d\)|\b20\d\d (?:prices?|rates?|data|survey|report|figures?|average)\b/i;
const DECISION = /\b(?:choose|pick|go with|buy|skip|consider|opt for|stick with)\b[^.\n]{0,120}\b(?:if|when|for)\b|\bbest (?:for|if)\b|\bif you\b[^.\n]{0,120}\b(?:choose|pick|go with|buy|skip|consider|stick with)\b/i;
/** First-person testing claims the sources cannot back (the writer has never touched the product). */
export const INVENTED_TESTING = /\b(?:we|our team|our editors|our experts|i)\s+(?:have\s+)?(?:tested|tried|used|reviewed|measured|ran|evaluated|bought)\b|\b(?:our|my)\s+(?:tests?|testing|lab|hands-on|test results)\b|\bin (?:our|my) (?:tests?|testing|experience)\b|\bhands-on (?:test|testing|review)\b/i;

const sectionWith = (secs: Sec[], re: RegExp) => secs.find((s) => re.test(s.heading));

/** Plain-code format checks; issues carry source "format" and a stable key. */
export function checkFormat(category: ArticleCategory | string, sections: Sec[]): ScorecardIssue[] {
  const f = formatContract(category);
  const secs = contentSections(sections);
  if (!secs.length) return [];
  const first = secs[0];
  const last = secs[secs.length - 1];
  const lastTwo = secs.slice(-2);
  const all = secs.map((s) => s.content).join("\n");
  const out: ScorecardIssue[] = [];
  const add = (id: string, section: string, problem: string, fix: string, severity: "critical" | "major" = "major") =>
    out.push({ section, dimension: id === "invented-testing" ? "eeat" : "ux", severity, source: "format", key: `format:${id}`, problem: `FORMAT (${f.label}) ${problem}`, fix });

  // every format: no invented first-hand testing ("no hands-on testing was done" is a disclosure, not a claim)
  for (const s of secs) {
    const m = Array.from(s.content.matchAll(new RegExp(INVENTED_TESTING.source, "gi"))).find((x) => !/\b(?:no|not|without|never|isn't|wasn't|aren't|weren't|instead of)\b[^.!?\n]{0,40}$/i.test(s.content.slice(Math.max(0, (x.index ?? 0) - 60), x.index)));
    if (m) out.push({ section: s.heading, dimension: "eeat", severity: "critical", source: "format", key: `format:invented-testing:${s.heading.toLowerCase()}`, problem: `INVENTED_TESTING: "${m[0]}" claims first-hand testing or use that no source shows.`, fix: "Rewrite the claim as what the sources report (published specs, independent tests, user reports), with the source link; never say we, our team or I tested or used it." });
  }
  // every format: "follow Step 5" with no numbered steps in the article is a dead end for the reader
  const prose = secs.map((s) => s.content.split("\n").filter((l) => !/^\s*\|/.test(l)).join("\n")).join("\n");
  const stepRef = prose.match(/\b[Ss]tep \d+\b/);
  const hasSteps = secs.some((s) => /^\s*\|\s*(?:step|#)\s*\|/im.test(s.content) || (s.content.match(/^\s*\d+[.)]\s+\S/gm) ?? []).length >= 3);
  if (stepRef && !hasSteps) {
    const at = secs.find((s) => /\b[Ss]tep \d+\b/.test(s.content.split("\n").filter((l) => !/^\s*\|/.test(l)).join("\n"))) ?? first;
    add("step-refs", at.heading, `the text points to "${stepRef[0]}", but the article has no numbered steps.`, "Replace every \"Step N\" reference with the action itself (for example \"after you charge the battery\"), or add the numbered steps they refer to.");
  }
  const c = f.category;
  if (c === "definition" && !/\b(?:is|are|refers to|means|describes)\b/i.test(firstSentence(first.content)))
    add("first-definition", first.heading, "the first sentence does not define the subject.", "Make the first sentence a one-sentence definition: \"<subject> is ...\", then its scope.");
  if (c === "how-it-works" && !secs.some((s) => numbered(s.content)))
    add("stages", first.heading, "the mechanism is not shown as ordered stages.", "Add the stages as a numbered list or a table (stage | what happens | result), using only facts already in the article.");
  if (c === "how-to" && !lastTwo.some((s) => /\b(verif|confirm|check|test)\w*/i.test(s.content)))
    add("verify", last.heading, "the guide never says how to confirm the task worked.", "Add how to confirm success and what to do if it did not work.");
  if (c === "troubleshooting") {
    if (!secs.some((s) => hasTable(s.content))) add("cause-table", first.heading, "there is no symptom-to-fix table.", "Add a table: Symptom | Likely cause | Quick check | Fix, using the causes the article already explains.");
    if (!lastTwo.some((s) => /\b(professional|mechanic|technician|dealer|service (?:center|centre|shop)|electrician|plumber|doctor|support|call)\b/i.test(s.content)))
      add("escalation", last.heading, "there is no point at which the reader is told to stop and get help.", "Say when to stop and get professional help, naming the specific signs.");
  }
  if (c === "comparison" && !secs.slice(0, 2).some((s) => hasTable(s.content)))
    add("table-early", first.heading, "there is no comparison table near the top.", "Add a comparison table in this section: one row per criterion, one column per option, values only from the article or labeled typical.");
  if (["best-options", "alternatives", "pricing"].includes(c) && !secs.some((s) => hasTable(s.content))) {
    const target = c === "pricing" ? first : sectionWith(secs, /compar|pick|best|top|option|alternativ/i) ?? first;
    add("table", target.heading, "there is no comparison table.", c === "pricing" ? "Add a pricing table: Item or plan | Typical price | What is included, using only prices already in the article or the SOURCES." : "Add a comparison table of the options (option | best for | main strength | main weakness | typical price), using only facts already in the article.");
  }
  if (["comparison", "best-options", "alternatives", "review", "benefits-risks"].includes(c)) {
    const where = c === "review" ? [first, ...lastTwo] : lastTwo;
    if (!where.some((s) => DECISION.test(s.content))) add("decision-rules", last.heading, "the reader is never told which option to pick for which need.", "End with decision rules: \"Choose <option> if ...\" (or buy/skip if ... for a review), one line per option or reader type.");
  }
  if (c === "pricing" && !MONEY.test(firstSentence(first.content)))
    add("price-first", first.heading, "the first sentence gives no price.", "Open with the typical price range and its scope and date, taken from the RESEARCH or SOURCES; if no source gives a price, open with exactly what the price depends on.");
  if (["pricing", "best-options", "alternatives", "review", "comparison"].includes(c) && (all.match(new RegExp(MONEY.source, "gi")) ?? []).length >= 2 && !DATED.test(all)) {
    const target = secs.find((s) => MONEY.test(s.content)) ?? first;
    add("price-dates", target.heading, "prices are given without a date.", "Date the prices (\"as of <Month Year>\") or label them typical, citing the source for each.");
  }
  if (["statistics", "industry-analysis", "case-study"].includes(c)) {
    const scored = secs.map((s) => { const st = sentences(s.content).filter((x) => STAT.test(x) || (c === "case-study" && MONEY.test(x))); return { s, total: st.length, linked: st.filter((x) => /\]\(L\)/.test(x)).length }; });
    const total = scored.reduce((n, x) => n + x.total, 0), linked = scored.reduce((n, x) => n + x.linked, 0);
    if (total >= 3 && linked / total < 0.8) {
      const worst = [...scored].sort((a, b) => (b.total - b.linked) - (a.total - a.linked))[0].s;
      add("stat-sources", worst.heading, `only ${linked} of ${total} statistics have a source link in the same sentence.`, "Link each statistic to the source in SOURCES that states it, with its year, or remove the statistic.");
    }
  }
  if (c === "checklist" && listItems(first.content) < 5)
    add("checklist-first", first.heading, "the checklist does not come first.", "Put the complete checklist here as a bulleted list (at least 5 items), one checkable action per item starting with a verb.");
  if (c === "benefits-risks") {
    const heads = sections.map((s) => [s.heading, ...Array.from(s.content.matchAll(/^###\s+(.+)$/gm)).map((m) => m[1])]).flat().join(" | ");
    if (!/\b(benefit|advantage|pros?\b|upside)/i.test(heads) || !/\b(risk|downside|drawback|disadvantage|cons?\b|side effect)/i.test(heads))
      add("both-sides", first.heading, "benefits and risks do not both have their own heading.", "Give benefits and risks each their own ### heading with conditions and sources.");
  }
  if (c === "beginners-guide" && !secs.some((s) => (s.content.match(/^\s*\d+[.)]\s+\S/gm) ?? []).length >= 3 || hasTable(s.content)))
    add("getting-started", sectionWith(secs, /start|first|begin|step/i)?.heading ?? first.heading, "there is no numbered way to get started.", "Give the getting-started steps as a numbered list, using only facts already in the article.");
  return out;
}

/** The contract as one prompt block for writers and the critic. */
export function formatBlock(f: FormatContract): string {
  return `ARTICLE FORMAT: ${f.label} (chosen from what Google ranks for this query). ${f.rules}${f.first ? ` First section: ${f.first.replace(/^FORMAT_FIRST:\s*/, "")}.` : ""}${f.last ? ` Last section before the FAQ: ${f.last.replace(/^FORMAT_LAST:\s*/, "")}.` : ""}`;
}
