// ARTICLE_CODE_EXPORT: turns one article (markdown) into ready-to-paste code variants. Pure and deterministic:
// the same article always gives the same code, no model is involved. Used by the "Code" button of every article.

export type CodeVariant = "markdown" | "html" | "html-schema" | "wordpress" | "react" | "json" | "schema";

export const CODE_VARIANTS: { id: CodeVariant; label: string; ext: string; mime: string }[] = [
  { id: "html", label: "HTML", ext: "html", mime: "text/html" },
  { id: "html-schema", label: "HTML + Schema", ext: "html", mime: "text/html" },
  { id: "wordpress", label: "WordPress (Gutenberg)", ext: "html", mime: "text/html" },
  { id: "react", label: "React / Next.js (TSX)", ext: "tsx", mime: "text/plain" },
  { id: "markdown", label: "Markdown", ext: "md", mime: "text/markdown" },
  { id: "json", label: "JSON", ext: "json", mime: "application/json" },
  { id: "schema", label: "JSON-LD Schema", ext: "json", mime: "application/ld+json" },
];

export interface ArticleInput {
  title?: string;
  meta?: string;
  markdown: string;
  url?: string;
  author?: string;
  datePublished?: string;
}

export type Inline = { t: "text"; v: string } | { t: "strong" | "em"; c: Inline[] } | { t: "code"; v: string } | { t: "link"; href: string; c: Inline[] };
export type Block =
  | { t: "heading"; level: 2 | 3 | 4; text: string; id: string }
  | { t: "p"; c: Inline[] }
  | { t: "list"; ordered: boolean; items: Inline[][] }
  | { t: "table"; head: Inline[][]; rows: Inline[][][] }
  | { t: "quote"; c: Inline[] }
  | { t: "hr" };

export interface ParsedArticle {
  title: string;
  meta: string;
  blocks: Block[];
  faq: { q: string; a: string }[];
  steps: string[];
}

export const slugify = (x: string) => x.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "section";

