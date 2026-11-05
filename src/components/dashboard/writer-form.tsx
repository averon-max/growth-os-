"use client";
import { useState } from "react";
import { CATEGORY_LABELS, ArticleCategory } from "@/lib/writer/templates";

const CATEGORIES = Object.entries(CATEGORY_LABELS) as [ArticleCategory, string][];

export function WriterForm({ websiteId, onSuccess }: { websiteId: string; onSuccess?: () => void }) {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState<ArticleCategory>("definition");
  const [exactKeyword, setExactKeyword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ title: string; metaDescription: string; body: string; wordCount: number } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/writer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim(), category, websiteId, exactKeyword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResult(data);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const inp: React.CSSProperties = {
    background: "#0f1117", border: "1px solid #1e2330", borderRadius: 8,
    padding: "10px 14px", color: "#f1f5f9", fontSize: 14, outline: "none",
    width: "100%", boxSizing: "border-box",
  };

  return (
    <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ background: "#7c3aed", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4, letterSpacing: 1 }}>AI WRITER</span>
      </div>
      <div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#f1f5f9" }}>Write an article</h2>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
          Enter a seed keyword. The AI picks the best variant from DataForSEO, analyses the SERP, then writes a full article with GPT-5.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          placeholder="e.g. best crm software"
          disabled={loading}
          style={inp}
        />

        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
          <div
            onClick={() => setExactKeyword(v => !v)}
            style={{
              width: 18, height: 18, borderRadius: 4, border: "1px solid",
              borderColor: exactKeyword ? "#7c3aed" : "#2d3748",
              background: exactKeyword ? "#7c3aed" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "all 0.15s",
            }}
          >
            {exactKeyword && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1 }}>✓</span>}
          </div>
          <span style={{ fontSize: 13, color: exactKeyword ? "#a78bfa" : "#64748b" }}>
            Use exact keyword <span style={{ color: "#475569", fontSize: 12 }}>(skip AI keyword research)</span>
          </span>
        </label>

        <select value={category} onChange={e => setCategory(e.target.value as ArticleCategory)} disabled={loading} style={inp}>
          {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>

        <button
          type="submit"
          disabled={loading || !keyword.trim()}
          style={{
            background: loading ? "#4c1d95" : "#7c3aed", color: "#fff", border: "none",
            borderRadius: 8, padding: "10px 16px", fontSize: 14, fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {loading ? (
            <>
              <span style={{ width: 14, height: 14, border: "2px solid #fff3", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
              {exactKeyword ? "Writing…" : "Researching & writing…"}
            </>
          ) : "✦ Write Article"}
        </button>
      </form>

      {error && (
        <div style={{ background: "#1c0a0a", border: "1px solid #7f1d1d", borderRadius: 8, padding: "10px 14px", color: "#fca5a5", fontSize: 13 }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: 10, padding: 16 }}>
            <div style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{result.title}</div>
            <div style={{ color: "#64748b", fontSize: 13, marginBottom: 10 }}>{result.metaDescription}</div>
            <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#475569" }}>
              <span>~{result.wordCount} words</span>
              <span style={{ color: "#22c55e" }}>✓ Saved to briefs</span>
            </div>
          </div>
          <button
            onClick={() => {
              const blob = new Blob([`# ${result.title}\n\n${result.body}`], { type: "text/markdown" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `${result.title.toLowerCase().replace(/\s+/g, "-")}.md`;
              a.click();
            }}
            style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: 8, padding: "8px 14px", color: "#94a3b8", fontSize: 13, cursor: "pointer" }}
          >
            ↓ Download .md
          </button>
          <div style={{ background: "#080a0f", border: "1px solid #1e2330", borderRadius: 8, padding: 14, maxHeight: 300, overflowY: "auto" }}>
            <pre style={{ margin: 0, color: "#94a3b8", fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {result.body.slice(0, 2000)}{result.body.length > 2000 ? "\n\n…(download for full)" : ""}
            </pre>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
