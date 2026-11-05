"use client";
// /dashboard/content/articles/<id>/code — the article as code (HTML, Schema, WordPress, React, Markdown, JSON).
// Loads the article from the existing API; if its shape is unknown, paste the markdown instead.
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ArticleCodeExport from "@/components/dashboard/article-code-export";
import { articleFromPayload } from "@/lib/content/article-code-export";
import type { ArticleInput } from "@/lib/content/article-code-export";

export default function ArticleCodePage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? "");
  const [article, setArticle] = useState<ArticleInput | null>(null);
  const [error, setError] = useState("");
  const [pasted, setPasted] = useState("");
  useEffect(() => {
    if (!id) return;
    fetch(`/api/content/articles/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((j) => { const a = articleFromPayload(j); if (a) setArticle(a); else setError("the API answer has no markdown body"); })
      .catch((e) => setError(String(e instanceof Error ? e.message : e)));
  }, [id]);
  const md = article?.markdown ?? pasted;
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>{article?.title || "Article"} — code</h1>
      <p style={{ opacity: 0.7, marginTop: 0 }}>Pick a format, then Copy or Download.</p>
      {error && !pasted ? <p style={{ color: "#b45309" }}>Could not load article {id}: {error}. Paste its markdown below.</p> : null}
      {article ? null : <textarea value={pasted} onChange={(e: { target: { value: string } }) => setPasted(e.target.value)} placeholder="# Title&#10;&#10;## Section..." style={{ width: "100%", minHeight: 160, fontFamily: "monospace", fontSize: 12 }} />}
      {md.trim() ? <ArticleCodeExport open markdown={md} title={article?.title} meta={article?.meta} fileName={article?.title} /> : null}
    </main>
  );
}