/** Inline markdown: **bold**, *em* / _em_, `code`, [text](url). */
export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let i = 0, buf = "";
  const flush = () => { if (buf) { out.push({ t: "text", v: buf }); buf = ""; } };
  while (i < src.length) {
    const rest = src.slice(i);
    let m: RegExpMatchArray | null;
    if ((m = rest.match(/^\[([^\]]+)\]\(([^)\s]+)\)/))) { flush(); out.push({ t: "link", href: m[2], c: parseInline(m[1]) }); i += m[0].length; continue; }
    if ((m = rest.match(/^\*\*([^*]+?)\*\*/)) || (m = rest.match(/^__([^_]+?)__/))) { flush(); out.push({ t: "strong", c: parseInline(m[1]) }); i += m[0].length; continue; }
    if ((m = rest.match(/^\*([^*\s][^*]*?)\*/)) || (m = rest.match(/^_([^_\s][^_]*?)_(?![a-z0-9])/i))) { flush(); out.push({ t: "em", c: parseInline(m[1]) }); i += m[0].length; continue; }
    if ((m = rest.match(/^`([^`]+)`/))) { flush(); out.push({ t: "code", v: m[1] }); i += m[0].length; continue; }
    buf += src[i++];
  }
  flush();
  return out;
}

export const plain = (c: Inline[]): string => c.map((x) => (x.t === "text" || x.t === "code" ? x.v : plain(x.c))).join("");
const cells = (line: string) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
const isSep = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);

export function parseArticle(input: ArticleInput): ParsedArticle {
  const lines = input.markdown.replace(/\r\n?/g, "\n").split("\n");
  let title = input.title?.trim() ?? "";
  let meta = input.meta?.trim() ?? "";
  const blocks: Block[] = [];
  const ids = new Map<string, number>();
  const uniqueId = (text: string) => { const base = slugify(text); const n = ids.get(base) ?? 0; ids.set(base, n + 1); return n ? `${base}-${n + 1}` : base; };
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^#\s+(.+)$/))) { if (!title) title = m[1].trim(); i++; continue; }
    if ((m = line.match(/^Meta(?: description)?:\s*(.+)$/i)) && !blocks.length) { if (!meta) meta = m[1].trim(); i++; continue; }
    if ((m = line.match(/^(#{2,4})\s+(.+?)\s*#*$/))) { const text = m[2].replace(/\*\*/g, "").trim(); blocks.push({ t: "heading", level: m[1].length as 2 | 3 | 4, text, id: uniqueId(text) }); i++; continue; }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { blocks.push({ t: "hr" }); i++; continue; }
    if (/^\s*\|/.test(line) && i + 1 < lines.length && isSep(lines[i + 1])) {
      const head = cells(line).map(parseInline);
      const rows: Inline[][][] = [];
      i += 2;
      while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(cells(lines[i]).map(parseInline)); i++; }
      blocks.push({ t: "table", head, rows });
      continue;
    }
    if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: Inline[][] = [];
      while (i < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) {
        let text = lines[i].replace(/^\s*([-*+]|\d+[.)])\s+/, "").replace(/^\[[ xX]\]\s+/, "");
        i++;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) text += " " + lines[i++].trim();
        items.push(parseInline(text));
      }
      blocks.push({ t: "list", ordered, items });
      continue;
    }
    if (/^\s*>/.test(line)) {
      const q: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) q.push(lines[i++].replace(/^\s*>\s?/, ""));
      blocks.push({ t: "quote", c: parseInline(q.join(" ")) });
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|\s*\||\s*([-*+]|\d+[.)])\s+|\s*>)/.test(lines[i])) para.push(lines[i++].trim());
    if (para.length) blocks.push({ t: "p", c: parseInline(para.join(" ")) });
    else i++;
  }
  // FAQ: ### questions under the FAQ ## heading
  const faq: { q: string; a: string }[] = [];
  let inFaq = false, cur: { q: string; a: string[] } | null = null;
  const pushCur = () => { if (cur && cur.a.length) faq.push({ q: cur.q, a: cur.a.join(" ") }); cur = null; };
  for (const b of blocks) {
    if (b.t === "heading" && b.level === 2) { pushCur(); inFaq = /faq|frequently asked/i.test(b.text); continue; }
    if (!inFaq) continue;
    if (b.t === "heading") { pushCur(); cur = { q: b.text, a: [] }; continue; }
    if (cur) cur.a.push(b.t === "p" || b.t === "quote" ? plain(b.c) : b.t === "list" ? b.items.map(plain).join("; ") : "");
  }
  pushCur();
  // HowTo steps: a table with a Step/Action column, else the first ordered list (only for "How to" titles)
  let steps: string[] = [];
  if (/^how to\b/i.test(title)) {
    const tbl = blocks.find((b): b is Extract<Block, { t: "table" }> => b.t === "table" && b.head.some((h) => /^step$/i.test(plain(h))));
    if (tbl) {
      const ai = tbl.head.findIndex((h) => /action|what to do|task|instruction/i.test(plain(h)));
      const col = ai >= 0 ? ai : Math.min(1, tbl.head.length - 1);
      steps = tbl.rows.map((r) => plain(r[col] ?? [])).filter(Boolean);
    } else {
      const ol = blocks.find((b): b is Extract<Block, { t: "list" }> => b.t === "list" && b.ordered);
      steps = ol ? ol.items.map(plain) : [];
    }
  }
  return { title, meta, blocks, faq, steps };
}

// ---------- renderers ----------
const esc = (x: string) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const safeHref = (h: string) => (/^(https?:\/\/|\/|#|mailto:)/i.test(h) ? h : "#");
const linkAttrs = (h: string) => (/^https?:\/\//i.test(h) ? ` href="${esc(safeHref(h))}" rel="noopener"` : ` href="${esc(safeHref(h))}"`);

export function inlineHtml(c: Inline[]): string {
  return c.map((x) => x.t === "text" ? esc(x.v) : x.t === "code" ? `<code>${esc(x.v)}</code>` : x.t === "link" ? `<a${linkAttrs(x.href)}>${inlineHtml(x.c)}</a>` : `<${x.t}>${inlineHtml(x.c)}</${x.t}>`).join("");
}
const tableHtml = (b: Extract<Block, { t: "table" }>, ind = "") => `${ind}<table>\n${ind}  <thead><tr>${b.head.map((h) => `<th>${inlineHtml(h)}</th>`).join("")}</tr></thead>\n${ind}  <tbody>\n${b.rows.map((r) => `${ind}    <tr>${b.head.map((_h, k) => `<td>${inlineHtml(r[k] ?? [])}</td>`).join("")}</tr>`).join("\n")}\n${ind}  </tbody>\n${ind}</table>`;

function blocksHtml(blocks: Block[], ind = "  "): string {
  return blocks.map((b) => {
    switch (b.t) {
      case "heading": return `${ind}<h${b.level} id="${b.id}">${esc(b.text)}</h${b.level}>`;
      case "p": return `${ind}<p>${inlineHtml(b.c)}</p>`;
      case "list": return `${ind}<${b.ordered ? "ol" : "ul"}>\n${b.items.map((it) => `${ind}  <li>${inlineHtml(it)}</li>`).join("\n")}\n${ind}</${b.ordered ? "ol" : "ul"}>`;
      case "table": return tableHtml(b, ind);
      case "quote": return `${ind}<blockquote><p>${inlineHtml(b.c)}</p></blockquote>`;
      case "hr": return `${ind}<hr>`;
    }
  }).join("\n");
}

export function toHtml(a: ParsedArticle): string {
  return `<article>\n  <h1>${esc(a.title)}</h1>\n${blocksHtml(a.blocks)}\n</article>\n`;
}

export function toSchema(a: ParsedArticle, input: Pick<ArticleInput, "url" | "author" | "datePublished"> = {}): Record<string, unknown>[] {
  const article: Record<string, unknown> = { "@context": "https://schema.org", "@type": "Article", headline: a.title.slice(0, 110), description: a.meta || undefined, inLanguage: "en-US" };
  if (input.url) { article.url = input.url; article.mainEntityOfPage = input.url; }
  if (input.author) article.author = { "@type": "Person", name: input.author };
  if (input.datePublished) article.datePublished = input.datePublished;
  const out: Record<string, unknown>[] = [JSON.parse(JSON.stringify(article))];
  if (a.faq.length) out.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: a.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) });
  if (a.steps.length >= 2) out.push({ "@context": "https://schema.org", "@type": "HowTo", name: a.title, step: a.steps.map((s, k) => ({ "@type": "HowToStep", position: k + 1, text: s })) });
  return out;
}

const schemaScripts = (a: ParsedArticle, input: ArticleInput) => toSchema(a, input).map((s) => `<script type="application/ld+json">\n${JSON.stringify(s, null, 2).replace(/</g, "\\u003c")}\n</script>`).join("\n");

export function toHtmlWithSchema(a: ParsedArticle, input: ArticleInput): string {
  return `${schemaScripts(a, input)}\n${toHtml(a)}`;
}

export function toWordPress(a: ParsedArticle): string {
  const block = (name: string, html: string, attrs?: Record<string, unknown>) => `<!-- wp:${name}${attrs ? ` ${JSON.stringify(attrs)}` : ""} -->\n${html}\n<!-- /wp:${name} -->`;
  const body = a.blocks.map((b) => {
    switch (b.t) {
      case "heading": return block("heading", `<h${b.level} class="wp-block-heading" id="${b.id}">${esc(b.text)}</h${b.level}>`, b.level === 2 ? undefined : { level: b.level });
      case "p": return block("paragraph", `<p>${inlineHtml(b.c)}</p>`);
      case "list": return block("list", `<${b.ordered ? "ol" : "ul"} class="wp-block-list">${b.items.map((it) => `<!-- wp:list-item -->\n<li>${inlineHtml(it)}</li>\n<!-- /wp:list-item -->`).join("")}</${b.ordered ? "ol" : "ul"}>`, b.ordered ? { ordered: true } : undefined);
      case "table": return block("table", `<figure class="wp-block-table">${tableHtml(b).replace(/\n\s*/g, "")}</figure>`);
      case "quote": return block("quote", `<blockquote class="wp-block-quote"><p>${inlineHtml(b.c)}</p></blockquote>`);
      case "hr": return block("separator", `<hr class="wp-block-separator has-alpha-channel-opacity"/>`);
    }
  }).join("\n\n");
  return `<!-- Title: ${esc(a.title).replace(/--/g, "- -")} -->\n${a.meta ? `<!-- Meta description: ${esc(a.meta).replace(/--/g, "- -")} -->\n` : ""}\n${body}\n`;
}

// JSX text: entities for & < >, braces as expressions
const jsxText = (x: string) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/[{}]/g, (b) => `{"${b}"}`);
function inlineJsx(c: Inline[]): string {
  return c.map((x) => x.t === "text" ? jsxText(x.v) : x.t === "code" ? `<code>${jsxText(x.v)}</code>` : x.t === "link" ? `<a href=${JSON.stringify(safeHref(x.href))}${/^https?:\/\//i.test(x.href) ? ' rel="noopener"' : ""}>${inlineJsx(x.c)}</a>` : `<${x.t}>${inlineJsx(x.c)}</${x.t}>`).join("");
}

export function toReact(a: ParsedArticle, componentName = "Article"): string {
  const ind = "      ";
  const body = a.blocks.map((b) => {
    switch (b.t) {
      case "heading": return `${ind}<h${b.level} id="${b.id}">${jsxText(b.text)}</h${b.level}>`;
      case "p": return `${ind}<p>${inlineJsx(b.c)}</p>`;
      case "list": return `${ind}<${b.ordered ? "ol" : "ul"}>\n${b.items.map((it) => `${ind}  <li>${inlineJsx(it)}</li>`).join("\n")}\n${ind}</${b.ordered ? "ol" : "ul"}>`;
      case "table": return `${ind}<table>\n${ind}  <thead>\n${ind}    <tr>${b.head.map((h) => `<th>${inlineJsx(h)}</th>`).join("")}</tr>\n${ind}  </thead>\n${ind}  <tbody>\n${b.rows.map((r) => `${ind}    <tr>${b.head.map((_h, k) => `<td>${inlineJsx(r[k] ?? [])}</td>`).join("")}</tr>`).join("\n")}\n${ind}  </tbody>\n${ind}</table>`;
      case "quote": return `${ind}<blockquote><p>${inlineJsx(b.c)}</p></blockquote>`;
      case "hr": return `${ind}<hr />`;
    }
  }).join("\n");
  const schema = toSchema(a);
  return `// Generated from the article "${a.title.replace(/[\r\n]/g, " ")}". Drop into a Next.js app (app/ or pages/).
export const metadata = {
  title: ${JSON.stringify(a.title)},
  description: ${JSON.stringify(a.meta)},
};

const schema = ${JSON.stringify(schema, null, 2)};

export default function ${componentName}() {
  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\\\u003c") }} />
      <h1>${jsxText(a.title)}</h1>
${body}
    </article>
  );
}
`;
}

export function toMarkdown(a: ParsedArticle): string {
  const inl = (c: Inline[]): string => c.map((x) => x.t === "text" ? x.v : x.t === "code" ? `\`${x.v}\`` : x.t === "link" ? `[${inl(x.c)}](${x.href})` : x.t === "strong" ? `**${inl(x.c)}**` : `*${inl(x.c)}*`).join("");
  const body = a.blocks.map((b) => {
    switch (b.t) {
      case "heading": return `${"#".repeat(b.level)} ${b.text}`;
      case "p": return inl(b.c);
      case "list": return b.items.map((it, k) => `${b.ordered ? `${k + 1}.` : "-"} ${inl(it)}`).join("\n");
      case "table": return [`| ${b.head.map(inl).join(" | ")} |`, `|${b.head.map(() => "---").join("|")}|`, ...b.rows.map((r) => `| ${b.head.map((_h, k) => inl(r[k] ?? [])).join(" | ")} |`)].join("\n");
      case "quote": return `> ${inl(b.c)}`;
      case "hr": return "---";
    }
  }).join("\n\n");
  return `---\ntitle: ${JSON.stringify(a.title)}\ndescription: ${JSON.stringify(a.meta)}\n---\n\n# ${a.title}\n\n${body}\n`;
}

export function toJson(a: ParsedArticle): string {
  const sections: { heading: string; id: string; level: number; html: string; text: string }[] = [];
  let cur: { heading: string; id: string; level: number; blocks: Block[] } | null = null;
  const intro: Block[] = [];
  const close = () => { if (cur) sections.push({ heading: cur.heading, id: cur.id, level: cur.level, html: blocksHtml(cur.blocks, "").trim(), text: cur.blocks.map((b) => (b.t === "p" || b.t === "quote" ? plain(b.c) : b.t === "list" ? b.items.map(plain).join("\n") : b.t === "heading" ? b.text : b.t === "table" ? [b.head.map(plain).join(" | "), ...b.rows.map((r) => r.map(plain).join(" | "))].join("\n") : "")).filter(Boolean).join("\n\n") }); };
  for (const b of a.blocks) {
    if (b.t === "heading" && b.level === 2) { close(); cur = { heading: b.text, id: b.id, level: 2, blocks: [] }; continue; }
    (cur ? cur.blocks : intro).push(b);
  }
  close();
  return JSON.stringify({ title: a.title, metaDescription: a.meta, intro: blocksHtml(intro, "").trim() || undefined, sections, faq: a.faq, howToSteps: a.steps.length >= 2 ? a.steps : undefined, schema: toSchema(a) }, null, 2) + "\n";
}

/** One call for the UI: the code of a variant. */
export function exportArticle(input: ArticleInput, variant: CodeVariant): string {
  const a = parseArticle(input);
  switch (variant) {
    case "html": return toHtml(a);
    case "html-schema": return toHtmlWithSchema(a, input);
    case "wordpress": return toWordPress(a);
    case "react": return toReact(a);
    case "markdown": return toMarkdown(a);
    case "json": return toJson(a);
    case "schema": return JSON.stringify(toSchema(a, input), null, 2) + "\n";
  }
}

/** Finds the article in any API payload: the markdown body, the title and the meta description. */
export function articleFromPayload(payload: unknown): ArticleInput | null {
  const strings: { key: string; v: string }[] = [];
  const walk = (x: unknown, key: string, depth: number) => {
    if (depth > 5 || x === null || x === undefined) return;
    if (typeof x === "string") strings.push({ key, v: x });
    else if (Array.isArray(x)) x.slice(0, 50).forEach((y) => walk(y, key, depth + 1));
    else if (typeof x === "object") for (const [k, v] of Object.entries(x as Record<string, unknown>)) walk(v, k, depth + 1);
  };
  walk(payload, "", 0);
  const byKey = (re: RegExp) => strings.find((s) => re.test(s.key) && s.v.trim())?.v;
  const md = byKey(/^(bodyMarkdown|markdown|body_markdown|contentMarkdown)$/i)
    ?? strings.filter((s) => /\n#{2,3}\s/.test(s.v) && !/^\s*</.test(s.v)).sort((p, q) => q.v.length - p.v.length)[0]?.v;
  if (!md) return null;
  return { markdown: md, title: byKey(/^(h1|title|headline)$/i), meta: byKey(/^(metaDescription|meta_description|meta|description)$/i) };
}
