"use client";
import { useEffect, useState } from "react";
import { Sparkles, Download, Copy, Check } from "lucide-react";
import { CATEGORY_LABELS, ArticleCategory } from "@/lib/writer/templates";
import s from "./writer.module.css";

const CATEGORIES = Object.entries(CATEGORY_LABELS) as [ArticleCategory, string][];
type Result = { title: string; metaDescription: string; body: string; wordCount: number; score?: number; editorialScore?: number };

const STEPS_RESEARCH = ["Keyword research", "SERP analysis", "Planning sections", "Writing", "Editorial review"];
const STEPS_EXACT = ["SERP analysis", "Planning sections", "Writing", "Editorial review"];

function stats(r: Result) {
  const b = r.body;
  const words = r.wordCount || b.split(/\s+/).filter(Boolean).length;
  const h2 = (b.match(/^## /gm) || []).length;
  const faq = (b.match(/^#{2,4} .*\?\s*$/gm) || []).length;
  const links = (b.match(/\]\(https?:\/\//g) || []).length;
  const tables = (b.match(/^\|.*\|\s*\n\|[\s:-]+\|/gm) || []).length;
  const raw = r.score ?? r.editorialScore;
  return { words, read: Math.max(1, Math.round(words / 230)), h2, faq, links, tables, score: typeof raw === "number" ? raw : null };
}

export function WriterForm({ websiteId, onSuccess, initialKeyword }: { websiteId: string; onSuccess?: () => void; initialKeyword?: string }) {
  const [keyword, setKeyword] = useState(initialKeyword ?? "");
  const [category, setCategory] = useState<ArticleCategory>("definition");
  const [exact, setExact] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const steps = exact ? STEPS_EXACT : STEPS_RESEARCH;

  useEffect(() => {
    if (loading === false) return;
    setStep(0);
    const t = setInterval(() => setStep((v) => Math.min(v + 1, steps.length - 1)), 14000);
    return () => clearInterval(t);
  }, [loading, steps.length]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (keyword.trim() === "") return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/writer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim(), category, websiteId, exactKeyword: exact }),
      });
      const data = await res.json();
      if (res.ok === false) throw new Error(data.error || "Failed");
      setResult(data);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function download(r: Result) {
    const blob = new Blob([`# ${r.title}\n\n${r.body}`], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${r.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    a.click();
  }

  const st = result ? stats(result) : null;
  const pct = loading ? Math.round(((step + 0.5) / steps.length) * 100) : 0;

  return (
    <div className={s.panel}>
      <div className={s.head}>
        <span className={s.eyebrow}><Sparkles size={11} strokeWidth={2} />AI Writer</span>
        <h2 className={s.title}>Write an article</h2>
        <p className={s.sub}>Seed keyword → best variant from DataForSEO → SERP analysis → full article with editorial review.</p>
      </div>

      <div className={s.card}>
        <div className={s.cardHead}><span>Brief</span><span>{CATEGORY_LABELS[category]}</span></div>
        <form onSubmit={submit} className={s.form}>
          <input className={s.input} value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. best crm software" disabled={loading} />
          <select className={s.select} value={category} onChange={(e) => setCategory(e.target.value as ArticleCategory)} disabled={loading}>
            {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <label className={s.toggle} onClick={() => loading || setExact((v) => v === false)}>
            <span className={s.switch} data-on={exact ? "true" : "false"} />
            <span>Use exact keyword <span className={s.hint}>· skip keyword research</span></span>
          </label>
          <button type="submit" className={s.primary} disabled={loading || keyword.trim() === ""}>
            {loading ? <><span className={s.spin} />{steps[step]}…</> : <><Sparkles size={14} />Write article</>}
          </button>
        </form>
      </div>

      {loading && (
        <div className={s.card}>
          <div className={s.cardHead}><span>Progress</span><span>{pct}%</span></div>
          <div className={s.bar}><div className={s.barFill} style={{ width: `${pct}%` }} /></div>
          <div className={s.steps}>
            {steps.map((label, i) => (
              <div key={label} className={s.step} data-s={i < step ? "done" : i === step ? "active" : "todo"}>
                <span className={s.dot} />{label}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <div className={s.error}>{error}</div>}

      {result && st && (
        <div className={s.card}>
          <div className={s.cardHead}><span>Result</span><span className={s.saved}>✓ Saved to briefs</span></div>
          <div className={s.metrics}>
            <div className={s.metric}><span className={s.mLabel}>Words</span><span className={s.mValue}>{st.words.toLocaleString()}</span></div>
            <div className={s.metric}><span className={s.mLabel}>Read time</span><span className={s.mValue}>{st.read} min</span></div>
            <div className={s.metric}><span className={s.mLabel}>Score</span><span className={s.mValue} data-tone={st.score === null ? undefined : st.score >= 8.5 ? "good" : "warn"}>{st.score === null ? "—" : st.score.toFixed(1)}</span></div>
            <div className={s.metric}><span className={s.mLabel}>Sections</span><span className={s.mValue}>{st.h2}</span></div>
            <div className={s.metric}><span className={s.mLabel}>FAQ</span><span className={s.mValue}>{st.faq}</span></div>
            <div className={s.metric}><span className={s.mLabel}>Sources · Tables</span><span className={s.mValue}>{st.links} · {st.tables}</span></div>
          </div>
          <div className={s.resTitle}>{result.title}</div>
          <div className={s.resMeta}>{result.metaDescription}</div>
          <div className={s.actions}>
            <button className={s.ghost} onClick={() => download(result)}><Download size={13} />Download .md</button>
            <button className={s.ghost} onClick={() => { navigator.clipboard.writeText(result.body); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
              {copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className={s.preview}>{result.body.slice(0, 2500)}{result.body.length > 2500 ? "\n\n…" : ""}</pre>
        </div>
      )}
    </div>
  );
}
