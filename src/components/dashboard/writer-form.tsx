"use client";
import { useState } from "react";

const CATEGORIES = [
  { value: "informational", label: "Informational" },
  { value: "comparison", label: "Comparison" },
  { value: "listicle", label: "Listicle" },
  { value: "how-to", label: "How-To" },
  { value: "review", label: "Review" },
  { value: "landing", label: "Landing" },
];

export function WriterForm({ websiteId }: { websiteId: string }) {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("informational");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<{
    title: string;
    metaDescription: string;
    body: string;
    totalWordCount: number;
    keyword: string;
    logFile: string;
  } | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim()) return;
    setStatus("loading");
    setResult(null);
    setError("");
    try {
      const res = await fetch("/api/writer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seedKeyword: keyword.trim(), category, websiteId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Server error");
      setResult(data);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }

  function downloadMd() {
    if (!result) return;
    const content = `# ${result.title}\n\n> ${result.metaDescription}\n\n${result.body}`;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.keyword.replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{
      maxWidth: 800,
      margin: "0 auto",
      padding: "64px 24px",
    }}>
      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(99,102,241,0.12)",
          border: "1px solid rgba(99,102,241,0.25)",
          borderRadius: 20,
          padding: "4px 14px",
          marginBottom: 20,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#818cf8", display: "inline-block" }} />
          <span style={{ fontSize: 12, color: "#818cf8", fontWeight: 500, letterSpacing: "0.05em" }}>AI WRITER</span>
        </div>
        <h1 style={{
          fontSize: 36,
          fontWeight: 700,
          color: "#f1f5f9",
          letterSpacing: "-0.02em",
          margin: 0,
          lineHeight: 1.2,
        }}>
          Write an article
        </h1>
        <p style={{ marginTop: 12, color: "#64748b", fontSize: 15, lineHeight: 1.6 }}>
          Enter a seed keyword. The writer picks the best variant from DataForSEO,
          analyses the SERP, then generates a full article with GPT-5.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
          <input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="e.g. best crm software"
            disabled={status === "loading"}
            style={{
              flex: 1,
              background: "#13161c",
              border: "1px solid #1e2330",
              borderRadius: 10,
              padding: "12px 16px",
              color: "#f1f5f9",
              fontSize: 15,
              outline: "none",
              transition: "border-color 0.15s",
            }}
            onFocus={e => (e.target.style.borderColor = "#6366f1")}
            onBlur={e => (e.target.style.borderColor = "#1e2330")}
          />
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            disabled={status === "loading"}
            style={{
              background: "#13161c",
              border: "1px solid #1e2330",
              borderRadius: 10,
              padding: "12px 14px",
              color: "#94a3b8",
              fontSize: 14,
              cursor: "pointer",
              outline: "none",
            }}
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={status === "loading" || !keyword.trim()}
            style={{
              background: status === "loading" ? "#3730a3" : "#6366f1",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "12px 24px",
              fontSize: 14,
              fontWeight: 600,
              cursor: status === "loading" || !keyword.trim() ? "not-allowed" : "pointer",
              opacity: !keyword.trim() ? 0.5 : 1,
              whiteSpace: "nowrap",
              transition: "background 0.15s",
            }}
          >
            {status === "loading" ? "Writing…" : "Write Article"}
          </button>
        </div>
      </form>

      {/* Loading */}
      {status === "loading" && (
        <div style={{ marginTop: 48, textAlign: "center" }}>
          <div style={{
            width: 36, height: 36,
            border: "2px solid #1e2330",
            borderTop: "2px solid #6366f1",
            borderRadius: "50%",
            margin: "0 auto 16px",
            animation: "spin 0.8s linear infinite",
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          <p style={{ color: "#475569", fontSize: 14 }}>
            Fetching keywords → analysing SERP → writing sections…
          </p>
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div style={{
          marginTop: 32,
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: 10,
          padding: "16px 20px",
          color: "#f87171",
          fontSize: 14,
        }}>
          {error}
        </div>
      )}

      {/* Result */}
      {status === "done" && result && (
        <div style={{ marginTop: 40 }}>
          {/* Meta */}
          <div style={{
            background: "#13161c",
            border: "1px solid #1e2330",
            borderRadius: 12,
            padding: "20px 24px",
            marginBottom: 16,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Title</div>
                <div style={{ color: "#f1f5f9", fontSize: 17, fontWeight: 600, lineHeight: 1.4 }}>{result.title}</div>
                <div style={{ marginTop: 12, fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Meta description</div>
                <div style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.5 }}>{result.metaDescription}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#6366f1" }}>{result.totalWordCount.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>words</div>
                <div style={{ marginTop: 8, fontSize: 11, color: "#475569" }}>
                  keyword: <span style={{ color: "#818cf8" }}>{result.keyword}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            <button
              onClick={downloadMd}
              style={{
                background: "#6366f1",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 18px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Download .md
            </button>
            <div style={{
              background: "#13161c",
              border: "1px solid #1e2330",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 12,
              color: "#475569",
            }}>
              Log: {result.logFile}
            </div>
          </div>

          {/* Body preview */}
          <div style={{
            background: "#0d0f12",
            border: "1px solid #1e2330",
            borderRadius: 12,
            padding: "24px",
            maxHeight: 480,
            overflowY: "auto",
          }}>
            <pre style={{
              color: "#94a3b8",
              fontSize: 13,
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              margin: 0,
              fontFamily: "inherit",
            }}>
              {result.body}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
