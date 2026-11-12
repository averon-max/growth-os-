import { filterRelevantSearches } from "./keyword-relevance";
import { initLogger, log, logError } from "./logger";
import { pickBestKeyword } from "./keyword-picker";
import { analyzeSERP } from "./serp-analyzer";
import { writeArticle } from "./article-writer";
import { runEditorialScorecard } from "./editorial-scorecard";
import { buildEvidenceContract, checkProcedureFeasibility, evaluateReadiness, evidenceIssues, recoverEvidence, verifyClaims } from "./publication-readiness";
import type { EvidenceContext, EvidenceRecord, PageText, Readiness } from "./publication-readiness";
import { fetchMainText, searchOrganicRegular } from "./serp-analyzer";
import type { SourceItem } from "./article-writer";
import { LlmJsonError } from "./llm-json";
import { checkProcedureOrder } from "./procedure-order";
import type { OrderViolation } from "./procedure-order";
import { isOptionalTool, missingPlanTools, toolMentioned, toolName } from "./plan-binding";
import { checkFormat, formatBlock, formatContract } from "./format-contract";
import { logUsage, overBudget, recordUsage, resetUsage, setCacheKey, tracked, usageLine, usageTotals } from "./usage";
import type { ScorecardIssue } from "./editorial-scorecard";
import type { CheckStatus } from "./publication-readiness";
import OpenAI from "openai";
import { getTemplate } from "./templates";
import type { ArticleCategory } from "./templates";
import type { ArticleBrief } from "./article-writer";
import { AUTHORITATIVE_SOURCES } from "./authoritative-sources";
import { detectPersistedArticleEditorialRepetitionV1 } from "@/lib/content/editorial-repetition-guard-v1";

export interface WriterInput {
  seedKeyword: string;
  category: ArticleCategory;
  dataForSeoLogin: string;
  dataForSeoPassword: string;
  openAiKey: string;
  exactKeyword?: boolean;
  internalLinks?: { anchor: string; url: string; topic: string }[];
}

export interface WriterOutput {
  logFile: string;
  article: {
    title: string;
    metaDescription: string;
    h1: string;
    body: string;
    bodyMarkdown: string;
    totalWordCount: number;
    keyword: string;
  };
  /** PUBLICATION_READINESS_GATE_V2: READY only with no gate failures, score >= WRITER_MIN_SCORE and no open critical issue */
  readiness?: Readiness;
  /** EVIDENCE_CONTRACT: critical claims with the verified source passage behind each */
  evidence?: EvidenceRecord[];
}


