"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Analysis {
  id: string;
  status: string;
  errorMessage: string | null;
  overallScore: number | null;
  technicalScore: number | null;
  contentScore: number | null;
  structureScore: number | null;
  indexabilityScore: number | null;
  pagesCount: number | null;
  website: { url: string; business: { name: string } };
  _count: { pages: number; issues: number; opportunities: number };
}

interface Issue {
  id: string;
  type: string;
  severity: string;
  pageUrl: string | null;
  description: string;
  evidence: string | null;
  recommendation: string;
}

interface Opportunity {
  id: string;
  title: string;
  type: string;
  priority: string;
  score: number;
  reason: string;
  recommendation: string;
  affectedPages: number;
}

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: "var(--dash-danger)",
  HIGH: "var(--dash-warning)",
  MEDIUM: "var(--dash-accent)",
  LOW: "var(--dash-muted)",
};

const SEVERITY_BG: Record<string, string> = {
  CRITICAL: "rgba(239,68,68,0.08)",
  HIGH: "rgba(245,158,11,0.08)",
  MEDIUM: "rgba(59,123,246,0.08)",
  LOW: "rgba(98,104,115,0.08)",
};

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let interval: ReturnType<typeof setInterval>;

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/analyses/${id}`);
        if (!res.ok) {
          setError("Analysis not found.");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setAnalysis(data.analysis);
        setLoading(false);

        if (data.analysis.status === "COMPLETED") {
          clearInterval(interval);
          const [issuesRes, oppsRes] = await Promise.all([
            fetch(`/api/analyses/${id}/issues`),
            fetch(`/api/analyses/${id}/opportunities`),
          ]);
          const issuesData = await issuesRes.json();
          const oppsData = await oppsRes.json();
          setIssues(issuesData.issues || []);
          setOpportunities(oppsData.opportunities || []);
        }

        if (data.analysis.status === "FAILED") {
          clearInterval(interval);
        }
      } catch {
        setLoading(false);
        setError("Failed to load analysis.");
      }
    };

    fetchData();
    interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: 48, color: "var(--dash-muted)", fontSize: "0.85rem" }}>
        Loading...
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div style={{ padding: 48 }}>
        <p style={{ color: "var(--dash-danger)", marginBottom: 16, fontSize: "0.85rem" }}>{error || "Analysis not found."}</p>
        <Link href="/dashboard" style={{ color: "var(--dash-accent)", fontSize: "0.82rem", textDecoration: "none" }}>← Back to dashboard</Link>
      </div>
    );
  }

  const isRunning = analysis.status === "QUEUED" || analysis.status === "RUNNING";
  const isCompleted = analysis.status === "COMPLETED";
  const isFailed = analysis.status === "FAILED";

  return (
    <div style={{ padding: "32px 32px", maxWidth: 1100 }}>

      <div style={{ marginBottom: 28 }}>
        <Link href="/dashboard" style={{ fontSize: "0.75rem", color: "var(--dash-muted)", textDecoration: "none" }}>← Dashboard</Link>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 600, letterSpacing: "-0.02em", marginTop: 10, marginBottom: 4, color: "var(--dash-primary)" }}>
          {analysis.website.business.name}
        </h1>
        <p style={{ fontSize: "0.75rem", color: "var(--dash-muted)", fontFamily: "var(--font-mono)", margin: 0 }}>{analysis.website.url}</p>
      </div>

      {isRunning && (
        <div style={{ background: "var(--dash-surface)", borderRadius: 10, border: "1px solid var(--dash-border)", padding: 28, marginBottom: 24 }}>
          <p style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: 20, color: "var(--dash-primary)" }}>Analysis in progress</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { key: "QUEUED", label: "Starting analysis" },
              { key: "RUNNING", label: "Crawling website and analyzing pages" },
              { key: "COMPLETED", label: "Completed" },
            ].map((step) => {
              const isActive = step.key === analysis.status;
              return (
                <div key={step.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: isActive ? "var(--dash-warning)" : "var(--dash-border)" }} />
                  <span style={{ fontSize: "0.82rem", color: isActive ? "var(--dash-primary)" : "var(--dash-muted)" }}>
                    {step.label}{isActive ? "..." : ""}
                  </span>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: "0.72rem", color: "var(--dash-muted)", marginTop: 18, marginBottom: 0 }}>This may take 30–90 seconds.</p>
        </div>
      )}

      {isFailed && (
        <div style={{ background: "rgba(239,68,68,0.06)", borderRadius: 10, border: "1px solid rgba(239,68,68,0.2)", padding: 24, marginBottom: 24 }}>
          <p style={{ fontWeight: 600, color: "var(--dash-danger)", marginBottom: 6, fontSize: "0.88rem" }}>Analysis failed</p>
          <p style={{ fontSize: "0.82rem", color: "var(--dash-secondary)", margin: 0 }}>{analysis.errorMessage || "Unknown error."}</p>
          <Link href="/dashboard/add-website" style={{ display: "inline-block", marginTop: 14, fontSize: "0.8rem", color: "var(--dash-accent)", textDecoration: "none" }}>Try again →</Link>
        </div>
      )}

      {isCompleted && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 8 }}>
            {[
              { label: "Overall", value: analysis.overallScore },
              { label: "Technical", value: analysis.technicalScore },
              { label: "Content", value: analysis.contentScore },
              { label: "Structure", value: analysis.structureScore },
              { label: "Indexability", value: analysis.indexabilityScore },
            ].map(s => (
              <div key={s.label} style={{ background: "var(--dash-surface)", borderRadius: 8, border: "1px solid var(--dash-border)", padding: "16px 14px" }}>
                <p style={{ fontSize: "1.8rem", fontWeight: 700, letterSpacing: "-0.03em", margin: 0, fontFamily: "var(--font-mono)", color: (s.value ?? 0) >= 70 ? "var(--dash-success)" : (s.value ?? 0) >= 50 ? "var(--dash-warning)" : "var(--dash-danger)" }}>
                  {s.value ?? "—"}
                </p>
                <p style={{ fontSize: "0.65rem", color: "var(--dash-muted)", margin: "4px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 24 }}>
            {[
              { label: "Pages crawled", value: analysis.pagesCount ?? 0 },
              { label: "SEO issues", value: analysis._count.issues },
              { label: "Opportunities", value: analysis._count.opportunities },
            ].map(s => (
              <div key={s.label} style={{ background: "var(--dash-surface)", borderRadius: 8, border: "1px solid var(--dash-border)", padding: "16px 18px" }}>
                <p style={{ fontSize: "1.6rem", fontWeight: 700, letterSpacing: "-0.03em", margin: 0, fontFamily: "var(--font-mono)", color: "var(--dash-primary)" }}>{s.value}</p>
                <p style={{ fontSize: "0.65rem", color: "var(--dash-muted)", margin: "4px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</p>
              </div>
            ))}
          </div>

          {opportunities.length > 0 && (
            <div style={{ background: "var(--dash-surface)", borderRadius: 10, border: "1px solid var(--dash-border)", padding: 24, marginBottom: 12 }}>
              <p style={{ fontWeight: 600, fontSize: "0.82rem", marginBottom: 16, color: "var(--dash-primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Opportunities</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {opportunities.map((o) => (
                  <div key={o.id} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid var(--dash-border)", gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 500, fontSize: "0.85rem", color: "var(--dash-primary)" }}>{o.title}</span>
                        <span style={{ fontSize: "0.6rem", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase", color: o.priority === "HIGH" ? "var(--dash-warning)" : "var(--dash-muted)", background: o.priority === "HIGH" ? "rgba(245,158,11,0.1)" : "var(--dash-elevated)", padding: "2px 6px", borderRadius: 4 }}>
                          {o.priority}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.78rem", color: "var(--dash-secondary)", margin: "0 0 3px", lineHeight: 1.5 }}>{o.reason}</p>
                      <p style={{ fontSize: "0.72rem", color: "var(--dash-muted)", margin: 0 }}>{o.affectedPages} page(s) affected</p>
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem", fontWeight: 700, color: "var(--dash-accent)", flexShrink: 0 }}>{o.score}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {issues.length > 0 && (
            <div style={{ background: "var(--dash-surface)", borderRadius: 10, border: "1px solid var(--dash-border)", padding: 24 }}>
              <p style={{ fontWeight: 600, fontSize: "0.82rem", marginBottom: 16, color: "var(--dash-primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>SEO Issues ({issues.length})</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {issues.map((issue) => (
                  <div key={issue.id} style={{ padding: "14px 0", borderBottom: "1px solid var(--dash-border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                      <span style={{ fontSize: "0.6rem", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase", color: SEVERITY_COLOR[issue.severity], background: SEVERITY_BG[issue.severity], padding: "2px 6px", borderRadius: 4 }}>
                        {issue.severity}
                      </span>
                      <span style={{ fontWeight: 500, fontSize: "0.85rem", color: "var(--dash-primary)" }}>{issue.description}</span>
                    </div>
                    {issue.pageUrl && (
                      <p style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--dash-muted)", margin: "0 0 4px", wordBreak: "break-all" }}>{issue.pageUrl}</p>
                    )}
                    {issue.evidence && (
                      <p style={{ fontSize: "0.75rem", color: "var(--dash-secondary)", margin: "0 0 4px" }}>Evidence: {issue.evidence}</p>
                    )}
                    <p style={{ fontSize: "0.78rem", color: "var(--dash-muted)", margin: 0 }}>→ {issue.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
