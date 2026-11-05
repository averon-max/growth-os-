import { filterRelevantSearches } from "./keyword-relevance";
import OpenAI from "openai";
import { log, logError } from "./logger";
import { removeRepeatedSentences } from "./dedupe-sentences";
import type { ArticleTemplate } from "./templates";
import type { KeywordCandidate } from "./keyword-picker";
import type { SerpAnalysis } from "./serp-analyzer";

import { pickAuthoritativeSources } from "./authoritative-sources";
import { chatJson, hasArray, LlmJsonError } from "./llm-json";
import { checkProcedureOrder } from "./procedure-order";
import { extractPlanTools, toolsSectionIndex } from "./plan-binding";
import { formatBlock, formatContract } from "./format-contract";
import { tracked } from "./usage";

export interface ArticleBrief {
  serpGap?: string;
  relatedKeywords?: string[];
  questions?: string[];
  faqCandidates?: string[];
  internalLinks?: { anchor: string; url: string; topic: string }[];
  primaryKeyword: KeywordCandidate;
  template: ArticleTemplate;
  serpAnalysis: SerpAnalysis;
  targetWordCount: number;
  outline: { h2: string; h3s: string[]; keyPoints: string[] }[];
}

export interface GeneratedArticle {
  title: string;
  metaDescription: string;
  h1: string;
  sections: { heading: string; level: 2 | 3; content: string; wordCount: number }[];
  totalWordCount: number;
  keyword: string;
  researchBrief?: string;
  sourcePool?: SourceItem[];
  /** the validated procedure plan every section followed (procedural articles only) */
  procedurePlan?: string;
  /** items of the plan's tools list; TOOLS_COVERAGE checks the article names each of them */
  planTools?: string[];
}

export interface SourceItem {
  title: string;
  url: string;
  kind: "OFFICIAL" | "COMPETITOR";
  about: string;
}