export function getSectionKeyPoints(h2: string, keyword: string, idx: number, total: number): string[] {
  const h = h2.toLowerCase();
  if (h.includes("trend") || h.includes("future") || h.includes("emerging") || h.includes("shaping"))
    return [
      `Name 3-4 specific trends in ${keyword} that are NEW or different from what existed 2 years ago`,
      "For each trend: one concrete example of what changed + what practitioners must do differently",
      "Do NOT repeat concepts already covered in How It Works or How to Measure — these must be genuinely additive",
      "Cite sources ONLY as markdown links copied from the SOURCES list (prefer OFFICIAL for how-Google-works claims); never invent URLs, titles or statistics",
    ];
  if (h.includes("checklist") || h.includes("essential") || h.includes("best practice") || h.includes("guide"))
    return [
      `Format as a grouped checklist using - [ ] markdown syntax`,
      "Group items by category (3-5 groups, 3-5 items each)",
      "Each item must be binary: done or not done — no vague advice",
      "Include one measurement column: how to verify each group is complete",
      "Do NOT repeat items from other sections — these are new actionable steps only",
      "Do NOT repeat trends already covered in the Key Trends section — Immediate Actions = what to do THIS WEEK; Long-Term Strategy = 6-12 month systemic changes; both must be operationally distinct from trend descriptions",
      "Immediate Actions: focus on quick technical checks, config fixes, and monitoring setups — not trend explanations",
      "Long-Term Strategy: focus on governance, architecture decisions, compliance processes — not trend descriptions",
    ];
  if (h.includes("reviewed") || h.includes("top ") || h.includes("best "))
    return [
      `Compare 3-4 specific named services/tools for ${keyword} — one row per service`,
      "Columns: Service | Key feature | Limitation | Best for",
      "No fluff — only factual differences a buyer would care about",
      "Cite one official source per service (pricing page, feature page, or govt registry)",
    ];
  if (h.includes("factor") || h.includes("choosing") || h.includes("consider") || h.includes("how to choose") || h.includes("selection"))
    return [
      `List the 4-5 decision criteria for choosing ${keyword} — ordered by importance`,
      "For each: one sentence what it is + one concrete example of how it differs between options",
      "End with a decision matrix: Criteria | Why it matters | Red flag to watch for",
      "Do NOT repeat step-by-step instructions — this is about selection, not implementation",
    ];
  if (h.includes("limitation") || h.includes("drawback") || h.includes("risk") || h.includes("disadvantage") || h.includes("diy"))
    return [
      `Name 3-4 specific limitations of ${keyword} that practitioners hit in real use`,
      "For each: what the limitation is, who it affects most, and the workaround or alternative",
      "Be specific — not 'it may not work' but 'it fails when X happens'",
      "Cite an authoritative source for at least one limitation",
    ];
  if (h.includes("quick-reference") || h.includes("scorecard"))
    return [
      "Output ONLY a markdown table — no prose before or after it",
      "4-6 rows max. Columns: Signal | Threshold | Action | Owner",
      "Each row = a DIFFERENT signal from the prose above — zero repetition",
      "Thresholds MUST be labeled inline: [Technical requirement] / [Monitoring recommendation] / [Illustrative] — every threshold cell must carry one of these three labels",
      "Last row: one failure mode that looks like success but is not — label its threshold [Illustrative]",
    ];
  if (h.includes("definition") || h.includes("what is"))
    return [
      `Give a clear 1-2 sentence definition of ${keyword} — no fluff`,
      "Do NOT include metrics, measurement cadences, percentages, or tool names — those belong in How to Measure It only",
      "Do NOT include failure modes, mechanism steps, UX/voice recommendations, or eligibility caveats — those belong in How It Works only",
      "Do NOT include failure modes, mechanism explanations, or voice/UX recommendations — those belong in How It Works only",
      "State who it applies to and what problem it solves",
      "Write 200-300 words — give a complete answer, not just a hook. Cover: what it is, how it differs from related concepts, and who needs it",
      "Open the FIRST sentence with a direct 1-sentence answer to the query (e.g. 'X is...')",
      "Name at least 2 specific situations where this does NOT apply or has limitations",
    ];
  if (h.includes("how it works") || h.includes("how does"))
    return [
      `Explain how ${keyword} works using 2-4 clear steps or phases — only give them names/labels if it genuinely helps (skip named frameworks if a plain explanation is clearer)`,
      "Each step: ONE sentence what happens + ONE sentence what the outcome is",
      "ONE concrete analogy or real-world parallel to make the mechanism intuitive",
      "Do NOT include monitoring thresholds, measurement cadences, tool names, or action tables — those belong in How to Measure It",
      "Cite sources ONLY as markdown links copied from the SOURCES list (prefer OFFICIAL for how-Google-works claims); never invent URLs, titles or statistics",
    ];
  if (h.includes("types") || h.includes("kinds") || h.includes("categories"))
    return [
      "List 4-6 distinct types with clear names",
      "For each: what it covers + one real example",
      "Add a comparison table with 3 columns relevant to this specific topic — no generic examples",
    ];
  if (h.includes("important") || h.includes("why") || h.includes("matter"))
    return [
      "Open with the core risk of ignoring this topic",
      "Give 2-3 consequences; use a statistic ONLY if it appears in a linked source from the SOURCES list",
      "Differentiate impact: individual vs small business vs enterprise",
    ];
  if (h.includes("component") || h.includes("element") || h.includes("part") || h.includes("key"))
    return [
      `Identify the 3-5 core components or elements that make up ${keyword}`,
      "For each: ONE sentence on its role + ONE concrete example of what breaks without it",
      "End with a single table: Component | Role | What fails without it",
      "Do NOT repeat process steps — those belong in How It Works",
    ];
  if (h.includes("faq") || h.includes("question") || h.includes("common q"))
    return [
      "Write 4-5 H3 subsections. Start IMMEDIATELY with the first '### Question?' line (no intro paragraph); every answer sits under its own ### question heading",
      "Answer each question in 2-3 sentences — direct, no fluff",
      "Cover: edge cases, limitations, comparisons, and 'what if' scenarios",
      "Do NOT repeat definitions already covered above",
    ];
  if (h.includes("comparison") || h.includes("vs") || h.includes("alternatives") || h.includes("options"))
    return [
      `Build a comparison table with these exact columns: Option | What it does | Key difference | Cost | Best for`,
      `Cover the 3-5 most relevant alternatives or variants of ${keyword}`,
      "End with a clear recommendation: which option for which situation",
      "Cite at least one authoritative source for at least one option",
    ];
  if (h.includes("example") || h.includes("case study") || h.includes("scenario"))
    return [
      "Open with an explicit label: 'In this hypothetical scenario...' or 'Consider this example:' — NEVER present as a real case study",
      "Walk through ONE detailed realistic scenario with a named persona (different from any scenario in How It Works)",
      "Show the full timeline: problem appears → detection → response → qualitative outcome (e.g. 'visibility recovered', 'qualified sessions returned', 'fewer support calls') — NO percentages, revenue figures, or invented counts",
      "All numbers (percentages, revenue, counts) must be preceded by 'roughly', 'approximately', or 'in this example' — never bare numbers",
      "End with the counterfactual: what happens when the reader SKIPS this step",
    ];
  if (h.includes("misconception") || h.includes("myth") || h.includes("mistake"))
    return [
      "Cover 3-5 specific named misconceptions — give each a short memorable name (e.g. 'The Index Everything myth')",
      "For each: one sentence myth → one sentence why it is wrong → one sentence correct view",
      "Do NOT repeat measurement thresholds, tool names, or step-by-step instructions — those belong in How to Measure It",
      "Do NOT repeat the mechanism explanation — that belongs in How It Works",
      "Each mistake must be a decision error or wrong assumption, not a how-to instruction",
      "Cite sources ONLY as markdown links copied from the SOURCES list (prefer OFFICIAL for how-Google-works claims); never invent URLs, titles or statistics",
    ];
  if (h.includes("worth") || h.includes("cost") || h.includes("free") || h.includes("paid") || h.includes("choose") || h.includes("best service"))
    return [
      `Build a comparison table: Situation | Best option | Why — cover the 3-4 most common reader scenarios for ${keyword}`,
      "Name specific free options with what they include and what they lack",
      "Name paid tier benefits honestly — include real limitations, not just upsides",
      "End with a clear 2-sentence recommendation for the most common reader",
      "Cite at least one authoritative source (government, regulator, or independent review body)",
    ];
  if (h === "immediate actions" || h === "immediate action")
    return [
      "List 4-5 specific actions that can be completed THIS WEEK — no strategy, no trends",
      "Each action: one verb + one object + one way to verify it is done",
      "Focus on: technical checks, config fixes, monitoring setups, and quick content corrections",
      "Do NOT repeat anything from Key Trends, Best Practices body, or Long-Term Strategy",
    ];
  if (h === "long-term strategy" || h === "long term strategy")
    return [
      "List 3-4 systemic changes that take 1-6 months to implement",
      "Each change: governance decision, architecture choice, or compliance process — not a tactic",
      "Do NOT repeat immediate actions, trend descriptions, or checklist items",
      "Each item must name who owns it and how completion is verified at the org level",
    ];
  if (h.includes("best practice") || h.includes("tips") || h.includes("protect"))
    return [
      "Give exactly 5-7 numbered actionable steps",
      "Each step must be specific enough to do TODAY — no vague advice",
      "Prioritize by impact: highest impact first",
      "Name a free/accessible tool or resource for each step where possible",
    ];
  if (h.includes("each item") || h.includes("item explained"))
    return [
      "For each checklist item: explain WHY it matters — not just what to do",
      "Add the failure mode: what goes wrong when this item is skipped",
      "Keep each explanation to 2-3 sentences — scannable, not exhaustive",
    ];
  if (h.includes("checklist"))
    return [
      "Format as a real checklist using - [ ] markdown",
      "Group items by category if more than 7 items",
      "Each item must be binary: done or not done — no vague items",
    ];
  if (h.includes("side-by-side") || h.includes("side by side"))
    return [
      "Build a detailed comparison table with at least 5 criteria rows",
      "Every cell must have a specific value — no 'varies' or 'depends'",
      "Add a one-sentence verdict below the table",
    ];
  if (h.includes("which option") || h.includes("right for you") || h.includes("how to choose"))
    return [
      `Give 3-5 specific reader scenarios with a clear recommendation for each`,
      "Format as: Situation → Best choice → One-sentence reason",
      "End with the single most common scenario and its answer",
    ];
  if (!h.startsWith("how to measure") && (h.includes("steps") || h.includes("step-by-step") || h.includes("how to get started") || h.includes("how to")))
    return [
      `List the exact steps to accomplish the task for ${keyword} — numbered, in order`,
      "Each step: one specific action + how to verify it succeeded",
      "Flag prerequisites before step 1 if any exist",
      "Name the specific tool, interface, or command for each step where applicable",
      "End with: how to confirm the whole process worked",
    ];
  if (h.startsWith("how to measure") || h === "how to measure it" || (h.includes("measure") && !h.includes("services") && !h.includes("limitation") && !h.includes("choosing") && !h.includes("factor")))
    return [
      `Name the 3-4 most important metrics to track for ${keyword} — be specific to this topic (named tool, instrument or method)`,
      "For each metric: what it measures + describe qualitatively what pattern signals a problem — use words like 'sudden drop', 'consistent decline', 'sharp divergence'; if you use a percentage threshold label it as [Illustrative] and note it must be calibrated to the site's baseline",
      "Specify the review cadence: daily/weekly/monthly — and what triggers escalation",
      "Include ONE diagnostic table: Metric | Normal range | Warning threshold | Action",
      "Name the specific tool, instrument, report or method practitioners in THIS topic actually use to measure it (web analytics only if the topic is about websites)",
    ];
  if (h.includes("organizational") || h.includes("structure") || h.includes("team") || h.includes("governance") || h.includes("ownership") || h.includes("role") || h.includes("strategy") || h.includes("adoption") || h.includes("workflow") || h.includes("implement"))
    return [
      `Name 3-4 specific organizational or governance shifts that affect ${keyword} success in 2026`,
      "For each: what changed in how teams work + what practitioners must do differently",
      "Focus on cross-functional handoffs, approval workflows, and ownership gaps — not technical tactics",
      "Cite sources ONLY as markdown links copied from the SOURCES list (prefer OFFICIAL for how-Google-works claims); never invent URLs, titles or statistics",
    ];
  if ((h.includes("overview") || h.includes("visibility") || h.includes("landscape") || h.includes("ai search") || h.includes("answer engine")) && /seo|search|aeo|geo|\bai\b|marketing|google|content/i.test(keyword))
    return [
      `Describe how the PLATFORMS behave for ${keyword}: name specific engines (Google AI Overviews, ChatGPT Search, Perplexity, Microsoft Copilot) and one concrete behavior that differs between them`,
      "Back at least one platform-behavior claim with an OFFICIAL source link from the SOURCES list; if none fits, describe the behavior as observed in practice, not as documented fact",
      "Do NOT restate the definition, the internal workflow, or the measurement metrics: focus only on external platform behavior and what it forces practitioners to change",
      "Name one edge case where platform behavior is unreliable or shifts faster than content can keep up",
    ];
  if (idx === total - 1)
    return [
      `Name 3-4 specific trends in ${keyword} that are NEW or different from what existed 2 years ago`,
      "For each trend: one concrete example of what changed + what practitioners must do differently",
      "Do NOT repeat concepts already covered in How It Works or How to Measure — these must be genuinely additive",
      "Cite sources ONLY as markdown links copied from the SOURCES list (prefer OFFICIAL for how-Google-works claims); never invent URLs, titles or statistics",
    ];
  return [
    `Cover "${h2}" for ${keyword} — answer the question this heading implies, adding value NOT already covered in earlier sections`,
    "Use concrete data, named examples, or specific steps — no repeated theory or generalities",
    "If this topic overlaps with another section, find the one unique angle that adds new information",
    "Name at least one limitation or edge case specific to this sub-topic",
  ];
}

function getH3sForSection(h2: string): string[] {
  const h = h2.toLowerCase();
  if (h.includes("how it works") || h.includes("how does"))
    return [];
  if ((h.startsWith("how to measure") || h === "how to measure it"))
    return ["Quick-Reference Scorecard"];
  if (h.startsWith("how ") && (h.includes("works") || h.includes("work")))
    return ["The Core Process", "What Can Go Wrong"];
  if (h.includes("types") || h.includes("kinds") || h.includes("categories"))
    return ["Overview of Each Type", "Comparison: Which Type Do You Need"];
  if (h.includes("best practice") || h.includes("tips") || h.includes("protect"))
    return ["Immediate Actions", "Long-Term Strategy"];
  if (h.includes("component") || h.includes("element") || h.includes("key feature"))
    return [];
  if (h.includes("comparison") || h.includes(" vs ") || h.includes("alternatives"))
    return ["Side-by-Side Comparison", "Which Option Is Right for You"];
  if (h.includes("example") || h.includes("case study") || h.includes("scenario"))
    return [];
  return [];
}

const SMALL_WORDS = new Set(["a","an","the","in","of","for","and","to","vs","on","with"]);
const ACRONYMS = new Set(["seo","aeo","geo","crm","api","ppc","cro","sql","ai","roi","b2b","b2c","saas","ux","ui"]);
function titleCase(input: string): string {
  return input.trim().split(/\s+/).map((w, i) => {
    const l = w.toLowerCase();
    if (ACRONYMS.has(l)) return l.toUpperCase();
    if (i > 0 && SMALL_WORDS.has(l)) return l;
    return l.charAt(0).toUpperCase() + l.slice(1);
  }).join(" ");
}

