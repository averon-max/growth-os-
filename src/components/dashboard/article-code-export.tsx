"use client";
// "Code" button for an article: one click turns it into HTML, HTML + Schema, WordPress blocks, a React/Next.js
// component, Markdown, JSON or JSON-LD. The conversion is plain code (src/lib/content/article-code-export.ts),
// so the same article always gives the same output. Usage: <ArticleCodeExport markdown={md} title={h1} meta={meta} />
import { useEffect, useMemo, useState } from "react";
import { CODE_VARIANTS, exportArticle, parseArticle } from "@/lib/content/article-code-export";
import type { CodeVariant } from "@/lib/content/article-code-export";
import type { CSSProperties } from "react";

export interface ArticleCodeExportProps {
  markdown: string;
  title?: string;
  meta?: string;
  url?: string;
  /** file name without extension for downloads */
  fileName?: string;
  /** open the panel right away instead of showing the button */
  open?: boolean;
}

const STORE_KEY = "growth-os:code-variant";
const box: CSSProperties = { border: "1px solid rgba(127,127,127,.35)", borderRadius: 10, padding: 12, marginTop: 8, background: "rgba(127,127,127,.06)" };
const btn = (active = false): CSSProperties => ({ padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(127,127,127,.45)", background: active ? "#2563eb" : "transparent", color: active ? "#fff" : "inherit", cursor: "pointer", fontSize: 13 });

export default function ArticleCodeExport({ markdown, title, meta, url, fileName, open = false }: ArticleCodeExportProps) {
  const [shown, setShown] = useState(open);
  const [variant, setVariant] = useState<CodeVariant>("html");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    try { const v = window.localStorage.getItem(STORE_KEY) as CodeVariant | null; if (v && CODE_VARIANTS.some((x) => x.id === v)) setVariant(v); } catch { /* storage unavailable */ }
  }, []);
  const choose = (v: CodeVariant) => { setVariant(v); setCopied(false); try { window.localStorage.setItem(STORE_KEY, v); } catch { /* storage unavailable */ } };
  const input = useMemo(() => ({ markdown, title, meta, url }), [markdown, title, meta, url]);
  const parsed = useMemo(() => parseArticle(input), [input]);
  const code = useMemo(() => (shown ? exportArticle(input, variant) : ""), [input, variant, shown]);
  const info = CODE_VARIANTS.find((x) => x.id === variant)!;
  const base = (fileName || parsed.title || "article").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "article";

  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { setCopied(false); }
  };
  const download = () => {
    const blob = new Blob([code], { type: `${info.mime};charset=utf-8` });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${base}${variant === "wordpress" ? "-wordpress" : variant === "html-schema" ? "-schema" : ""}.${info.ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  if (!shown) return <button type="button" style={btn()} onClick={() => setShown(true)} title="Convert this article to code">{"</>"} Code</button>;
  return (
    <div style={box}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        {CODE_VARIANTS.map((v) => <button key={v.id} type="button" style={btn(v.id === variant)} onClick={() => choose(v.id)}>{v.label}</button>)}
        <span style={{ flex: 1 }} />
        <button type="button" style={btn()} onClick={copy}>{copied ? "Copied" : "Copy"}</button>
        <button type="button" style={btn()} onClick={download}>Download .{info.ext}</button>
        {open ? null : <button type="button" style={btn()} onClick={() => setShown(false)} aria-label="Close">×</button>}
      </div>
      <div style={{ fontSize: 12, opacity: 0.75, margin: "8px 0" }}>
        {parsed.blocks.filter((b) => b.t === "heading" && b.level === 2).length} sections · {parsed.faq.length} FAQ · {parsed.steps.length >= 2 ? `${parsed.steps.length} HowTo steps · ` : ""}{code.length.toLocaleString()} characters
      </div>
      <pre style={{ maxHeight: 480, overflow: "auto", margin: 0, padding: 12, borderRadius: 8, background: "#0b1020", color: "#e5e7eb", fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}><code>{code}</code></pre>
    </div>
  );
}
