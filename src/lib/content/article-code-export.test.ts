import { describe, expect, it } from "vitest";
import { CODE_VARIANTS, articleFromPayload, exportArticle, parseArticle } from "./article-code-export";

const md = `# How to Change a Car Tire Safely

Meta: Learn how to change a tire <safely> & quickly.

## Change a Tire Step by Step

Pull over **far** from traffic ([NHTSA](https://www.nhtsa.gov/tires)). Keep {calm}.

| Step | Action | What to check |
|---|---|---|
| 1 | Turn on hazards and stop | Level ground |
| 2 | Set the parking brake | Car does not roll |

### Tools You Need

- Jack
- Lug wrench

## Frequently Asked Questions

### Can I drive on a spare?

Yes, slowly and only to a tire shop.

### How tight should lug nuts be?

Use the torque in the owner's manual.
`;

describe("ARTICLE_CODE_EXPORT: one article, every code variant, deterministic", () => {
  const input = { markdown: md };
  it("parses title, meta, FAQ and HowTo steps", () => {
    const a = parseArticle(input);
    expect(a.title).toBe("How to Change a Car Tire Safely");
    expect(a.meta).toBe("Learn how to change a tire <safely> & quickly.");
    expect(a.faq.map((f) => f.q)).toEqual(["Can I drive on a spare?", "How tight should lug nuts be?"]);
    expect(a.steps).toEqual(["Turn on hazards and stop", "Set the parking brake"]);
  });
  it("HTML is escaped, has heading ids, the table and safe links", () => {
    const h = exportArticle(input, "html");
    expect(h.includes('<h2 id="change-a-tire-step-by-step">')).toBe(true);
    expect(h.includes("<th>Step</th>")).toBe(true);
    expect(h.includes('<a href="https://www.nhtsa.gov/tires" rel="noopener">NHTSA</a>')).toBe(true);
    expect(h.includes("<strong>far</strong>")).toBe(true);
  });
  it("schema has Article, FAQPage and HowTo, and is valid JSON", () => {
    const s = JSON.parse(exportArticle(input, "schema")) as { "@type": string }[];
    expect(s.map((x) => x["@type"])).toEqual(["Article", "FAQPage", "HowTo"]);
    expect(exportArticle(input, "html-schema").includes('<script type="application/ld+json">')).toBe(true);
  });
  it("WordPress output is balanced Gutenberg blocks", () => {
    const w = exportArticle(input, "wordpress");
    const open = (w.match(/<!-- wp:[a-z-]+/g) ?? []).length, close = (w.match(/<!-- \/wp:[a-z-]+ -->/g) ?? []).length;
    expect(open === close && open > 5).toBe(true);
    expect(w.includes('<!-- wp:heading {"level":3} -->')).toBe(true);
  });
  it("React output escapes braces and angle brackets in text", () => {
    const r = exportArticle(input, "react");
    expect(r.includes('Keep {"{"}calm{"}"}.')).toBe(true);
    expect(r.includes("export default function Article()")).toBe(true);
  });
  it("JSON and Markdown round-trip; every variant is deterministic", () => {
    const j = JSON.parse(exportArticle(input, "json")) as { sections: { heading: string }[]; faq: unknown[] };
    expect(j.sections.map((s) => s.heading)).toEqual(["Change a Tire Step by Step", "Frequently Asked Questions"]);
    const again = parseArticle({ markdown: exportArticle(input, "markdown").replace(/^---[\s\S]*?---\n/, "") });
    expect(again.faq).toHaveLength(2);
    for (const v of CODE_VARIANTS) expect(exportArticle(input, v.id)).toBe(exportArticle(input, v.id));
  });
  it("finds the article in an API payload", () => {
    const a = articleFromPayload({ ok: true, article: { id: 7, h1: "Title X", metaDescription: "Meta X", bodyMarkdown: "## A\n\nText." } });
    expect(a?.title).toBe("Title X");
    expect(a?.markdown).toBe("## A\n\nText.");
    expect(articleFromPayload({ nothing: 1 })).toBe(null);
  });
});