function makeDynamicHeading(h2: string, keyword: string): string {
  const h = h2.toLowerCase();
  const kw = titleCase(keyword);
  if (h === "definition") return `What Is ${kw}?`;
  if (h === "how it works" || h === "how does it work") return `How ${kw} Works`;
  if (h === "how to measure it" || h === "how to measure") return `How to Measure ${kw}`;
  if (h === "example" || h === "case study") return `${kw} in Practice`;
  if (h === "common mistakes" || h === "common errors") return `Common ${kw} Mistakes`;
  if (h === "steps" || h === "step-by-step process") return `How to Implement ${kw}: Step by Step`;
  if (h === "checklist") return `${kw} Checklist`;
  if (h === "overview") return `${kw}: An Overview`;
  if (h === "verdict" || h === "conclusion") return `Is ${kw} Right for You?`;
  return h2 === h2.toLowerCase() ? titleCase(h2) : h2; // SERP-derived headings
}

const SERP_SEMANTIC_BLOCKLIST = [
  "understanding", "what is", "introduction to", "overview of",
  "importance of", "why is", "benefits of", "advantages of",
  "the role of", "significance of",
];

function serpTopicIsDuplicate(serpTopic: string, mustSections: string[], keyword: string): boolean {
  const t = serpTopic.toLowerCase();
  // Блокируем "understanding X", "importance of X", "what is X" и т.д.
  if (SERP_SEMANTIC_BLOCKLIST.some(b => t.startsWith(b) || t.includes(" " + b + " "))) return true;
  // Сравниваем динамически: если makeDynamicHeading(mustSection) == makeDynamicHeading(serpTopic) — дубль
  const serpNorm = makeDynamicHeading(serpTopic, keyword).toLowerCase();
  return mustSections.some(m => {
    const mustNorm = makeDynamicHeading(m, keyword).toLowerCase();
    return mustNorm === serpNorm || t.includes(m.toLowerCase()) || m.toLowerCase().includes(t);
  });
}

function serpTopicsAreSimilar(a: string, b: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(w => w.length > 3);
  const aWords = new Set(normalize(a));
  const bWords = normalize(b);
  const overlap = bWords.filter(w => aWords.has(w)).length;
  return overlap >= 2; // 2+ значимых слова совпадают — считаем дублем
}

export function buildOutlineFromSerp(serpTopics: string[], template: ReturnType<typeof getTemplate>, missingTopics: string[] = [], keyword: string = "", subtopics: Record<string, string[]> = {}, maxSubs = 3) {
  const must = template.mustHaveSections;
  const filtered = serpTopics.filter(t => !serpTopicIsDuplicate(t, must, keyword));
  // Дедупликация внутри fromSerp: убираем темы, похожие на уже принятые
  const fromSerp: string[] = [];
  for (const topic of filtered) {
    const isDuplicate = fromSerp.some(accepted => serpTopicsAreSimilar(accepted, topic));
    if (!isDuplicate) fromSerp.push(topic);
  }
  // Competitor-informed topics ARE the outline; template sections are only a fallback.
  const serpDriven = serpTopics.length >= 4;
  const dedupedTopics: string[] = [];
  const tTok = (x: string) => new Set(x.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((w) => w.length > 2));
  const tSim = (a: string, b: string) => {
    const A = tTok(a), B = tTok(b);
    if (!A.size || !B.size) return false;
    let n = 0; A.forEach((w) => { if (B.has(w)) n++; });
    return n / Math.min(A.size, B.size) >= 0.8;
  };
  for (const t of serpTopics) if (!dedupedTopics.some((a) => tSim(a, t))) dedupedTopics.push(t);
  const maxTopics = /how-to|tutorial|recipe/.test(String(template.category)) && /^(how (to|do i|do you|can i)|steps? to|ways to)\b|\b(recipe|diy|tutorial|step[- ]by[- ]step)\b/i.test(keyword) ? 8 : 10; // PROC_KEYWORD
  const keptTopics = dedupedTopics.slice(0, maxTopics);
  const extraSubs: Record<string, string[]> = {};
  // TOPIC_OWNERSHIP: match on meaningful words only; unmatched topics become their own H2 (max 8)
  const kwTok = tTok(keyword);
  const STOP = new Set(["your", "the", "and", "with", "how", "what", "for", "use", "make", "common", "right", "build", "create", "optimize", "measure", "fix", "manage", "choose", "follow", "know", "get", "find", "gather", "improve", "plan", "guide"]);
  const mTok = (x: string) => new Set(Array.from(tTok(x)).filter((w) => !kwTok.has(w) && !STOP.has(w) && !kwTok.has(w.replace(/s$/, ""))));
  // OVERFLOW_TOPICS: a topic beyond the cap becomes an H3 only on a strong match (2+ meaningful words);
  // otherwise its sub-questions go to the FAQ candidates instead of being forced under an unrelated H2
  const overflowQuestions: string[] = [];
  const overflowTopics: string[] = [];
  for (const d of dedupedTopics.slice(maxTopics, 10)) {
    let best = "";
    let bestN = 0;
    for (const k of keptTopics.slice(1)) {
      const A = mTok(d), B = mTok(k);
      let n = 0; A.forEach((x) => { if (B.has(x) || B.has(x.replace(/ing$/, "")) || B.has(x + "ing")) n++; });
      if (n > bestN) { bestN = n; best = k; }
    }
    if (best && bestN >= 2) (extraSubs[best] ??= []).push(d);
    else { overflowTopics.push(d); overflowQuestions.push(...(subtopics[d]?.length ? subtopics[d] : [d])); }
  }
  const cappedSerp = fromSerp.slice(0, 2);
  let merged = serpDriven
    ? [...keptTopics, "Frequently Asked Questions"]
    : [...must, ...cappedSerp].slice(0, template.h2Count.max);

  // Если конкуренты пропускают важные темы — добавляем gap-секцию
  if (missingTopics.length > 0 && merged.length < template.h2Count.max) {
    const gapHeading = missingTopics[0];
    if (!merged.some(h => h.toLowerCase().includes(gapHeading.toLowerCase()))) {
      merged.push(gapHeading);
    }
  }

  const isFaqHeading = (hh: string) => /faq|frequently asked|common question/i.test(hh);
  const faqHeadings = merged.filter(isFaqHeading);
  if (faqHeadings.length > 0) {
    merged = [...merged.filter(hh => !isFaqHeading(hh)), ...faqHeadings];
  }

  const tableIdx = (() => {
    const i = merged.findIndex((m) => !/faq|frequently asked/i.test(m) && /measur|technical|strateg|workflow|audit|choos|compar|intent/i.test(m));
    return i >= 0 ? i : Math.min(2, merged.length - 1);
  })();
  const assignedSubtopics: string[] = [];
  const outline = merged.map((h2Raw, idx) => {
    const isFaq = /faq|frequently asked/i.test(h2Raw);
    if (!serpDriven || isFaq) {
      return { h2: makeDynamicHeading(h2Raw, keyword), h3s: getH3sForSection(h2Raw), keyPoints: getSectionKeyPoints(h2Raw, keyword, idx, merged.length) };
    }
    const others = merged.filter((m) => m !== h2Raw && !/faq|frequently asked/i.test(m));
    const allSubs = [...(subtopics[h2Raw] ?? []), ...(extraSubs[h2Raw] ?? [])];
    // SUB_BUDGET: short sections get at most 2 subheadings; the rest become FAQ candidates
    const subs = allSubs.slice(0, maxSubs);
    assignedSubtopics.push(...subs);
    overflowQuestions.push(...allSubs.slice(maxSubs));
    return {
      h2: makeDynamicHeading(h2Raw, keyword),
      h3s: [] as string[],
      keyPoints: [
        `Everything in this section must be about "${h2Raw}" specifically. If a point is not about this heading, leave it out.`,
        ...(idx === 0 ? [`This is the first section: open by directly answering the main query "${keyword}" in 1-2 sentences.`] : []),
        subs.length
          ? `Organize the section under these ### subheadings (rephrase lightly if needed): ${subs.join(" | ")}`
          : `Split the section under ${maxSubs <= 2 ? "2" : "2-3"} specific ### subheadings that name its distinct sub-questions`,
        "Cover what the top-ranking pages say about this subtopic (see RESEARCH BRIEF), then add at least one concrete detail, example or decision rule they miss",
        `Do NOT explain topics that have their own section in this article: ${others.join(" | ")}`,
        "Name one limitation or edge case specific to this subtopic",
        ...(idx === tableIdx ? ["Include ONE reusable reference asset as a compact markdown table introduced by a bold title (for example **Quick-reference checklist** or **Decision matrix**): a self-contained summary other sites could cite, combining condition, action and reason in one place, more complete than any single competitor page. Use only facts from this article or the SOURCES list; no invented numbers"] : []),
      ],
    };
  });
  return { outline, assignedSubtopics, overflowTopics, overflowQuestions: Array.from(new Set(overflowQuestions)) };
}

