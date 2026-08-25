"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Issue {
  id: string;
  type: string;
  severity: string;
  pageUrl: string | null;
  description: string;
  evidence: string | null;
  recommendation: string;
}

export default function SeoPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [analysisId, setAnalysisId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/websites")
      .then(r => r.json())
      .then(async data => {
        const latest = data.websites?.[0]?.analyses?.[0];
        if (latest?.id) {
          setAnalysisId(latest.id);
          const res = await fetch(`/api/analyses/${latest.id}/issues`);
          const d = await res.json();
          setIssues(d.issues || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const severityColor: Record<string, string> = {
    CRITICAL: "#d97a6c",
    HIGH: "#e8a435",
    MEDIUM: "#d4a030",
    LOW: "rgba(0,0,0,0.4)",
  };

  const filtered = filter === "ALL" ? issues : issues.filter(i => i.severity === filter);

  return (
    <div style={{ background: "#f2f1ed", minHeight: "100vh", fontFamily: "-apple-system, sans-serif" }}>
      <div style={{ borderBottom: "1px solid rgba(0,0,0,0.08)", padding: "20px 32px", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: "1.1rem", margin: 0 }}>SEO Issues</p>
          <p style={{ fontSize: "0.72rem", color: "rgba(0,0,0,0.35)", margin: "2px 0 0" }}>{issues.length} issues found</p>
        </div>
        {analysisId && <Link href={`/dashboard/analysis/${analysisId}`} style={{ fontSize: "0.78rem", color: "#d4a030", textDecoration: "none" }}>View full report →</Link>}
      </div>
      <div style={{ padding: "24px 32px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 14px", borderRadius: 100, border: "1px solid rgba(0,0,0,0.12)", background: filter === f ? "#0a0a0a" : "#fff", color: filter === f ? "#f2f1ed" : "rgba(0,0,0,0.5)", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>{f}</button>
          ))}
        </div>
        {loading && <p style={{ color: "rgba(0,0,0,0.35)", fontSize: "0.85rem" }}>Loading...</p>}
        {!loading && issues.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ color: "rgba(0,0,0,0.35)" }}>No issues found. <Link href="/dashboard/add-website" style={{ color: "#d4a030" }}>Add a website →</Link></p>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(issue => (
            <div key={issue.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(0,0,0,0.08)", padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{issue.description}</span>
                <span style={{ fontSize: "0.62rem", fontFamily: "SF Mono, monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: severityColor[issue.severity] }}>{issue.severity}</span>
              </div>
              {issue.pageUrl && <p style={{ fontSize: "0.72rem", fontFamily: "SF Mono, monospace", color: "rgba(0,0,0,0.35)", margin: "0 0 6px" }}>{issue.pageUrl}</p>}
              {issue.evidence && <p style={{ fontSize: "0.75rem", color: "rgba(0,0,0,0.4)", margin: "0 0 6px" }}>Evidence: {issue.evidence}</p>}
              <p style={{ fontSize: "0.78rem", color: "rgba(0,0,0,0.5)", margin: 0 }}>→ {issue.recommendation}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
