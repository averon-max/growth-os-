// PLAN_BINDING: the validated procedure plan is the single source of truth for the article.
// - its tools list is handed to the section that lists equipment, so a tool a later step needs
//   (a pressure gauge, a torque wrench) cannot silently drop out of the article;
// - TOOLS_COVERAGE checks that with plain code (no model): every plan tool must be named in the
//   article's equipment section, otherwise it is a critical issue that only this check can close.

// Heading of the section that lists what the reader needs ("kit" only when nothing stronger matches:
// "Use a Tire Repair Kit Instead" is not an equipment list)
const TOOLS_STRONG = /\b(tools?|equipment|gather|supplies|what you(?:'|’)?ll need|what you need|materials|ingredients)\b/i;
const TOOLS_WEAK = /\bkit\b/i;
/** Index of the equipment section among the headings, or -1. The FAQ never counts. */
export function toolsSectionIndex(headings: string[]): number {
  const ok = (h: string) => !/faq|frequently asked/i.test(h);
  const i = headings.findIndex((h) => ok(h) && TOOLS_STRONG.test(h));
  return i >= 0 ? i : headings.findIndex((h) => ok(h) && TOOLS_WEAK.test(h));
}
const HEAD_WORDS = /\b(tools?|supplies|equipment|ingredients|materials|what you(?:'|’)?ll need|what you need|kit)\b/i;
const SECTION_WORDS = /\b(schedule|steps?|procedure|readiness|success|criteria|safety|stop|table|timeline|instructions|method|sequence|notes?|tips?|warnings?|rules?|signs?|look for)\b/i;

/** A heading-like line: "## Tools", "**Tools**", "1) Tools and ingredients", "Tools: a, b". */
function headingOf(line: string): { label: string; rest: string } | null {
  let m: RegExpMatchArray | null;
  if ((m = line.match(/^\s*#{1,6}\s+(.+?)\s*#*\s*$/))) return { label: m[1].replace(/\*\*/g, ""), rest: "" };
  if ((m = line.match(/^\s*\*\*(.+?)\*\*\s*:?\s*(.*)$/))) return { label: m[1].replace(/:$/, ""), rest: m[2] };
  if ((m = line.match(/^\s*\d+[.)]\s+\**([^:*]{1,80})\**:\s*(.*)$/))) return { label: m[1], rest: m[2] };
  if ((m = line.match(/^\s*\d+[.)]\s+\**(.{1,80}?)\**\s*$/))) return { label: m[1], rest: "" };
  if ((m = line.match(/^\s*([A-Za-z][^:|]{0,60}):\s*(.*)$/))) return { label: m[1], rest: m[2] };
  return null;
}

/** Splits an inline list ("a, b; c and d") outside parentheses. */
function splitInline(text: string): string[] {
  return text
    .split(/[;,](?![^()]*\))/)
    .map((x) => x.trim().replace(/^(?:and|or|plus)\s+/i, "").replace(/[.\s]+$/, ""))
    .filter(Boolean);
}

/** Items of the plan's tools / supplies / ingredients list (bullets, numbered lines, a table or an inline list). */
export function extractPlanTools(plan: string): string[] {
  const lines = plan.split("\n");
  const start = lines.findIndex((l) => {
    const h = headingOf(l);
    return !!h && HEAD_WORDS.test(h.label) && h.label.trim().split(/\s+/).length <= 8 && !/\b(if|when|unless)\b/i.test(h.label);
  });
  if (start < 0) return [];
  const items: string[] = [];
  const head = headingOf(lines[start])!;
  if (head.rest.trim()) items.push(...splitInline(head.rest));
  let table = false;
  for (const l of lines.slice(start + 1)) {
    if (!l.trim()) continue;
    if (/^\s*#/.test(l)) break;
    if (/^\s*\|/.test(l)) {
      // a tools table directly under the heading: take the first column of its data rows
      if (items.length && !table) break; // a table after the list is the schedule
      table = true;
      const cells = l.split("|").slice(1, -1).map((c) => c.trim());
      if (cells.every((c) => /^:?-{2,}:?$/.test(c)) || /^(tool|item|equipment|ingredient|material|supply)s?$/i.test(cells[0] ?? "")) continue;
      if (cells[0]) items.push(cells[0].replace(/\*\*/g, ""));
      continue;
    }
    if (table) break;
    const h = headingOf(l);
    if (h && SECTION_WORDS.test(h.label) && !/^\s*(?:[-*•+])\s/.test(l)) break;
    const bullet = l.match(/^\s*(?:[-*•+]|\d+[.)])\s+(.*)$/);
    if (bullet) items.push(bullet[1].trim().replace(/[.\s]+$/, ""));
    else items.push(...splitInline(l));
  }
  return items.map((x) => x.replace(/\*\*/g, "").trim()).filter((x) => x.length > 2 && x.length < 200);
}

/** The name part of a list item: "Torque wrench (if available) – to tighten…" -> "Torque wrench". */
export function toolName(item: string): string {
  return item
    .replace(/\*\*/g, "")
    .replace(/[’‘]/g, "'")
    .replace(/\([^)]*\)/g, " ")
    .split(/\s[–—-]\s|[,;:]|\s(?:if|when|unless|for|to|so)\s/i)[0]
    .replace(/\s+/g, " ")
    .trim();
}

const GENERIC = new Set("vehicle approved specific required available properly inflated matching suitable standard your with when supplied optional manufacturer provided factory proper good working small large correct appropriate pair basic emergency portable extra spare's that this the and for you use any one two all per its not but can may our out off own set new old get".split(" "));
const stem = (w: string) => w.replace(/'s$/, "").replace(/(?<!s)s$/, "").slice(0, 4);
const stemsOf = (x: string) => x.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9'\s/-]/g, " ").split(/[\s/-]+/).map((w) => w.replace(/^'+|'+$/g, "")).filter((w) => w.length >= 3 && !GENERIC.has(w)).map(stem);

/**
 * True when the text names the item. "/" and "or" are alternatives, "and" joins parts that must all appear;
 * a part matches when its head noun (last key word) and at least half of its other key words are present.
 */
export function toolMentioned(item: string, text: string): boolean {
  const t = new Set(stemsOf(text));
  const parts = toolName(item).toLowerCase().replace(/\band\/or\b/g, " or ").split(/\s+and\s+|\s*&\s*/);
  const checkable = parts.map((p) => p.split(/\s*\/\s*|\s+or\s+/).map(stemsOf).filter((a) => a.length)).filter((alts) => alts.length);
  if (!checkable.length) return true; // nothing checkable in this item
  return checkable.every((alts) => alts.some((ws) => {
    const head = ws[ws.length - 1];
    const others = ws.slice(0, -1);
    return t.has(head) && others.filter((w) => t.has(w)).length >= Math.ceil(others.length / 2);
  }));
}

export const isOptionalTool = (item: string) => /\b(?:if|when) (?:available|required|needed|equipped|supplied|provided)\b|\boptional\b/i.test(item);

/** Plan tools the article never names in its equipment section (or anywhere, if it has none). Only ## sections are used: repairs edit ## sections. */
export function missingPlanTools(planTools: string[], sections: { heading: string; content: string; level: number }[]): { section: string; missing: string[] } {
  const h2 = sections.filter((s) => s.level === 2 && !/faq|frequently asked/i.test(s.heading));
  const toolsSec = h2[toolsSectionIndex(h2.map((s) => s.heading))];
  const text = toolsSec ? `${toolsSec.heading}\n${toolsSec.content}` : h2.map((s) => `${s.heading}\n${s.content}`).join("\n");
  return { section: toolsSec?.heading ?? h2[0]?.heading ?? "", missing: planTools.filter((t) => !toolMentioned(t, text)) };
}