export function articleBodyToMarkdown(
  article: Awaited<ReturnType<typeof writeArticle>>
): string {
  // The page-level H1 is stored separately in article.h1.
  const lines: string[] = [];

  for (const section of article.sections) {
    const prefix = section.level === 2 ? "##" : "###";
    lines.push(`${prefix} ${section.heading}`);
    lines.push("");
    lines.push(section.content);
    lines.push("");
  }

  return lines.join("\n").trim();
}

export function articleToMarkdown(
  article: Awaited<ReturnType<typeof writeArticle>>
): string {
  const body = articleBodyToMarkdown(article);
  return body
    ? `# ${article.h1}\n\n${body}`
    : `# ${article.h1}`;
}

export async function runWriter(input: WriterInput): Promise<WriterOutput> {
  const logFile = initLogger(input.seedKeyword);
  resetUsage();
  setCacheKey(input.seedKeyword);

  log("orchestrator", "PIPELINE_START", {
    seedKeyword: input.seedKeyword,
    category: input.category,
  });

  // STEP 1: keyword picker
  log("orchestrator", "STEP_1_KEYWORD_PICKER", { seedKeyword: input.seedKeyword });
  let keywordResult: Awaited<ReturnType<typeof pickBestKeyword>>;
  try {
    if (input.exactKeyword) {
      keywordResult = {
        winner: {
          keyword: input.seedKeyword,
          volume: 0,
          difficulty: 0,
          score: 0,
          cpc: 0,
          intent: "UNKNOWN",
        },
        allCandidates: [],
        reason: "exact",
      };
    } else {
    keywordResult = await pickBestKeyword(
      input.seedKeyword,
      input.dataForSeoLogin,
      input.dataForSeoPassword
    );
    }
    log("orchestrator", "STEP_1_DONE", {
      winner: keywordResult.winner.keyword,
      score: keywordResult.winner.score,
      volume: keywordResult.winner.volume,
      difficulty: keywordResult.winner.difficulty,
      reason: keywordResult.reason,
    });
  } catch (err) {
    logError("orchestrator", "STEP_1_FAILED", err);
    throw err;
  }

  // STEP 2: SERP analysis
  log("orchestrator", "STEP_2_SERP_ANALYZER", { keyword: keywordResult.winner.keyword });
  let serpAnalysis;
  try {
    serpAnalysis = await analyzeSERP(
      keywordResult.winner.keyword,
      input.dataForSeoLogin,
      input.dataForSeoPassword
    );
    log("orchestrator", "STEP_2_DONE", {
      topResultsCount: serpAnalysis.topResults.length,
      pagesAnalyzed: serpAnalysis.pageStructures.length,
      avgWordCount: serpAnalysis.consensus.avgWordCount,
      mustCoverTopics: serpAnalysis.consensus.mustCoverTopics,
      h2CountRange: serpAnalysis.consensus.h2CountRange,
    });
  } catch (err) {
    logError("orchestrator", "STEP_2_FAILED", err);
    throw err;
  }

  // STEP 3: build outline from template + SERP
  const serpCategory = serpAnalysis.consensus.detectedCategory as ArticleCategory | undefined;
  const effectiveCategory: ArticleCategory = serpCategory ?? input.category;
  if (effectiveCategory !== input.category) {
    log("orchestrator", "CATEGORY_FROM_SERP", { requested: input.category, detected: serpCategory });
  }
  const template = getTemplate(effectiveCategory);
console.log('[TEMPLATE]', template?.category, 'wordRange:', template?.wordRange, 'sections:', template?.sections?.length);
  // LENGTH_BUDGET: the ranking pages' average + 15% (was the template minimum or +30%): in the 15-template matrix
  // articles ran 30-60% over the SERP average, which cost tokens and UX points without adding coverage
  const targetWordCount = Math.max(800, Math.min(template.maxWords, Math.round((serpAnalysis.consensus.avgWordCount || template.minWords) * 1.15)));
  const approxSections = Math.min(serpAnalysis.consensus.mustCoverTopics.length, 10) + 1;
  const { outline, assignedSubtopics, overflowTopics, overflowQuestions } = buildOutlineFromSerp(
    serpAnalysis.consensus.mustCoverTopics,
    template,
    serpAnalysis.consensus.missingTopics ?? [],
    keywordResult.winner.keyword,
    serpAnalysis.consensus.topicSubtopics ?? {},
    targetWordCount / approxSections < 220 ? 2 : 3
  );

  const QUESTION_RE = /^(what|how|why|is|are|can|does|do|should|when|which|who|will)\b/i;
  const winnerKw = keywordResult.winner.keyword.toLowerCase();
  const candidateKws = (keywordResult.allCandidates ?? [])
    .filter((c) => c.keyword && c.keyword.toLowerCase() !== winnerKw)
    .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
    .map((c) => c.keyword);
  const relatedKeywords = Array.from(new Set([
    ...candidateKws.filter((k) => !QUESTION_RE.test(k)).slice(0, 12),
    ...(serpAnalysis.relatedSearches ?? []),
  ])).slice(0, 15);
  const questions = Array.from(new Set([
    ...(serpAnalysis.peopleAlsoAsk ?? []),
    ...candidateKws.filter((k) => QUESTION_RE.test(k)),
  ])).slice(0, 8);
  log("orchestrator", "KEYWORD_SIGNALS", { relatedKeywords, questions });

  // only sub-questions that were actually assigned to a section count as covered
  // (subtopics of dropped topics used to block FAQ questions the article never answered)
  const coveredHeadings = [
    ...outline.map((s) => s.h2).filter((h) => !/faq|frequently asked/i.test(h)),
    ...assignedSubtopics,
  ].join(" | ");
  const coveredList = coveredHeadings.split(" | ");
  const qTok = (x: string) => new Set(x.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((w) => w.length > 2));
  const qSim = (a: string, b: string) => {
    const A = qTok(a), B = qTok(b);
    if (!A.size || !B.size) return false;
    let n = 0; A.forEach((w) => { if (B.has(w)) n++; });
    return n / Math.min(A.size, B.size) >= 0.8;
  };
  const freshQuestions = questions.filter((q) => !coveredList.some((h) => qSim(h, q)));
  log("orchestrator", "FAQ_QUESTIONS", { candidates: questions.length, fresh: freshQuestions, droppedAsDuplicates: questions.length - freshQuestions.length });
  if (freshQuestions.length >= 3) {
    const faqKeyPoints = [
      `Use these REAL user questions (Google People Also Ask + keyword data) as the ### H3 headings, word-for-word or lightly edited for grammar: ${freshQuestions.slice(0, 6).join(" | ")}`,
      "Start IMMEDIATELY with the first '### Question?' line (no intro paragraph); every answer sits under its own ### heading",
      "Answer each in 2-4 sentences: the direct answer first, then the one useful detail competitors usually miss",
      "Skip a question only if it was already fully answered earlier in the article",
      "Each answer must add NEW information: do not repeat explanations, examples or sources already used in earlier sections",
      `Do NOT ask a question that is already answered by one of these headings: ${coveredHeadings}`,
    ];
    const faqSection = outline.find((s) => /faq|frequently asked/i.test(s.h2));
    if (faqSection) faqSection.keyPoints = faqKeyPoints;
    else outline.push({ h2: "Frequently Asked Questions", h3s: [], keyPoints: faqKeyPoints });
  } else if (relatedKeywords.length) {
    const faqSection = outline.find((s) => /faq|frequently asked/i.test(s.h2));
    if (faqSection) faqSection.keyPoints = [
      `Write 4-5 ### H3 questions real searchers ask, inferred from these related searches (skip brand names, navigational, contact, login or off-topic queries; ask only about the topic itself; 3 strong questions beat 5 forced ones): ${filterRelevantSearches(relatedKeywords, keywordResult.winner.keyword).slice(0, 8).join(" | ")}`,
      "Start IMMEDIATELY with the first '### Question?' line (no intro paragraph); every answer sits under its own ### heading",
      "Answer each in 2-4 sentences: the direct answer first, then one useful specific detail",
      "Each answer must add NEW information: do not repeat explanations, examples or sources already used in earlier sections",
      `Do NOT ask a question that is already answered by one of these headings: ${coveredHeadings}`,
    ];
  }

  if (!outline.some((s) => /faq|frequently asked/i.test(s.h2)) && new Set([...questions, ...overflowQuestions]).size >= 3) {
    outline.push({ h2: "Frequently Asked Questions", h3s: [], keyPoints: getSectionKeyPoints("Frequently Asked Questions", keywordResult.winner.keyword, outline.length, outline.length + 1) });
  }

  log("orchestrator", "STEP_3_OUTLINE_BUILT", {
    category: effectiveCategory,
    requestedCategory: input.category,
    targetWordCount,
    templateMin: template.minWords,
    templateMax: template.maxWords,
    serpAvg: serpAnalysis.consensus.avgWordCount,
    sectionsCount: outline.length,
    outline: outline.map(s => s.h2),
  });

  const serpGap = (serpAnalysis.consensus.missingTopics ?? []).slice(0, 3).join(", ");

  const brief: ArticleBrief = {
    primaryKeyword: keywordResult.winner,
    template,
    serpAnalysis,
    targetWordCount,
    outline,
    serpGap,
    relatedKeywords,
    questions,
    faqCandidates: Array.from(new Set([...freshQuestions, ...overflowQuestions, ...questions])),
    internalLinks: input.internalLinks ?? [],
  };
  log("orchestrator", "FAQ_CANDIDATES", { fromSearch: freshQuestions, fromResearch: overflowQuestions });

  // STEP 4: write article
  log("orchestrator", "STEP_4_ARTICLE_WRITER", {
    keyword: keywordResult.winner.keyword,
    sectionsCount: outline.length,
    targetWordCount,
  });
  let article;
  try {
    article = await writeArticle(brief, input.openAiKey);
    log("orchestrator", "STEP_4_DONE", {
      totalWordCount: article.totalWordCount,
      targetWordCount,
      delta: article.totalWordCount - targetWordCount,
      h1: article.title,
      sectionsWritten: article.sections.length,
    });
  } catch (err) {
    logError("orchestrator", "STEP_4_FAILED", err);
    throw err;
  }

  let readiness: Readiness | undefined;
  let evidenceRecords: EvidenceRecord[] = [];
  const checkFailures: string[] = []; // a check that could not run must block READY, never pass silently
  const checkStatus: Record<string, CheckStatus> = {};
  {
    const art = article!;
    const normU = (u: string) => u.replace(/[#?].*$/, "").replace(/\/+$/, "").toLowerCase();
    const allowed = [...serpAnalysis.topResults.map((r) => r.url), ...(serpAnalysis.authoritySources ?? []).map((r) => r.url), ...AUTHORITATIVE_SOURCES.map((s) => s.url), ...(input.internalLinks ?? []).map((l) => l.url)].filter((u) => /^https?:\/\//.test(u));
    const allowedSet = new Set(allowed.map(normU));
    let repaired = 0;
    let unlinked = 0;
    for (const s of art.sections) {
      s.content = s.content.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (m: string, txt: string, u: string) => {
        if (allowedSet.has(normU(u))) return m;
        let host = "";
        try { host = new URL(u).hostname; } catch { /* malformed */ }
        const sameHost = allowed.filter((a) => { try { return new URL(a).hostname === host; } catch { return false; } });
        if (sameHost.length === 1) { repaired++; return `[${txt}](${sameHost[0]})`; }
        unlinked++;
        return `\u0000${txt}\u0000`;
      });
    }
    log("orchestrator", "LINK_ALLOWLIST", { repaired, unlinked });
    const capCitations = () => {
      const urlUses: Record<string, number> = {};
      let overCited = 0;
      for (const s of art.sections) {
        s.content = s.content.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (m: string, txt: string, u: string) => {
          const k = normU(u);
          urlUses[k] = (urlUses[k] ?? 0) + 1;
          if (urlUses[k] > 2) { overCited++; return `\u0000${txt}\u0000`; }
          return m;
        });
      }
      return { overCitedRemoved: overCited, uniqueSources: Object.keys(urlUses).length };
    };
    // UNLINK_MARK: drop citation-only parentheses left by unlinking, keep inline text
    const unlinkMarks = () => { for (const s2 of art.sections) s2.content = s2.content.replace(/\s*\((?:\u0000[^\u0000]*\u0000(?:;\s*)?)+\)/g, "").replace(/\u0000([^\u0000]*)\u0000/g, "$1"); };
    log("orchestrator", "CITATION_CAP", capCitations());
    const citedUrls = Array.from(new Set(art.sections.flatMap((s) => Array.from(s.content.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)).map((m) => m[1]))));
    const deadUrls = new Set<string>();
    await Promise.all(citedUrls.map(async (u) => {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        const headers = { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36" };
        let r = await fetch(u, { method: "HEAD", redirect: "follow", signal: ctrl.signal, headers });
        if (r.status === 405 || r.status === 501) r = await fetch(u, { method: "GET", redirect: "follow", signal: ctrl.signal, headers });
        clearTimeout(timer);
        if (r.status >= 400 && ![401, 403, 429].includes(r.status)) deadUrls.add(u);
      } catch {
        // timeout / network: unknown, keep the link
      }
    }));
    if (deadUrls.size) {
      for (const s of art.sections) s.content = s.content.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (m: string, txt: string, u: string) => (deadUrls.has(u) ? `\u0000${txt}\u0000` : m));
    }
    log("orchestrator", "LINK_CHECK", { checked: citedUrls.length, dead: Array.from(deadUrls) });
    unlinkMarks();

    const normH = (x: string) => x.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const hTok = (x: string) => new Set(normH(x).split(" ").filter((w) => w.length > 2));
    const hSim = (a: string, b: string) => {
      const A = hTok(a), B = hTok(b);
      if (!A.size || !B.size) return false;
      let n = 0; A.forEach((w) => { if (B.has(w)) n++; });
      return n / Math.min(A.size, B.size) >= 0.8;
    };
    const faqSec = art.sections.find((s) => /faq|frequently asked/i.test(s.heading));
    if (faqSec) {
      const earlier = art.sections.filter((s) => s !== faqSec).flatMap((s) => [s.heading, ...Array.from(s.content.matchAll(/^###\s+(.+)$/gm)).map((m) => m[1])]);
      const blocks = faqSec.content.split(/(?=^###\s)/m);
      const kept = blocks.filter((b) => {
        const q = b.match(/^###\s+(.+)$/m)?.[1];
        return !q || !earlier.some((e) => hSim(e, q));
      });
      if (kept.length !== blocks.length && kept.filter((b) => /^###\s/m.test(b)).length >= 2) {
        log("orchestrator", "FAQ_DEDUPED", { removed: blocks.length - kept.length });
        faqSec.content = kept.join("").trim();
      }
    }
    if (faqSec && process.env.OPENAI_API_KEY) {
      const fBlocks = faqSec.content.split(/(?=^###\s)/m);
      const fQs = fBlocks.map((b) => b.match(/^###\s+(.+)$/m)?.[1] ?? "");
      const earlierH = art.sections.filter((x) => x !== faqSec).flatMap((x) => [x.heading, ...Array.from(x.content.matchAll(/^###\s+(.+)$/gm)).map((m) => m[1])]);
      try {
        const res = await fetchRetry("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: process.env.OPENAI_CONTENT_MODEL ?? "gpt-4o",
            response_format: { type: "json_object" },
            messages: [{ role: "user", content: `ARTICLE HEADINGS:\n${earlierH.join("\n")}\n\nFAQ QUESTIONS:\n${fQs.map((q, i) => (q ? `${i}: ${q}` : "")).filter(Boolean).join("\n")}\n\nReturn JSON {"duplicates": [indexes]} listing FAQ questions that ask the same thing as any article heading, or as another FAQ question (same meaning or same answer even if worded differently, e.g. "rule" vs "ratio"; for a pair of duplicate FAQ questions list only the later one). OFF_TOPIC_FAQ: also list FAQ questions that do not help a reader with the main task "${keywordResult.winner.keyword}" (for example brand rankings, buying advice or unrelated rules). Return [] if none.` }],
          }),
        });
        const j = (await res.json()) as { choices?: { message?: { content?: string } }[]; usage?: Parameters<typeof recordUsage>[1] };
        recordUsage("faq_dedupe", j.usage);
        const parsed = JSON.parse(j.choices?.[0]?.message?.content ?? "{}") as { duplicates?: unknown[] };
        const dups = new Set((parsed.duplicates ?? []).map(Number).filter((n) => Number.isInteger(n) && fQs[n]));
        const keptF = fBlocks.filter((_b, i) => !dups.has(i));
        // FAQ_KEEP: never delete the whole FAQ (it carries the People Also Ask answers); keep at least 2 questions
        const remaining = keptF.filter((b) => /^###\s/m.test(b)).length;
        const applied = dups.size > 0 && remaining >= 2;
        if (applied) faqSec.content = keptF.join("").trim();
        log("orchestrator", "FAQ_SEMANTIC_DEDUPE", { duplicates: Array.from(dups).map((i) => fQs[i]), applied, questionsKept: applied ? remaining : fQs.filter(Boolean).length, ...(dups.size > 0 && !applied ? { skipped: "would leave fewer than 2 questions" } : {}) });
      } catch (e) {
        log("orchestrator", "FAQ_SEMANTIC_DEDUPE", { error: String(e) });
      }
    }
    const isFaqSec = (x: { heading: string }) => /faq|frequently asked/i.test(x.heading);
    const faqBlocks = (c: string) => c.split(/(?=^###\s)/m);
    const keepFaq = (sec: { content: string }, kept: string[], stage: string, removed: string[]) => {
      // FAQ_KEEP: never below 2 questions
      if (!removed.length || kept.filter((b) => /^###\s/m.test(b)).length < 2) return false;
      sec.content = kept.join("").trim();
      log("orchestrator", "FAQ_BLOCKS_DROPPED", { stage, removed });
      return true;
    };
    // DUPLICATE_FAQ_HEADING: a FAQ question that repeats a heading of the article is dropped (plain code)
    const dupHeadingsOf = () => {
      const all = art.sections.flatMap((s) => [s.heading, ...Array.from(s.content.matchAll(/^#{2,3}\s+(.+)$/gm)).map((m) => m[1])]).map(normH).filter(Boolean);
      return Array.from(new Set(all.filter((h, i) => all.indexOf(h) !== i)));
    };
    const dropDuplicateFaqQuestions = (stage: string) => {
      const dups = new Set(dupHeadingsOf());
      for (const sec of art.sections.filter(isFaqSec)) {
        const blocks = faqBlocks(sec.content);
        const removed = blocks.filter((b) => dups.has(normH(b.match(/^###\s+(.+)$/m)?.[1] ?? ""))).map((b) => b.match(/^###\s+(.+)$/m)?.[1] ?? "");
        keepFaq(sec, blocks.filter((b) => !removed.includes(b.match(/^###\s+(.+)$/m)?.[1] ?? "")), stage, removed);
      }
    };
    // FAQ_REPETITION_DROP: an FAQ answer that repeats the article is removed, never rewritten into new filler
    const dropRepeatedFaq = (stage: string) => {
      const nrm = (x: string) => x.toLowerCase().replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
      for (const f of detectPersistedArticleEditorialRepetitionV1(articleBodyToMarkdown(art))) {
        const sec = art.sections[f.sectionIndex];
        if (!sec || !isFaqSec(sec)) continue;
        const blocks = faqBlocks(sec.content);
        const hit = (b: string) => /^###\s/m.test(b) && f.repeatedPhrases.some((p) => nrm(p).length > 12 && nrm(b).includes(nrm(p).slice(0, 60)));
        keepFaq(sec, blocks.filter((b) => !hit(b)), stage, blocks.filter(hit).map((b) => b.match(/^###\s+(.+)$/m)?.[1] ?? ""));
      }
    };
    dropDuplicateFaqQuestions("before_scorecard");
    let dupHeadings = dupHeadingsOf();
    let editorialFindings = detectPersistedArticleEditorialRepetitionV1(articleBodyToMarkdown(art));
    const repairKey = process.env.OPENAI_API_KEY;
    if (editorialFindings.length && !repairKey) log("orchestrator", "EDITORIAL_REPAIR_SKIPPED", { reason: "no OPENAI_API_KEY in env" });
    if (editorialFindings.length && repairKey) {
      const before = editorialFindings.length;
      const repairedIdx: number[] = [];
      const wc = (x: string) => x.split(/\s+/).filter(Boolean).length;
      const tried: number[] = []; // REPAIR_ROUNDS
      for (let round = 0; round < 3 && editorialFindings.length; round++) {
        const f = editorialFindings.find((x) => !tried.includes(x.sectionIndex));
        if (!f) break;
        tried.push(f.sectionIndex);
        const sec = art.sections[f.sectionIndex];
        if (!sec || /faq|frequently asked/i.test(sec.heading)) continue;
        const urls = Array.from(sec.content.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)).map((m) => m[1]);
        const h3s = Array.from(sec.content.matchAll(/^###\s+(.+)$/gm)).map((m) => m[1].trim());
        const others = (f.affectedSections ?? []).filter((i) => i !== f.sectionIndex).map((i) => art.sections[i]?.heading).filter(Boolean);
        const prompt = `You are an editor. Rewrite the article section below so it no longer repeats advice, arguments or stock phrasing already used in other sections (${others.join(" | ")}).
Repeated phrases detected: ${f.repeatedPhrases.join(" | ")}.
Rules:
- Keep every ### subheading EXACTLY as written, in the same order.
- Keep every markdown link EXACTLY (same URL), attached to a claim it supports.
- Keep any table. Do not add new facts, numbers, tools or sources.
- Replace recycled points with angles specific to this section's heading; vary how sources are introduced.
- Keep roughly the same length. Output ONLY the section body in markdown (no H2, no commentary).

SECTION HEADING: ${sec.heading}
SECTION BODY:
${sec.content}`;
        try {
          const res = await fetchRetry("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${repairKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: process.env.OPENAI_CONTENT_MODEL ?? "gpt-4o", messages: [{ role: "user", content: prompt }], max_completion_tokens: 8192 }),
          });
          const j = (await res.json()) as { choices?: { message?: { content?: string } }[]; usage?: Parameters<typeof recordUsage>[1] };
          recordUsage("repetition_repair", j.usage);
          const out = (j.choices?.[0]?.message?.content ?? "").trim().replace(/^```(?:markdown)?\s*/i, "").replace(/```\s*$/, "").trim();
          const outH3 = Array.from(out.matchAll(/^###\s+(.+)$/gm)).map((m) => m[1].trim());
          const okH3 = h3s.every((h) => outH3.includes(h));
          const okLinks = urls.every((u) => out.includes(u));
          const okLen = wc(out) >= wc(sec.content) * 0.7;
          const accepted = !!out && okH3 && okLinks && okLen;
          if (accepted) { sec.content = out; repairedIdx.push(f.sectionIndex); }
          log("orchestrator", "EDITORIAL_REPAIR_ATTEMPT", { section: f.sectionIndex + 1, heading: sec.heading, accepted, okH3, okLinks, okLen, wordsBefore: wc(sec.content), wordsAfter: wc(out) });
        } catch (e) {
          log("orchestrator", "EDITORIAL_REPAIR_ATTEMPT", { section: f.sectionIndex + 1, error: String(e) });
        }
        editorialFindings = detectPersistedArticleEditorialRepetitionV1(articleBodyToMarkdown(art));
      }
      log("orchestrator", "EDITORIAL_REPAIR", { before, after: editorialFindings.length, repaired: repairedIdx.map((i) => i + 1) });
    }
    dropRepeatedFaq("before_scorecard");
    editorialFindings = detectPersistedArticleEditorialRepetitionV1(articleBodyToMarkdown(art));
    log("orchestrator", "EDITORIAL_REPETITION", { count: editorialFindings.length, findings: editorialFindings.slice(0, 5) });

    // EDITORIAL_SCORECARD: score on SEO/Content/E-E-A-T/AEO/GEO/UX/Business -> rewrite only the sections the
    // critic names -> re-score; a rewrite is kept only if the score does not fall and no repetition appears.
    let scorecard: Awaited<ReturnType<typeof runEditorialScorecard>> | null = null;
    if (process.env.WRITER_SCORECARD !== "off") {
      const deadNorm = new Set(Array.from(deadUrls).map(normU));
      const pool = (art.sourcePool ?? []).filter((s) => allowedSet.has(normU(s.url)) && !deadNorm.has(normU(s.url)));
      const internalAbs = (input.internalLinks ?? []).map((l) => l.url).filter((u) => /^https?:\/\//.test(u));
      const scClient = tracked(new OpenAI({ maxRetries: 5, timeout: 180000, apiKey: input.openAiKey }));
      const isProcedural = /how-to|tutorial|recipe|troubleshooting/.test(String(effectiveCategory)) || /^(how (to|do i|do you|can i)|steps? to|ways to)\b|\b(recipe|diy|tutorial|step[- ]by[- ]step)\b/i.test(keywordResult.winner.keyword);
      // a ranking .gov/.edu page (energy.gov on "how do solar panels work") is an official source, not a competitor
      const hostOfUrl = (u: string) => { try { return new URL(u).hostname.toLowerCase(); } catch { return ""; } };
      const authoritySet = new Set((serpAnalysis.authoritySources ?? []).map((r) => normU(r.url)));
      const pageTexts: PageText[] = [
        ...(serpAnalysis.authorityExcerpts ?? []).map((x) => ({ url: x.url, title: x.title, text: x.excerpt, kind: "OFFICIAL" as const, origin: "authority" as const })),
        ...serpAnalysis.pageStructures.filter((p) => (p.excerpt ?? "").length > 300 && !/quora\.com|reddit\.com|forum\.|youtube\.com/i.test(p.url)).map((p) => ({ url: p.url, title: p.title, text: p.excerpt ?? "", kind: authoritySet.has(normU(p.url)) || /\.(gov|edu)$/i.test(hostOfUrl(p.url)) ? ("OFFICIAL" as const) : ("COMPETITOR" as const), position: p.position, origin: "competitor" as const })),
      ];
      const credentials = Buffer.from(`${input.dataForSeoLogin}:${input.dataForSeoPassword}`).toString("base64");
      const h2s = () => art.sections.filter((s) => s.level === 2).map((s) => s.heading);
      const scSources: SourceItem[] = [...pool];
      const scAllowed = new Set([...pool.map((s) => normU(s.url)), ...internalAbs.map(normU)]);
      const evCtx: EvidenceContext = {
        client: scClient,
        keyword: keywordResult.winner.keyword,
        headings: h2s,
        pages: pageTexts,
        authorityDomains: serpAnalysis.authorityDomains ?? [],
        search: async (q) => {
          const auth = serpAnalysis.authorityDomains ?? [];
          const accept = (h: string) => /\.(gov|edu)$/.test(h) || auth.some((d) => h === d || h.endsWith(`.${d}`));
          const g = (await searchOrganicRegular(q, credentials, 5, { accept, resolveMax: 2 })).results;
          const hostIsAuth = (u: string) => { try { return accept(new URL(u).hostname.replace(/^www\./, "")); } catch { return false; } };
          if (g.some((r) => hostIsAuth(r.url))) return g;
          // BING_FALLBACK: Google site: results often arrive as unresolvable goto links
          return [...g, ...(await searchOrganicRegular(q, credentials, 5, { engine: "bing" })).results];
        },
        fetchText: (u) => fetchMainText(u, credentials, 4000),
      };
      const failed = (step: string, e: unknown) => { checkFailures.push(`${step}: ${e instanceof LlmJsonError ? e.message : String(e)}`.slice(0, 300)); checkStatus[step.replace(/_FINAL$/, "")] = "FAILED"; log("orchestrator", "CHECK_FAILED", { step, error: String(e), attempts: e instanceof LlmJsonError ? e.attempts : undefined }); };
      const passed = (step: string) => { if (checkStatus[step] !== "FAILED") checkStatus[step] = "PASSED"; };
      if (!isProcedural) { checkStatus.PROCEDURE_FEASIBILITY = "SKIPPED"; checkStatus.PROCEDURE_ORDER = "SKIPPED"; }
      // TOOLS_COVERAGE (plain code, no model): every tool of the validated plan is named where the article lists equipment
      const planTools = isProcedural ? art.planTools ?? [] : [];
      // STEP_TOOLS: tools the article's own steps use (from the dependency extraction that already runs, no extra call)
      let stepTools: string[] = [];
      if (!planTools.length) checkStatus.TOOLS_COVERAGE = "SKIPPED";
      const toolsIssues = (step: string): ScorecardIssue[] => {
        const wanted = [...planTools, ...stepTools.filter((t) => !planTools.some((p) => toolMentioned(t, p)))];
        if (!wanted.length) return [];
        const { section, missing } = missingPlanTools(wanted, art.sections);
        passed("TOOLS_COVERAGE");
        log("orchestrator", "TOOLS_COVERAGE", { step, section, tools: wanted.map(toolName), fromSteps: stepTools, missing: missing.map(toolName) });
        return missing.map((t): ScorecardIssue => ({
          section, dimension: "content", severity: "critical", source: "tools", key: `tools:${toolName(t).toLowerCase()}`,
          problem: `TOOLS_COVERAGE: a step of the procedure needs "${toolName(t)}", but the equipment list in this section never names it.`,
          fix: `Add "${toolName(t)}" to the equipment list in this section${isOptionalTool(t) ? `, marked optional (if available), and state once what to do without it: ${t}` : ""}. Keep every other item and step unchanged.`,
        }));
      };
      // FORMAT_CONTRACT (plain code): the deliverable of this article's template (table, price up front, decision rules...)
      const formatIssues = (step: string): ScorecardIssue[] => {
        const issues = checkFormat(effectiveCategory, art.sections);
        passed("FORMAT_CONTRACT");
        log("orchestrator", "FORMAT_CHECK", { step, category: effectiveCategory, issues: issues.map((i) => ({ key: i.key, severity: i.severity, section: i.section, problem: i.problem })) });
        return issues;
      };
      const feasibility = async (step: string) => {
        if (!isProcedural) return [];
        try { const r = await checkProcedureFeasibility(scClient, keywordResult.winner.keyword, articleBodyToMarkdown(art), art.researchBrief ?? "", h2s()); passed("PROCEDURE_FEASIBILITY"); return r; } catch (e) { failed(step, e); return []; }
      };
      // PROCEDURE_DEPENDENCY_GRAPH on the article: order problems found by code become critical issues with stable keys
      const orderIssues = async (step: string): Promise<ScorecardIssue[]> => {
        if (!isProcedural) return [];
        try {
          const { steps, violations } = await checkProcedureOrder(scClient, keywordResult.winner.keyword, articleBodyToMarkdown(art), "article");
          passed("PROCEDURE_ORDER");
          // a tool is "taken out" in a step when the article fetches it; every such item and every tool a step uses must be listed
          const toolish = /\b(wrench|gauge|meter|jack|chock|charger|maintainer|inflator|compressor|pump|tester|clamp|brush|gloves?|goggles|glasses|flashlight|screwdriver|pliers|scale|thermometer|ladder|drill|saw|tape|knife|scissors|marker|labels?|boxes|wrap|kit|tool)\b/i;
          stepTools = Array.from(new Set(steps.flatMap((x) => [...x.uses, ...x.obtains]).filter((t) => toolish.test(t)))).slice(0, 12);
          if (stepTools.length) checkStatus.TOOLS_COVERAGE = checkStatus.TOOLS_COVERAGE === "SKIPPED" ? "PASSED" : checkStatus.TOOLS_COVERAGE;
          const heads = h2s();
          const toIssue = (v: OrderViolation): ScorecardIssue => {
            const section = heads.find((h) => h === v.section) ?? heads.find((h) => v.section && h.toLowerCase().includes(v.section.toLowerCase())) ?? heads[0];
            return v.kind === "DUPLICATE_STEP"
              ? { section, dimension: "ux", severity: "major", source: "order", key: `order:dup:${v.item.toLowerCase()}`, problem: `DUPLICATE_STEP: ${v.message}`, fix: "Keep the action once, at its correct place in the sequence, and remove the repeat." }
              : { section, alsoEdit: heads[0] !== section ? [heads[0]] : undefined, dimension: "content", severity: "critical", source: "order", key: `order:${v.kind}:${v.item.toLowerCase()}`, problem: `${v.kind}: ${v.message}`, fix: `Reorder the procedure so "${v.item}" ${v.kind === "USED_BEFORE_OBTAINED" ? "is taken out before the step that uses it" : "exists before the step that needs it"}, in this section and in the numbered summary.` };
          };
          return violations.map(toIssue);
        } catch (e) { failed(step, e); return []; }
      };
      scorecard = await runEditorialScorecard({
        preChecks: async () => {
          const evidence = async () => {
            try {
              // EVIDENCE_POOL: every page the article cites is verified against its own text, not just the competitors we parsed
              const known = new Set(pageTexts.map((p) => normU(p.url)));
              const cited = Array.from(new Set(art.sections.flatMap((s) => Array.from(s.content.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)).map((m) => m[1])))).filter((u) => !known.has(normU(u)) && !internalAbs.some((x) => normU(x) === normU(u)));
              for (const u of cited.slice(0, 5)) {
                const text = await fetchMainText(u, credentials, 4000);
                const src = pool.find((x) => normU(x.url) === normU(u));
                if (text.length > 300) pageTexts.push({ url: u, title: src?.title ?? u, text, kind: src?.kind === "OFFICIAL" ? "OFFICIAL" : "COMPETITOR", origin: "cited" });
              }
              const records = await buildEvidenceContract(evCtx, articleBodyToMarkdown(art));
              passed("EVIDENCE_CONTRACT");
              // TOKEN_BUDGET: recovery searches are optional extra work
              const rec = overBudget() ? (log("orchestrator", "TOKEN_BUDGET_SKIP", { step: "EVIDENCE_RECOVERY", ...usageTotals() }), { records, recovered: [] as { url: string; title: string }[] }) : await recoverEvidence(evCtx, records, articleBodyToMarkdown(art));
              for (const p of rec.recovered) {
                // recovered official pages become citable for the editor
                if (!scAllowed.has(normU(p.url))) { scSources.push({ title: p.title, url: p.url, kind: "OFFICIAL", about: "" }); scAllowed.add(normU(p.url)); }
              }
              evidenceRecords = rec.records;
              return evidenceIssues(rec.records, h2s(), scSources);
            } catch (e) { failed("EVIDENCE_CONTRACT", e); return []; }
          };
          const [f, ev, ord] = await Promise.all([feasibility("PROCEDURE_FEASIBILITY"), evidence(), orderIssues("PROCEDURE_ORDER")]);
          return [...f, ...ev, ...ord, ...toolsIssues("TOOLS_COVERAGE"), ...formatIssues("FORMAT_CHECK")];
        },
        codeCheck: () => [...toolsIssues("TOOLS_COVERAGE_ROUND"), ...formatIssues("FORMAT_CHECK_ROUND")],
        format: formatBlock(formatContract(effectiveCategory)),
        finalCheck: async () => {
          const weak = evidenceRecords.filter((r) => r.critical && ["unsupported", "unverified", "contradicted"].includes(r.status));
          const [f, ev, ord] = await Promise.all([
            feasibility("PROCEDURE_FEASIBILITY_FINAL"),
            orderIssues("PROCEDURE_ORDER_FINAL"),
            (async () => {
              if (!weak.length) return [];
              try {
                const re = await verifyClaims(evCtx, weak, articleBodyToMarkdown(art), evCtx.pages, "EVIDENCE_FINAL_VERIFY");
                evidenceRecords = evidenceRecords.map((r) => re.find((x) => x.claimId === r.claimId) ?? r);
                log("orchestrator", "EVIDENCE_FINAL_VERIFY", { checked: weak.map((r) => r.claimId), after: re.map((r) => ({ claimId: r.claimId, status: r.status, sourceUrl: r.sourceUrl, note: r.note ?? null })) });
                return evidenceIssues(re, h2s(), scSources);
              } catch (e) { failed("EVIDENCE_FINAL_VERIFY", e); return []; }
            })(),
          ]);
          return [...f, ...ev, ...ord, ...toolsIssues("TOOLS_COVERAGE_FINAL"), ...formatIssues("FORMAT_CHECK_FINAL")];
        },
        client: scClient,
        keyword: keywordResult.winner.keyword,
        h1: art.h1,
        meta: art.metaDescription,
        sections: art.sections,
        research: art.researchBrief ?? "",
        questions: serpAnalysis.peopleAlsoAsk ?? [],
        sources: scSources,
        allowedUrls: scAllowed,
        serpAvgWords: serpAnalysis.consensus.avgWordCount,
        toMarkdown: () => articleBodyToMarkdown(art),
        repetitionCount: () => detectPersistedArticleEditorialRepetitionV1(articleBodyToMarkdown(art)).length,
        repetitionPhrases: () => detectPersistedArticleEditorialRepetitionV1(articleBodyToMarkdown(art)).flatMap((f) => [...f.repeatedPhrases]),
        rounds: Number(process.env.WRITER_SCORECARD_ROUNDS ?? 2),
        target: Number(process.env.WRITER_SCORE_TARGET ?? 9.5),
      });
      if (scorecard.repaired.length) {
        log("orchestrator", "CITATION_CAP_AFTER_SCORECARD", capCitations());
        unlinkMarks();
        editorialFindings = detectPersistedArticleEditorialRepetitionV1(articleBodyToMarkdown(art));
      }
    }
    dropDuplicateFaqQuestions("after_scorecard");
    dropRepeatedFaq("after_scorecard");
    dupHeadings = dupHeadingsOf();
    editorialFindings = detectPersistedArticleEditorialRepetitionV1(articleBodyToMarkdown(art));
    const body = art.sections.map((s) => s.content).join("\n");
    const headingList = art.sections.flatMap((s) => [s.heading, ...Array.from(s.content.matchAll(/^###\s+(.+)$/gm)).map((m) => m[1])]);
    const topicOverlap = (topic: string, h: string) => {
      const A = hTok(topic), B = hTok(h);
      if (!A.size || !B.size) return 0;
      let n = 0; A.forEach((w) => { if (B.has(w)) n++; });
      return n / A.size;
    };
    // topics deliberately moved to the FAQ candidates (over the section budget) are not required as headings
    const uncovered = serpAnalysis.consensus.mustCoverTopics.filter((t) => !overflowTopics.includes(t) && !headingList.some((h) => topicOverlap(t, h) >= 0.6));
    const linkCount = (body.match(/\]\(https?:\/\/[^)]+\)/g) ?? []).length;
    const h3Count = (body.match(/^###\s+/gm) ?? []).length + art.sections.filter((s) => s.level === 3).length;
    const hasFaq = art.sections.some((s) => /faq|frequently asked/i.test(s.heading));
    const minScore = Number(process.env.WRITER_MIN_SCORE ?? 9);
    const failures = [
      uncovered.length ? `uncovered topics: ${uncovered.join(", ")}` : "",
      linkCount < 3 ? `only ${linkCount} source links` : "",
      h3Count < 3 ? `only ${h3Count} H3` : "",
      hasFaq ? "" : "no FAQ",
      editorialFindings.length ? `editorial repetition (same check as Hyprlyx UI) in section(s): ${editorialFindings.map((f) => f.sectionIndex + 1).join(", ")}` : "",
      dupHeadings.length ? `duplicate headings: ${dupHeadings.join(" | ")}` : "",
      serpAnalysis.pageStructures.length < 3 ? `research incomplete: only ${serpAnalysis.pageStructures.length} competitor pages analyzed` : "",
      // ISSUE_CLOSURE: a good average never passes an article with an unresolved critical problem
      scorecard && scorecard.openCritical.length ? `${scorecard.openCritical.length} open critical issue(s): ${scorecard.openCritical.map((e) => `${e.id} ${e.section}`).join(" | ")}` : "",
      scorecard?.final && scorecard.final.overall < minScore ? `editorial score ${scorecard.final.overall} < ${minScore}` : "",
    ].filter(Boolean);
    const plannedWords = Math.max(targetWordCount, outline.length * 320);
    const nowWords = art.sections.reduce((n, s) => n + s.content.split(/\s+/).filter(Boolean).length, 0); // after FAQ dedupe and repairs
    const overshoot = Math.round(((nowWords - plannedWords) / plannedWords) * 100);
    const finalScore = scorecard?.final ?? null;
    const weakest = finalScore ? Object.entries(finalScore.scores).filter(([, v]) => v < 9).map(([k, v]) => `${k} ${v}`) : [];
    const warnings = [overshoot > 25 ? `length ${overshoot}% over target (${nowWords} vs ${plannedWords} planned): check sections for padding` : "", nowWords > targetWordCount * 1.2 ? `length ${nowWords} vs target ${targetWordCount} (+${Math.round((nowWords / targetWordCount - 1) * 100)}%)` : "", nowWords > serpAnalysis.consensus.avgWordCount * 1.6 ? `length ${nowWords} vs SERP avg ${serpAnalysis.consensus.avgWordCount}: consider merging overlapping sections` : "", deadUrls.size ? `${deadUrls.size} dead link(s) removed` : "", repaired ? `${repaired} mistyped link(s) repaired` : "", unlinked ? `${unlinked} off-list link(s) removed` : "", finalScore && finalScore.overall < 9 ? `editorial score ${finalScore.overall}/10 (below 9: ${weakest.join(", ")})` : "", ...(scorecard?.codeGaps ?? []).map((g) => `format gap in "${g.section}": ${g.problem}`)].filter(Boolean);
    const uniqueSources = new Set(Array.from(body.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)).map((m) => normU(m[1]))).size;
    log("orchestrator", "QUALITY_GATE", { passed: failures.length === 0, failures, warnings, linkCount, uniqueSources, h3Count, uncovered, competitorPages: serpAnalysis.pageStructures.length, editorialScore: finalScore?.overall ?? null, editorialScoreBefore: scorecard?.initial?.overall ?? null, scores: finalScore?.scores ?? null });
    readiness = evaluateReadiness({
      qualityFailures: failures.filter((f) => !/open critical issue|editorial score/.test(f)),
      finalScore: finalScore?.overall ?? null,
      minScore,
      openCritical: scorecard?.openCritical ?? [],
      evidence: evidenceRecords,
      checkFailures,
      checkStatus: { ...checkStatus, EDITORIAL_SCORECARD: scorecard ? (scorecard.final ? "PASSED" : "FAILED") : "SKIPPED" },
    });
    log("orchestrator", "PUBLICATION_READINESS", readiness as unknown as Record<string, unknown>);
  }

  {
    // FINAL_METRICS: recount after FAQ removal, repairs and unlinking
    const finalWords = article.sections.reduce((n, sec) => n + sec.content.split(/\s+/).filter(Boolean).length, 0);
    log("orchestrator", "FINAL_METRICS", { wordsBeforePostprocess: article.totalWordCount, finalWords, sections: article.sections.length });
    article.totalWordCount = finalWords;
  }
  logUsage();
  console.log(usageLine());
  log("orchestrator", "PIPELINE_COMPLETE", {
    keyword: article.keyword,
    h1: article.title,
    totalWordCount: article.totalWordCount,
    logFile,
  });

  return {
    logFile,
    article: {
      title: article.title,
      metaDescription: article.metaDescription,
      h1: article.h1,
      body: articleBodyToMarkdown(article),
      bodyMarkdown: articleBodyToMarkdown(article),
      totalWordCount: article.totalWordCount,
      keyword: article.keyword,
    },
    readiness,
    evidence: evidenceRecords,
  };
}


async function fetchRetry(url: string, init?: RequestInit, tries = 5): Promise<Response> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { ...init, signal: AbortSignal.timeout(120000) });
      if (r.status === 429 || r.status >= 500) throw new Error("HTTP " + r.status);
      return r;
    } catch (e) {
      last = e;
      console.warn("[orchestrator] OPENAI_RETRY", { attempt: i + 1, error: String(e) });
      await new Promise(res => setTimeout(res, 1000 * 2 ** i));
    }
  }
  throw last;
}
