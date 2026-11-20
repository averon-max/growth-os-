import "server-only";
import fs from "node:fs";
import path from "node:path";
import { CODE_POSTS } from "@/app/blog/posts";

/*
 * Blog posts are Markdown files in content/blog/<slug>.md.
 * The file name is the URL: content/blog/keyword-research-guide.md → /blog/keyword-research-guide.
 * Files starting with "_" are templates and never published. "draft: true" hides a post in production.
 */

export const SITE = "https://hyprlyx.com";
const DIR = path.join(process.cwd(), "content", "blog");
const WORDS_PER_MINUTE = 230;

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  updated: string | null;
  author: string;
  tags: string[];
  cover: string | null;
  coverAlt: string;
  draft: boolean;
  minutes: number;
  /** "md" = content/blog/<slug>.md, "code" = its own page in src/app/blog/<slug>/ */
  source: "md" | "code";
}

export interface Post extends PostMeta {
  html: string;
  toc: { id: string; text: string }[];
}

/* ---------- front matter ---------- */

function parseFrontMatter(raw: string): { data: Record<string, string>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  const data: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i < 1) continue;
    data[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return { data, body: m[2] };
}

/* ---------- Markdown → HTML (enough for articles; no dependencies) ---------- */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const slugify = (s: string) =>
  s.toLowerCase().replace(/<[^>]+>/g, "").replace(/&[a-z]+;/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);

function inline(text: string): string {
  const codes: string[] = [];
  let s = text.replace(/`([^`]+)`/g, (_, c: string) => `\u0000${codes.push(`<code>${esc(c)}</code>`) - 1}\u0000`);
  s = esc(s);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (_, alt: string, src: string, title?: string) =>
    `<img src="${src}" alt="${alt}" loading="lazy" decoding="async"${title ? ` title="${title}"` : ""} />`);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, href: string) => {
    const external = /^https?:\/\//.test(href) && !href.startsWith(SITE);
    return `<a href="${href}"${external ? ' target="_blank" rel="noopener"' : ""}>${label}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  return s.replace(/\u0000(\d+)\u0000/g, (_, i: string) => codes[Number(i)]);
}

function markdown(md: string): { html: string; toc: { id: string; text: string }[] } {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  const toc: { id: string; text: string }[] = [];
  const used = new Set<string>();
  let i = 0;
  const uniqueId = (text: string) => {
    let id = slugify(text) || "section";
    let n = 2;
    while (used.has(id)) id = `${slugify(text)}-${n++}`;
    used.add(id);
    return id;
  };
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") { i++; continue; }

    const fence = line.match(/^```(\w*)/);
    if (fence) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code${fence[1] ? ` class="lang-${fence[1]}"` : ""}>${esc(buf.join("\n"))}</code></pre>`);
      continue;
    }
    const h = line.match(/^(#{2,4})\s+(.+)$/);
    if (h) {
      const level = h[1].length;
      const text = inline(h[2].trim());
      const id = uniqueId(h[2]);
      if (level === 2) toc.push({ id, text: text.replace(/<[^>]+>/g, "") });
      out.push(`<h${level} id="${id}">${text}</h${level}>`);
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) { out.push("<hr />"); i++; continue; }
    if (line.startsWith(">")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) buf.push(lines[i++].replace(/^>\s?/, ""));
      out.push(`<blockquote><p>${inline(buf.join(" "))}</p></blockquote>`);
      continue;
    }
    if (/^\s*([-*])\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const re = ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/;
      const items: string[] = [];
      while (i < lines.length && re.test(lines[i])) items.push(`<li>${inline(lines[i++].replace(re, ""))}</li>`);
      out.push(`<${ordered ? "ol" : "ul"}>${items.join("")}</${ordered ? "ol" : "ul"}>`);
      continue;
    }
    if (line.trim().startsWith("|") && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) {
      const cells = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => inline(c.trim()));
      const head = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) rows.push(cells(lines[i++]));
      out.push(`<div class="table"><table><thead><tr>${head.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }
    const img = line.trim().match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
    if (img) {
      out.push(`<figure>${inline(line.trim())}${img[1] ? `<figcaption>${esc(img[1])}</figcaption>` : ""}</figure>`);
      i++;
      continue;
    }
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !/^(#{2,4}\s|```|>|\s*[-*]\s|\s*\d+\.\s|\|)/.test(lines[i])) buf.push(lines[i++].trim());
    if (buf.length) out.push(`<p>${inline(buf.join(" "))}</p>`);
    else i++;
  }
  return { html: out.join("\n"), toc };
}

/* ---------- reading posts ---------- */

const showDrafts = () => process.env.NODE_ENV !== "production";

function read(file: string): Post | null {
  const slug = file.replace(/\.md$/, "");
  if (slug.startsWith("_") || !/^[a-z0-9-]+$/.test(slug)) return null;
  const { data, body } = parseFrontMatter(fs.readFileSync(path.join(DIR, file), "utf8"));
  if (!data.title || !data.date) return null;
  const draft = data.draft === "true";
  if (draft && !showDrafts()) return null;
  const { html, toc } = markdown(body);
  const words = body.split(/\s+/).filter(Boolean).length;
  return {
    slug,
    title: data.title,
    description: data.description ?? "",
    date: data.date,
    updated: data.updated || null,
    author: data.author || "Hyprlyx team",
    tags: (data.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean),
    cover: data.cover || null,
    coverAlt: data.coverAlt || data.title,
    draft,
    minutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
    source: "md",
    html,
    toc,
  };
}

function markdownPosts(): Post[] {
  if (!fs.existsSync(DIR)) return [];
  return fs.readdirSync(DIR).filter((f) => f.endsWith(".md")).map(read).filter((p): p is Post => p !== null);
}

function codePosts(): Post[] {
  return CODE_POSTS.filter((p) => !p.draft || showDrafts()).map((p) => ({
    slug: p.slug,
    title: p.title,
    description: p.description,
    date: p.date,
    updated: p.updated ?? null,
    author: p.author ?? "Hyprlyx team",
    tags: p.tags ?? [],
    cover: p.cover ?? null,
    coverAlt: p.coverAlt ?? p.title,
    draft: p.draft === true,
    minutes: p.minutes ?? 5,
    source: "code" as const,
    html: "",
    toc: [],
  }));
}

/** Every post, both kinds, newest first. */
export function getAllPosts(): Post[] {
  return [...codePosts(), ...markdownPosts()].sort((a, b) => b.date.localeCompare(a.date));
}

/** Only Markdown posts are rendered by /blog/[slug]; code posts have their own page. */
export function getPost(slug: string): Post | null {
  return markdownPosts().find((p) => p.slug === slug) ?? null;
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