export const normUrl = (u: string) => u.replace(/[#?].*$/, "").replace(/\/+$/, "").toLowerCase();

/** Deterministic cleanup applied to every model output (also after fact-check and repairs). */
export function cleanSectionText(raw: string): string {
  return raw
    .replace(/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]+/g, "") // CJK_STRIP
    .replace(/[ \t]+$/gm, "")
    // META_STRIP: only the meta forms, never "an established brand"
    .replace(/\b(previously|already) established /gi, "")
    .replace(/\b(the|these|those) established (?=(?:conditions?|methods?|ratios?|schedules?|steps?|procedures?|values?|amounts?|rules?|criteria|settings?|sequence)\b)/gi, "$1 ")
    .replace(/,? ?(already|previously) (provided|stated|given|described)/gi, "")
    .replace(/\b(the )?provided method\b/gi, "this approach")
    // LOCALE_US (a rule explicitly labeled as British keeps its own term)
    .replace(/\b(the|your) boot\b/g, "$1 trunk")
    // "motorway" is no longer rewritten: it only appears when a UK rule is quoted, and "highway" changed that rule's meaning
    .replace(/\bwheel brace\b/gi, "lug wrench")
    .replace(/\blocking[- ]wheel[- ]nut key\b/gi, "wheel-lock key")
    // SOURCE_LABEL: the publish gate blocks "Source: [x](url)" inside prose
    .replace(/\[\s*Sources?:\s*([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gi, "[$1]($2)")
    .replace(/\bSources?:\s*(?=\[[^\]]+\]\(https?:\/\/)/gi, "");
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const ARTICLE_SYSTEM_PROMPT = `You are an expert SEO content writer. Follow ALL rules strictly:

FORMATTING:
- Use markdown tables for comparisons, scorecards, diagnostics — ALWAYS include header + separator rows. CRITICAL: every row on its OWN LINE with a real newline. Example:
| Column A | Column B | Column C |
|---|---|---|
| value 1 | value 2 | value 3 |
NEVER put multiple rows on one line. NEVER use \n literally — use actual line breaks.
- Use **bold** sparingly for key terms only

CONTENT RULES:
1. NAMED FRAMEWORK — introduce AT MOST ONE named framework for the ENTIRE article. First or second section only. All other sections use plain language — no new acronyms, no new named models.

2. NUMBERS & CONCRETENESS: Do NOT invent statistics, but DO be concrete. Name real tools, platforms, companies and specific tactics by name (the exact product, model, standard, organization, law, method or tool relevant to THIS topic) instead of vague placeholders like "a software company" or "a popular tool". When a number genuinely comes from a source in your SOURCES list, cite it inline. Always prefer a precise, concrete statement over a hedged generality. BUT a specific measurement, test result, count, price or outcome must come from a SOURCES item or be clearly framed as hypothetical ("for example, imagine a store that..."). Never present an invented number as a real test or a real result.

3. NO REPETITION: every definition, caveat, warning, example and recommendation appears in exactly ONE place in the whole article. The full text written so far is given to you below. Read it first and never restate, paraphrase or echo anything already said there. Do not end a section with a generic disclaimer or a summary of earlier points. Cite any single source at most twice. MEASURABLE_CRITERIA: when a source gives a concrete, checkable benchmark (a time, ratio, amount, threshold), include it as a typical benchmark with its condition; never replace it with vague wording like does not need to. Inventing figures is forbidden, omitting sourced figures is also a failure. NO_META_REFERENCE: never refer to other parts of the text with words like established, already provided, previously stated, this method, the provided method, as noted above; restate the concrete value itself (write 'at 68-70°F', not 'under the established conditions'). VOLUME_MEASURES: volume conversions of weighed ingredients are approximate; label them approximate and never convert a dense or variable mass (starter, dough, paste, soil) to cups or spoons, tell the reader to weigh it. LOCALE: write in US English with US terms (trunk, lug wrench, highway, feet/miles/°F first) and US norms; leave out rules, distances and legal requirements that apply only to another country (UK, EU, CA); if one is essential, name the country and keep its own terms. Limits printed on a product (speed, distance, pressure) must be framed as check the label or manual, with a common figure only as a typical example and stated once in the whole article. YMYL_ACCURACY: for money, credit, health, legal or safety topics never merge two different concepts into one claim (for example a credit freeze does not affect or remove a credit score; a thin file can lack a score); if unsure a cause-effect claim is true, leave it out. FREE_RIGHTS_FIRST: when a paid product or service is discussed, state the free official or legal alternatives the reader is entitled to (for example free credit reports, free freezes, free government tools) before paid options. UNREADY_MATERIAL: never suggest keeping, eating, using or applying material from a stage that has not met its readiness or safety criteria (for example discard from a young starter, an untested repair, an unverified setting). CONSISTENCY & SAFETY: quantities, ratios, timings and schedules already stated in ARTICLE SO FAR are binding; reuse them and never introduce a conflicting method. For food, health, money or physical-safety advice give only the conservative option a source supports; when unsure, tell the reader to discard or wait, never to use. Never write in first person (I, my). PLATFORM-SPECIFIC: when a claim describes how one product, platform, crawler or system works (Google, ChatGPT, Bing, a specific tool or law), name that system and never generalize it to all systems. INTERPRETATION: advice not backed by a listed source is framed as practical judgment (in practice, as a rule of thumb), never as established fact or what all experts agree; never tag sentences with stock labels such as a useful decision rule, a practical edge case or a practical approach, just state the advice. CITE PRECISELY: link a source to a specific number, time or quantity only if that source states that exact figure for that exact step; otherwise state it without a link. VARY ATTRIBUTION: never reuse the same lead-in (for example a source name plus guidance says) in more than one section; state the claim and put the link on it in the whole article, and never restate the same guideline or claim twice (e.g. "Google emphasizes people-first content"): if it was already made, build on it instead.

4. Do NOT repeat concepts, examples, or recommendations already covered in previous sections.

5. Do NOT use [Illustrative] labels. If you cannot cite a real source for a number, describe it qualitatively instead.

6. SOURCING (REQUIRED): Attach a verifiable source to AT LEAST 3 of your most important factual or trend claims, spread across different sections (never clustered). PREFER the real URLs provided in the section SOURCES list: cite them inline as markdown links, e.g. [Search Engine Land](https://example.com/page), using ONLY URLs copied verbatim from that list. If no listed source fits a claim, you MAY fall back to a publisher + year attribution for a well-known organization, e.g. (Google, 2025) — but NEVER invent a URL, article title, report name, or statistic. Attach sources to specific platform behaviors, market shifts, or trends, not to generic advice.

7. ORIGINAL ANGLE: At least one section must deliver a concrete, non-obvious insight (a specific tradeoff, a counterintuitive consequence, or an explicit decision rule) rather than restating common knowledge. The reader should learn something they could not guess from the heading alone.

8. ANSWER FIRST: Open EVERY section with 1-2 sentences that directly answer the question its heading implies — a committed, specific answer, not a definition of the topic or a warm-up preamble. Support, nuance and caveats come AFTER the answer. A reader who skims only the first sentence of each section must still get the real answer.

9. VOICE — NOT GREY: Write with a clear point of view and concrete detail. Do NOT lean on "may", "can", "could", "generally", "broadly", "typically", "often" as a crutch — state what IS true, then name the specific exception. Vary sentence length. Use active voice and concrete nouns. Every section needs at least one nameable specific: a real tool, a named scenario, a cited number, or a named company/feature. No corporate filler; never write "it depends" without saying exactly what it depends on.

10. FACTS vs RECOMMENDATIONS: Keep three things separate: (a) facts documented by a primary source: the organization, vendor, regulator or standard responsible (cite the OFFICIAL source link), (b) observed practitioner behavior (attribute it: "in practice", "SEO practitioners report", or a COMPETITOR source link), and (c) your own recommendation. Never present a recommendation as a confirmed ranking factor, and never promise rankings, citations or AI Overview inclusion. Do not describe how a specific product, platform or system works internally unless an OFFICIAL source in your list says so.

11. STRUCTURE: When a section covers 3+ distinct points or runs past ~250 words, split it under 2-3 specific ### subheadings (e.g. "### Fixing Crawl Errors First", never "### Overview"). Never repeat the section's own heading.

12. RESEARCH HONESTY: Only refer to what "top-ranking pages", "competitors" or "most guides" say when the RESEARCH BRIEF actually lists their sections. Never claim research that was not provided to you.

13. ATTRIBUTION STYLE: put each link on the exact claim it supports, inside the sentence that states that claim (e.g. "Chock the wheel diagonally opposite the flat ([Publisher](url))"). Never write a sentence whose only job is to name sources ("This list matches guidance from X", "This sequence reflects X and Y"), and never write the label "Source:". Prefer OFFICIAL sources for rules, limits, safety and how a system works; use COMPETITOR pages only for practical how-to detail. Prefer a source marked (not cited yet) over one already cited.

14. QUOTABLE STATEMENTS: write key facts so a single sentence stands on its own when quoted out of context: name the subject, the condition and the value in the same sentence, never "it" or "this" pointing to an earlier sentence.

15. FEASIBILITY: every instruction must be doable with what the article tells the reader to have at that moment. If a step needs a measurement or tool (a gauge, a torque or temperature value, a scale, an account or permission), the tools list names it; if it may be missing, say exactly what to do without it, using the conservative option the sources support. A fallback must never depend on the thing it replaces (for example "get it checked before you go" when going there is the only way to get it checked).

16. SAFETY MARGIN: a fallback for a missing tool or measurement never lowers the safety margin: never tighten less, inflate less, lift higher, or skip or postpone a safety check. Give the firmest conservative action the sources support with what the reader has at that moment (for example tighten the lug nuts as firmly as the supplied lug wrench allows, in the star pattern) plus the soonest professional check (for example have them torqued at the nearest tire shop).

17. MANUAL REFERENCES: send the reader to the manual, label or provider only for values that really differ by model or product (lifting points, torque, pressure, speed or distance limits, fluid types), never for universal safety actions (where to stop, hazard lights, chocking a wheel). Call each document by one name throughout the article (for example always "owner's manual").

18. FIRST-HAND CLAIMS: never claim to have tested, tried, measured, bought or used anything (we tested, our team, in our experience, hands-on); report what the sources found instead, with the link.`;

function fixDuplicateTableRows(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let i = 0;
  const isSepRow = (l: string) => /^\|[\s\-:|]+\|$/.test(l.trim().replace(/\s+/g, ""));
  while (i < lines.length) {
    if (lines[i].trimStart().startsWith("|")) {
      const blkStart = i;
      while (i < lines.length && lines[i].trimStart().startsWith("|")) i++;
      const blk = lines.slice(blkStart, i);
      const seps = blk.map((l, j) => (isSepRow(l) ? j : -1)).filter((j) => j >= 0);
      if (seps.length >= 2) {
        const sp1 = seps[0], sp2 = seps[1];
        const rows1 = blk.slice(sp1 + 1, sp2).map((l) => l.trim());
        const rows2 = blk.slice(sp2 + 1).map((l) => l.trim());
        const isDupe = rows2.length > 0 && rows2.every((r) => rows1.includes(r));
        out.push(...(isDupe ? blk.slice(0, sp2) : blk));
      } else {
        out.push(...blk);
      }
    } else {
      out.push(lines[i++]);
    }
  }
  return out.join("\n");
}

async function generateSection(
  client: OpenAI,
  keyword: string,
  sectionHeading: string,
  keyPoints: string[],
  articleContext: string,
  coveredTopics: string[],
  targetWords: number,
  sources: string = "",
  research: string = "",
  plan: string = "",
  format: string = ""
): Promise<string> {
  const covered = coveredTopics.length > 0
    ? `\nPREVIOUS SECTIONS ALREADY COVERED: ${coveredTopics.join(" | ")}\nDo NOT repeat these concepts.`
    : "";

  // PROMPT_CACHE: everything that is the same for every section (format, plan, research brief) comes FIRST, so the
  // provider's automatic prompt cache bills it at the cached rate from the second section on; the per-section task
  // (heading, key points, article so far, sources) comes last. Same content as before, only the order changed.
  const prompt = `${format ? `${format}\n` : ""}${plan ? `\nPROCEDURE PLAN (validated and binding for every section: the same steps in the same order, the same tools, quantities, timings, criteria, fallbacks and stop rules; never reorder steps, never invent a different fallback; never cite plan step numbers such as "Step 3" in prose (the reader never sees the plan): name the action itself, and later sections do not repeat a step another section already explains):\n${plan}\n` : ""}${research ? `\nRESEARCH BRIEF (what searchers ask and what top-ranking pages cover — answer it better than they do; never copy their wording):\n${research}\n` : ""}
=== YOUR TASK ===
You are writing the "${sectionHeading}" section of an SEO article about "${keyword}".

Target length: about ${targetWords} words (never more than ${Math.round(targetWords * 1.4)}; cut restatement before cutting facts)
Key points to cover:
${keyPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}
${covered}

Article context so far:
${articleContext}
${sources ? `\nSOURCES YOU MAY CITE (verified real URLs — cite a claim as a markdown link [publisher](url) using ONLY these URLs, copied exactly; use OFFICIAL sources for any claim about how a product, platform, law, standard or system works; cite a source only for a claim its title or description actually covers; the description is only for choosing a source, never restate it as a claim, and never cite the same source for the same point twice; NEVER invent a URL or cite anything not listed):\n${sources}\n` : ""}
Write ONLY the body text for this section (no heading). Be specific, helpful, and avoid filler.`;

  log("article-writer", "SECTION_PROMPT_SENT", {
    heading: sectionHeading,
    targetWords,
    keyPointsCount: keyPoints.length,
  });

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_CONTENT_MODEL ?? "gpt-4o",
    messages: [
      { role: "system", content: ARTICLE_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    max_completion_tokens: 8192,
  });

  let text = cleanSectionText(completion.choices[0]?.message?.content ?? ""); // CJK_STRIP META_STRIP LOCALE_US
  try { // SECTION_FACTCHECK
    const fc = await client.chat.completions.create({
      model: process.env.OPENAI_CONTENT_MODEL ?? "gpt-4o",
      messages: [{ role: "user", content: `You are a strict fact checker for a published article section. Fix ONLY: (a) claims that are false; (b) absolute claims that are not universally true (never, always, cannot, guarantees) - make them accurate and scoped; (c) two different concepts merged into one claim; (d) steps in the wrong order or missing a safety-critical stage; (e) region-specific rules presented as universal. Do not add new facts, numbers, sources or sections. Keep every heading, table, markdown link and the length. If nothing is wrong, return the text unchanged. Return ONLY the section text.${plan ? `\n\nVALIDATED PROCEDURE PLAN (its step order, tools and fallbacks are correct: never reorder steps against it or replace its fallbacks):\n${plan}` : ""}\n\nSECTION:\n${text}` }],
      max_completion_tokens: 4096,
    });
    const fixed = cleanSectionText((fc.choices[0]?.message?.content ?? "").trim()); // the checker can reintroduce UK terms or meta phrases
    const h = (t: string) => (t.match(/^###/gm) ?? []).length, l = (t: string) => (t.match(/\]\(http/g) ?? []).length;
    const ok = fixed && h(fixed) === h(text) && l(fixed) >= l(text) - 1 && countWords(fixed) > countWords(text) * 0.85 && countWords(fixed) < countWords(text) * 1.15;
    log("article-writer", "SECTION_FACTCHECK", { heading: sectionHeading, changed: !!fixed && fixed !== text.trim(), accepted: !!ok });
    if (ok) text = fixed;
  } catch (e) { log("article-writer", "SECTION_FACTCHECK_FAILED", { error: String(e) }); }
  const words = countWords(text);

  log("article-writer", "SECTION_RAW", {
    heading: sectionHeading,
    lineCount: text.split(String.fromCharCode(10)).length,
    raw: text,
  });

  log("article-writer", "SECTION_GENERATED", {
    heading: sectionHeading,
    wordsGenerated: words,
    targetWords,
    delta: words - targetWords,
    tokensUsed: completion.usage?.total_tokens,
  });

  const leadHeading = text.match(/^\s*#{1,6}\s+(.+?)\s*(?:\r?\n)+/);
  const normHeading = (x: string) => x.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const noLeadHeading = leadHeading && normHeading(leadHeading[1]) === normHeading(sectionHeading)
    ? text.slice(leadHeading[0].length)
    : text;
  const linkMap: string[] = [];
  const protectLinks = (t: string) => t.replace(/\]\((https?:\/\/[^)\s]+)\)/g, (_m, url: string) => { linkMap.push(url); return `](#src${linkMap.length - 1})`; });
  const restoreLinks = (t: string) => t.replace(/\]\(#src(\d+)\)/g, (_m, i: string) => `](${linkMap[Number(i)]})`);
  const contextNoUrls = articleContext.replace(/\]\((https?:\/\/[^)\s]+)\)/g, "]");
  const dedupedRaw = removeRepeatedSentences(fixDuplicateTableRows(protectLinks(noLeadHeading)), contextNoUrls);
  const deduped = { ...dedupedRaw, text: restoreLinks(dedupedRaw.text) };
  if (deduped.removed.length > 0) {
    log("article-writer", "DEDUPE_REMOVED", {
      heading: sectionHeading,
      applied: deduped.applied,
      count: deduped.removed.length,
      removed: deduped.removed,
    });
  }

  return deduped.text;
}

export async function writeArticle(
  brief: ArticleBrief,
  openAiKey: string
): Promise<GeneratedArticle> {
  const client = tracked(new OpenAI({ maxRetries: 5, timeout: 180000,  apiKey: openAiKey }));
  const { primaryKeyword, template, serpAnalysis, outline, targetWordCount } = brief;
  const keyword = primaryKeyword.keyword;
  // FORMAT_CONTRACT: the deliverable of this template reaches every section prompt (it used to stop at templates.ts)
  const contract = formatContract(template.category);
  const format = formatBlock(contract);

  log("article-writer", "START", {
    keyword,
    category: template.category,
    targetWordCount,
    sectionsCount: outline.length,
    serpAvgWordCount: serpAnalysis.consensus.avgWordCount,
    mustCoverTopics: serpAnalysis.consensus.mustCoverTopics,
  });

  log("article-writer", "GENERATING_H1_META", { keyword });
  const h1Meta = await client.chat.completions.create({
    model: process.env.OPENAI_CONTENT_MODEL ?? "gpt-4o",
    messages: [{
      role: "user",
      content: `Create H1 and meta description for an article about "${keyword}".
Top competitor titles:
${serpAnalysis.topResults.slice(0, 5).map((r, i) => `${i + 1}. ${r.title}`).join("\n")}
Requirements:
- H1: includes keyword naturally, 50-65 chars
- H1 must describe what the article actually covers (its sections: ${outline.map((s) => s.h2).join(", ")}). Never promise predictions, statistics, case studies or expert quotes the article does not contain
- Meta: 145-155 chars, includes keyword
- Format: ${contract.label}${contract.h1 ? ` (typical H1 pattern: ${contract.h1})` : ""}
Respond in JSON: {"h1": "...", "meta": "..."}`
    }],
    response_format: { type: "json_object" },
  });

  const h1MetaData = JSON.parse(h1Meta.choices[0]?.message?.content ?? "{}") as { h1: string; meta: string };
  log("article-writer", "H1_META_GENERATED", {
    h1: h1MetaData.h1,
    h1Length: h1MetaData.h1?.length,
    meta: h1MetaData.meta,
    metaLength: h1MetaData.meta?.length,
  });

  const sections: GeneratedArticle["sections"] = [];
  const wordsPerSection = Math.round(targetWordCount / outline.length);
  const officialSources = pickAuthoritativeSources(keyword, outline.map((s) => s.h2), 6);
  const excerptUrls = new Set((serpAnalysis.pageStructures ?? []).filter((p) => (p.excerpt ?? "").length > 300).map((p) => normUrl(p.url)));
  const serpSources = serpAnalysis.topResults
    .filter((r) => r.url && /^https?:\/\//.test(r.url) && !/google\.[a-z.]+\/(goto|url|aclk)/i.test(r.url) && !/\/(search|imgres)\?/i.test(r.url) && !/youtube\.com|youtu\.be|reddit\.com|quora\.com|linkedin\.com|medium\.com|facebook\.com|tiktok\.com|instagram\.com/i.test(r.url))
    // pages whose text the writer actually has come first: their facts can be cited precisely
    .sort((a, b) => Number(excerptUrls.has(normUrl(b.url))) - Number(excerptUrls.has(normUrl(a.url))))
    .slice(0, 8);
  const poolSeen = new Set<string>();
  const sourcePool: SourceItem[] = [
    ...(serpAnalysis.authoritySources ?? []).map((r) => ({ title: r.title, url: r.url, kind: "OFFICIAL" as const, about: r.description ?? "" })),
    ...officialSources.map((s) => ({ title: s.title, url: s.url, kind: "OFFICIAL" as const, about: "" })),
    ...serpSources.map((r) => ({ title: r.title, url: r.url, kind: (/\.(gov|edu)$/i.test((() => { try { return new URL(r.url).hostname; } catch { return ""; } })()) ? "OFFICIAL" : "COMPETITOR") as "OFFICIAL" | "COMPETITOR", about: r.description ?? "" })),
  ].filter((s) => { const k = normUrl(s.url); if (!s.url || poolSeen.has(k)) return false; poolSeen.add(k); return true; });
  // CITATION_BUDGET: a source already cited twice is hidden from later sections, so citations spread across sources
  const citationUses = (text: string) => {
    const uses: Record<string, number> = {};
    for (const m of text.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)) uses[normUrl(m[1])] = (uses[normUrl(m[1])] ?? 0) + 1;
    return uses;
  };
  const formatSources = (uses: Record<string, number> = {}) => sourcePool
    .filter((s) => (uses[normUrl(s.url)] ?? 0) < 2)
    .map((s, i) => `[${i + 1}] (${s.kind}${uses[normUrl(s.url)] ? "" : ", not cited yet"}) ${s.title} — ${s.url}${s.about ? ` — about: ${s.about.slice(0, 160)}` : ""}`)
    .join("\n");
  const citeSources = formatSources();
  log("article-writer", "CITE_SOURCES", { authority: (serpAnalysis.authoritySources ?? []).length, officialDocs: officialSources.length, serp: serpSources.length, pool: sourcePool.length });
  const competitorH2s = Array.from(new Set(serpAnalysis.pageStructures.flatMap((p) => p.h2s))).slice(0, 25);
  let researchBrief = [
    filterRelevantSearches(brief.relatedKeywords, keyword).length ? `Related searches people use: ${filterRelevantSearches(brief.relatedKeywords, keyword).join(", ")}` : "",
    brief.questions?.length ? `Real user questions: ${brief.questions.join(" | ")}` : "",
    competitorH2s.length ? `Sections the top-ranking pages have: ${competitorH2s.join(" | ")}` : "NOTE: no competitor pages could be analyzed this run. Do NOT claim what top-ranking pages or competitors say.",
    (() => { const ex = serpAnalysis.pageStructures.filter((p) => (p.excerpt ?? "").length > 300 && !/quora\.com|reddit\.com|forum\./i.test(p.url)).slice(0, 5).map((p) => `[${p.url}]\n${(p.excerpt ?? "").slice(0, 1500)}`); return ex.length ? `SOURCE EXCERPTS (real text from top-ranking pages; base steps, facts, numbers and placements on these, prefer them over memory, and cite the page URL when you use a specific fact):\n${ex.join("\n\n")}` : ""; })(),
    (() => { const ex = (serpAnalysis.authorityExcerpts ?? []).map((x) => `[${x.url}] ${x.title}\n${x.excerpt.slice(0, 1500)}`); return ex.length ? `OFFICIAL SOURCE EXCERPTS (primary sources: when they state a rule, limit, safety step or definition, follow them over competitor pages and cite that official URL on the claim):\n${ex.join("\n\n")}` : ""; })(),
  ].filter(Boolean).join("\n");
  try { // SEMANTIC_CONSENSUS
    const pages = (((serpAnalysis as any).pageStructures ?? []) as any[]).filter((p: any) => (p.excerpt ?? "").length > 300 && !/quora\.com|reddit\.com|forum\.|youtube\.com/i.test(String(p.url))).slice(0, 8);
    if (pages.length >= 2) {
      const dom = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
      const input = pages.map((p: any) => `[${dom(String(p.url))}]\nH2: ${((p.h2s ?? []) as string[]).join(" | ")}\n${String(p.excerpt ?? "").slice(0, 2500)}`).join("\n\n");
      const cRes = await client.chat.completions.create({
        model: process.env.OPENAI_CONTENT_MODEL ?? "gpt-4o",
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: `Extract the substantive points these top-ranking pages cover for "${keyword}": steps (keep their order), facts, numbers with their conditions, warnings, decision rules and questions answered. Merge points that mean the same thing even when worded differently. Ignore navigation, cookie or privacy banners, ads, author bios and course or product promotions. For each point return: text (one sentence, US English, keep any number together with its condition), type (step|fact|number|warning|question), domains (the bracketed domains that state it). CONSENSUS_SCOPE: popularity is not proof. Drop improvised or unsafe substitutes (bricks, rocks, wood, guessed lifting points, household tools) and region-specific legal rules. If a point depends on the model, product, vehicle, location or law, rewrite it as: check it with whoever sets it (the manual or label for a product, the local code office for building rules, the provider for prices), with the common value only as a typical example. Return JSON {"points":[...]} with at most 25 points.\n\n${input}` }],
        max_completion_tokens: 4096,
      });
      const parsed = JSON.parse(cRes.choices[0]?.message?.content ?? "{}");
      const points = (Array.isArray(parsed.points) ? parsed.points : []).filter((x: any) => x && typeof x.text === "string" && Array.isArray(x.domains));
      const n = (x: any) => new Set(x.domains).size;
      const consensus = points.filter((x: any) => n(x) >= 2).sort((a: any, b: any) => n(b) - n(a));
      const gains = points.filter((x: any) => n(x) === 1).slice(0, 8);
      // RESEARCH_AUDIT: which analyzed pages fed the consensus, which did not and why, with Google positions
      const allPages = serpAnalysis.pageStructures ?? [];
      const included = allPages.filter((p) => pages.includes(p)).map((p) => ({ url: p.url, position: p.position ?? null }));
      const excluded = allPages.filter((p) => !pages.includes(p)).map((p) => ({ url: p.url, position: p.position ?? null, reason: (p.excerpt ?? "").length <= 300 ? `main text not extracted (${(p.excerpt ?? "").length} chars)` : /quora\.com|reddit\.com|forum\.|youtube\.com/i.test(p.url) ? "forum or video page" : "over the 8-page limit" }));
      log("article-writer", "SEMANTIC_CONSENSUS", { pages: pages.length, points: points.length, consensus: consensus.length, unique: gains.length, top: consensus.slice(0, 8).map((x: any) => `${n(x)}x ${x.text}`), included, excluded, points_detail: points.map((x: any) => ({ text: x.text, type: x.type, domains: Array.from(new Set(x.domains)) })) });
      if (consensus.length) researchBrief += `\n\nSERP CONSENSUS (points several top pages agree on; cover every one in its most relevant section, keep numbers with their conditions, never cover a point twice):\n${consensus.map((x: any) => `- (${n(x)} sites) ${x.text}`).join("\n")}`;
      if (gains.length) researchBrief += `\n\nCOMPETITOR UNIQUE POINTS (only one page covers these; use the useful ones for extra value, only if consistent with the consensus):\n${gains.map((x: any) => `- [${x.domains[0]}] ${x.text}`).join("\n")}`;
    }
  } catch (e) { log("article-writer", "SEMANTIC_CONSENSUS_FAILED", { error: String(e) }); }
  let procedurePlan = "";
  let planTools: string[] = [];
  if ((/how-to|tutorial|recipe/.test(String(template.category)) && /^(how (to|do i|do you|can i)|steps? to|ways to)\b|\b(recipe|diy|tutorial|step[- ]by[- ]step)\b/i.test(keyword)) || template.category === "troubleshooting") { // PROC_KEYWORD (+ diagnosis procedures)
    try {
      const planRes = await client.chat.completions.create({
        model: process.env.OPENAI_CONTENT_MODEL ?? "gpt-4o",
        messages: [{ role: "user", content: `Create ONE consistent procedure plan for "${keyword}" that a whole article will follow. Base it on what the reliable sources and top-ranking pages agree on.\n${researchBrief}\nSOURCES:\n${citeSources}\n\nOutput plain markdown, max 260 words: 1) tools and ingredients as a bulleted list, one item per line (exact quantities only where the task measures amounts, e.g. food, chemicals, money; never count single tools or documents), naming every tool, gauge or measuring instrument any step uses and marking each one the reader may not have as (if available) with its safe fallback; 2) a schedule table (Day or Step | Action | Amount | What to look for); 3) readiness / success criteria; 4) safety stop rules (when to discard, wait or stop). Choose ONE method and never offer alternative schedules. SAFE_STATE_FIRST: make the object safe (engine or power off, parking brake or lock on, area secured) before any step where the person leaves the controls, opens compartments, fetches tools or handles parts. The tools list must give exactly the amounts the table uses (Day 1 amounts and per-feeding amounts separately). Write timings and thresholds as typical ranges (typically, usually) unless a source states them as a firm rule; hard discard/stop rules are only for clear spoilage or safety signs. Be conservative on safety.` }],
        max_completion_tokens: 4096,
      });
      let plan = (planRes.choices[0]?.message?.content ?? "").trim();
      if (plan) {
        const checkRes = await client.chat.completions.create({
          model: process.env.OPENAI_CONTENT_MODEL ?? "gpt-4o",
          messages: [{ role: "user", content: `You are a fact checker. Check this procedure plan for "${keyword}" and return ONLY the corrected plan in the same markdown format.\nCheck: (1) every quantity in the tools/ingredients list matches the table exactly, same units; (2) no step contradicts another step or the readiness criteria; (3) any fixed day or time used as a discard/stop deadline is rewritten as a typical range unless the SOURCES state it as a firm rule; (4) hard discard rules remain only for clear spoilage or safety signs; (5) nothing conflicts with the SOURCES; (6) NO_ACTIVITY_BRANCH: every conditional step (do X when Y happens) also says what to do if Y does not happen; give a default interval ONLY when waiting/repeating is a natural part of the process (feeding, drying, curing, waiting periods); for safety stop conditions the fallback is stop and get qualified help, never an invented wait time; (7) any permission to keep, store, reuse, eat, apply or proceed is allowed only once the safety/readiness criteria are met; remove permissions for unready or unverified material; (8) SEQUENCE_FROM_SOURCES: compare the step order with the source procedures; when sources split an action into stages (for example partially lower, tighten, fully lower, remove the jack), keep every stage in that order and never merge them. EQUIPMENT_CONSISTENCY: every tool or instrument used in any step must appear in the tools list; if it is optional, mark it if available and give the safe fallback when it is missing. CONCRETE_DEFAULTS: when sources give a concrete default (where to place something, which side, which direction), state that default and mention the manual only as an override. NO_ABSOLUTE_WARNINGS: do not turn a single indicator (a warning light, a smell, one reading) into an automatic stop rule unless a source says so; say what to check first. NO_INVENTED_PRECISION: do NOT add numbers, durations, distances, heights, tools or mandatory requirements that are not in the original plan or the SOURCES; write model-specific values as per the manufacturer or owner's manual; label extra tools beyond the standard kit as optional; (9) OPTIONAL_NOT_BLOCKING: an optional tool must never be a condition for continuing or finishing; give the fallback instead (for example have it checked by a professional soon); (10) PLACEMENT: any where/which/position instruction must state the exact position or side the sources give, otherwise write as shown in the owner's manual; (11) do not drop any standard preparatory safety step that the sources include; (12) FEASIBLE_FALLBACKS: every measurement or tool a step requires (a torque value, a pressure, a temperature, a weight) is in the tools list or the step says what to do without it; a fallback must be executable with what the reader has at that moment and must not depend on the thing it replaces; when the sources give the fallback (for example tighten firmly now and have the value checked by a professional as soon as possible), use it; (13) SAFE_STATE_FIRST: the step that makes the object safe (engine or power off, parking brake or lock on) comes before any step where the person leaves the controls, opens compartments, fetches tools or handles parts; (14) SAFETY_MARGIN: a fallback for a missing tool or measurement never lowers the safety margin (never tighten less, inflate less or skip or postpone a check); use the firmest conservative action the sources support plus the soonest professional check.\n${researchBrief}\nSOURCES:\n${citeSources}\n\nPLAN:\n${plan}` /* VALIDATOR_BRIEF */ }],
          max_completion_tokens: 4096,
        });
        const checked = (checkRes.choices[0]?.message?.content ?? "").trim();
        log("article-writer", "PROCEDURE_PLAN_VALIDATED", { changed: !!checked && checked !== plan, wordsBefore: countWords(plan), wordsAfter: countWords(checked) });
        if (checked && countWords(checked) > countWords(plan) * 0.5) plan = checked;
        try { // STAGE_AUDIT
          const auditRes = await client.chat.completions.create({
            model: process.env.OPENAI_CONTENT_MODEL ?? "gpt-4o",
            messages: [{ role: "user", content: `Step audit for "${keyword}". First, silently list every distinct action stage that the SOURCE EXCERPTS below describe, in their order. Then compare with the PLAN. Insert any stage the plan skips or merges (keep source order), add every tool a step uses to the tools list (mark optional ones if available, with a fallback), and replace vague placements with the concrete position the excerpts give. Never delete, merge or shorten any existing step of the PLAN; you may only insert missing stages and fix tools or placements. The excerpts are truncated, so a step missing from them is NOT a reason to remove it. Never invent numbers or tools not in the excerpts. Write US English. Return ONLY the full corrected plan in the same markdown format.\n${researchBrief}\n\nPLAN:\n${plan}` }],
            max_completion_tokens: 4096,
          });
          const audited = (auditRes.choices[0]?.message?.content ?? "").trim();
          log("article-writer", "STAGE_AUDIT", { changed: !!audited && audited !== plan, wordsBefore: countWords(plan), wordsAfter: countWords(audited) });
          const rows = (t: string) => (t.match(/^\|\s*\d+\s*\|/gm) ?? []).length; /* AUDIT_NO_DROP */
          if (audited && rows(audited) >= rows(plan) && countWords(audited) > countWords(plan) * 0.7) plan = audited; else log("article-writer", "STAGE_AUDIT_REJECTED", { rowsBefore: rows(plan), rowsAfter: rows(audited) });
        } catch (e) { log("article-writer", "STAGE_AUDIT_FAILED", { error: String(e) }); }
        try { // PLAN_ORDER: code-checked dependencies (tool fetched before use, condition created before needed)
          const first = await checkProcedureOrder(client, keyword, plan, "plan");
          const blocking = (v: typeof first.violations) => v.filter((x) => x.kind !== "DUPLICATE_STEP").length;
          if (first.violations.length) {
            const fixRes = await client.chat.completions.create({
              model: process.env.OPENAI_CONTENT_MODEL ?? "gpt-4o",
              messages: [{ role: "user", content: `Fix the ORDER of this procedure plan for "${keyword}". A dependency check found:\n${first.violations.map((v) => `- ${v.message}`).join("\n")}\nMove or split steps so every tool is taken out before it is used and every condition exists before a step needs it; merge steps that repeat the same action. Never delete a safety step and never add numbers, tools or requirements. Return ONLY the full corrected plan in the same markdown format.\n\nPLAN:\n${plan}` }],
              max_completion_tokens: 6000,
            });
            const fixed = (fixRes.choices[0]?.message?.content ?? "").trim();
            const tableRows = (t: string) => (t.match(/^\|\s*\d+\s*\|/gm) ?? []).length;
            if (fixed && tableRows(fixed) >= tableRows(plan) - 2) {
              const second = await checkProcedureOrder(client, keyword, fixed, "plan");
              const better = blocking(second.violations) < blocking(first.violations) || (blocking(second.violations) === blocking(first.violations) && second.violations.length < first.violations.length);
              if (better) plan = fixed;
              log("article-writer", "PROCEDURE_ORDER_FIXED", { before: first.violations.map((v) => v.message), after: second.violations.map((v) => v.message), kept: better });
            }
          }
        } catch (e) { log("article-writer", "PROCEDURE_ORDER_FAILED", { error: String(e) }); }
      }
      if (plan) {
        // PLAN_BINDING: the plan travels as its own prompt block (not at the end of a long brief, where checks truncate it)
        procedurePlan = plan;
        planTools = extractPlanTools(plan);
        log("article-writer", "PROCEDURE_PLAN", { words: countWords(plan), plan, tools: planTools });
      }
    } catch (e) {
      log("article-writer", "PROCEDURE_PLAN_FAILED", { error: String(e) });
    }
  }
  let articleContext = `Title: ${h1MetaData.h1}\nKeyword: ${keyword}\n`;
  const coveredTopics: string[] = [];
  // PLAN_TOOLS: the section that lists equipment (or the first section) must name every tool of the plan
  const toolsIdx = planTools.length ? Math.max(0, toolsSectionIndex(outline.map((s) => s.h2))) : -1;
  if (toolsIdx >= 0) log("article-writer", "PLAN_TOOLS", { section: outline[toolsIdx]?.h2, tools: planTools });
  let lastContentIdx = -1;
  outline.forEach((s, k) => { if (!/faq|frequently asked/i.test(s.h2)) lastContentIdx = k; });
  log("article-writer", "FORMAT_CONTRACT", { category: contract.category, first: outline[0]?.h2, last: outline[lastContentIdx]?.h2 });

  for (let i = 0; i < outline.length; i++) {
    const section = outline[i];
    log("article-writer", "SECTION_START", {
      index: i + 1,
      total: outline.length,
      heading: section.h2,
      h3Count: section.h3s.length,
      keyPoints: section.keyPoints,
    });

    try {
      const h3Budget = section.h3s.length * Math.round(wordsPerSection * 0.35);
      const h2Budget = Math.max(120, Math.round((wordsPerSection - h3Budget) * 0.8)); // model overshoots ~30%
      let keyPoints = section.keyPoints;
      if (procedurePlan && i === 0 && template.category !== "troubleshooting") keyPoints = [...keyPoints, "PLAN_ORDER: present the steps as one numbered table in exactly the PROCEDURE PLAN order; you may shorten the wording, but never reorder, merge or drop a step"];
      else if (contract.first && i === 0) keyPoints = [...keyPoints, contract.first];
      if (contract.last && i === lastContentIdx && i > 0) keyPoints = [...keyPoints, contract.last];
      if (i === toolsIdx) keyPoints = [...keyPoints, `PLAN_TOOLS: this section is where the article lists equipment. Name every item of the PROCEDURE PLAN tools list in one list: ${planTools.join("; ")}. Keep each (if available) mark and state that item's fallback once, as the plan gives it`];
      if (/faq|frequently asked/i.test(section.h2)) {
        // FAQ_SELECT: choose questions against the article as actually written, so the FAQ is never a duplicate of it
        const selected = await selectFaqQuestions(client, keyword, articleContext, brief.faqCandidates ?? brief.questions ?? [], filterRelevantSearches(brief.relatedKeywords, keyword));
        if (selected.length >= 3) {
          keyPoints = [
            `Use exactly these questions as the ### H3 headings, in this order: ${selected.join(" | ")}`,
            "Start IMMEDIATELY with the first '### Question?' line (no intro paragraph); every answer sits under its own ### heading",
            "Answer each in 3-4 sentences: the first sentence is the direct answer (yes/no, the specific action, or the value with its condition), then the condition or exception that changes the answer and one practical detail not stated elsewhere in the article",
            "Never invent prices, distances, times or statistics; when the answer depends on region, product, provider or model, say exactly what it depends on and where the reader checks it",
            "Each answer must add NEW information: do not repeat explanations, examples or sources already used in earlier sections",
          ];
        }
      }
      const uses = citationUses(articleContext);
      const internal = (brief.internalLinks ?? []).filter((l) => l.url && !articleContext.includes(`](${l.url})`));
      const internalUsed = (brief.internalLinks ?? []).length - internal.length;
      const sectionSources = formatSources(uses) + (internal.length && internalUsed < 3
        ? `\n\nINTERNAL LINKS (same site; link at most ONE per section with its anchor text, only where it fits the sentence naturally):\n${internal.slice(0, 6).map((l) => `- [${l.anchor}](${l.url}) — ${l.topic}`).join("\n")}`
        : "");
      const content = await generateSection(
        client, keyword, section.h2, keyPoints,
        articleContext, coveredTopics, h2Budget, sectionSources, researchBrief, procedurePlan, format
      );
      sections.push({ heading: section.h2, level: 2, content, wordCount: countWords(content) });
      articleContext += `\n## ${section.h2}\n${content}\n`;
      coveredTopics.push(`${section.h2} [covered: ${section.keyPoints.slice(0, 2).join(" | ")}]`);

      for (const h3 of section.h3s) {
        log("article-writer", "H3_START", { h3, parentH2: section.h2 });
        const h3Lower = h3.toLowerCase();
        const h3KeyPoints = h3Lower.includes('scorecard') || h3Lower.includes('quick-reference') || h3Lower.includes('quick reference')
          ? [
              `Write a 5-item bullet checklist (NO table) for the Quick-Reference Scorecard about ${keyword}.`,
              'Format: "- **Metric name** — one-line action to take". No headers, no columns, no pipes.',
              'Pick the 5 checks that matter most for THIS specific topic. Do not use website/SEO metrics unless the topic is about websites.',
            ]
          : h3Lower.includes('checklist') || h3Lower.includes('summary')
          ? [`Write a concise checklist or summary for ${h3} related to ${keyword}`, 'Use bullet points or a simple table']
          : [`Write a focused 100-150 word subsection titled ${h3} that expands on the parent section about ${keyword}`];
        const h3Content = await generateSection(
          client, keyword, h3, h3KeyPoints,
          articleContext, coveredTopics, Math.round(wordsPerSection * 0.35), formatSources(citationUses(articleContext)), researchBrief, procedurePlan, format
        );
        sections.push({ heading: h3, level: 3, content: h3Content, wordCount: countWords(h3Content) });
        articleContext += `\n### ${h3}\n${h3Content}\n`;
        coveredTopics.push(`${h3}`);
      }
    } catch (err) {
      logError("article-writer", "SECTION_FAILED", err, { heading: section.h2, index: i });
      throw err;
    }
  }

  const totalWordCount = sections.reduce((sum, s) => sum + s.wordCount, 0);
  log("article-writer", "COMPLETE", {
    keyword,
    totalWordCount,
    targetWordCount,
    delta: totalWordCount - targetWordCount,
    sectionsWritten: sections.length,
    h1: h1MetaData.h1,
  });

  return {
    title: h1MetaData.h1,
    metaDescription: h1MetaData.meta,
    h1: h1MetaData.h1,
    sections,
    totalWordCount,
    keyword,
    // the plan goes FIRST: checks and repairs read only the start of the brief
    researchBrief: procedurePlan ? `PROCEDURE PLAN (validated; binding for every section):\n${procedurePlan}\n\n${researchBrief}` : researchBrief,
    sourcePool,
    procedurePlan: procedurePlan || undefined,
    planTools: planTools.length ? planTools : undefined,
  };
}

async function selectFaqQuestions(
  client: OpenAI,
  keyword: string,
  articleSoFar: string,
  candidates: string[],
  related: string[]
): Promise<string[]> {
  const cands = Array.from(new Set(candidates.map((q) => q.trim()).filter(Boolean))).slice(0, 16);
  if (!cands.length && !related.length) return [];
  try {
    const parsed = await chatJson<{ questions?: unknown[] }>(client, "FAQ_SELECT", `Choose the FAQ questions for an article about "${keyword}" (US audience).\n\nCANDIDATE QUESTIONS (real searcher questions: Google People Also Ask, keyword data, research sub-questions):\n${cands.map((q) => `- ${q}`).join("\n") || "(none)"}\n\nRELATED SEARCHES:\n${related.slice(0, 10).join(", ") || "(none)"}\n\nARTICLE WRITTEN SO FAR:\n${articleSoFar.replace(/\]\((https?:\/\/[^)\s]+)\)/g, "]").slice(0, 14000)}\n\nPick 4-5 questions that (1) a person searching "${keyword}" would genuinely ask, (2) are NOT already answered anywhere in the article text above (the same meaning or the same answer counts as answered, even with different words), and (3) can be answered accurately in 2-4 sentences without inventing numbers. Prefer candidate questions word-for-word (fix grammar, use US spelling). If fewer than 4 candidates qualify, add questions implied by the related searches. Drop questions about a different task, brand rankings, shopping, or trivia. Return JSON {"questions": ["..."]}.`, { maxTokens: 4000, validate: hasArray("questions") });
    const qs = (Array.isArray(parsed.questions) ? parsed.questions : [])
      .map((q) => String(q).trim().replace(/^#+\s*/, ""))
      .filter((q) => q.length > 8 && q.length < 140)
      .map((q) => (/[?]$/.test(q) ? q : `${q}?`))
      .slice(0, 5);
    log("article-writer", "FAQ_SELECTED", { candidates: cands, selected: qs });
    return qs;
  } catch (e) {
    log("article-writer", "FAQ_SELECT_FAILED", { error: String(e), attempts: e instanceof LlmJsonError ? e.attempts : undefined });
    return [];
  }
}
