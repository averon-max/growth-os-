"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Topbar } from "@/components/dashboard/topbar";
import styles from "@/components/dashboard/ui.module.css";

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

const SEVERITY_TONE: Record<string, "danger" | "warning" | "accent" | "muted"> = {
  CRITICAL: "danger",
  HIGH: "warning",
  MEDIUM: "accent",
  LOW: "muted",
};

const PRIORITY_TONE: Record<string, "danger" | "warning" | "accent" | "muted"> = {
  HIGH: "warning",
  MEDIUM: "accent",
  LOW: "muted",
};

const POLL_INTERVAL_MS = 3000;

const PROGRESS_STEPS = [
  { key: "QUEUED", label: "Starting analysis" },
  { key: "RUNNING", label: "Crawling website and analyzing pages" },
  { key: "COMPLETED", label: "Completed" },
] as const;

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
    interval = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <>
        <Topbar title="Analysis" />
        <div className={styles.pageBody}><p className={styles.awaitingLabel}>Loading...</p></div>
      </>
    );
  }

  if (error || !analysis) {
    return (
      <>
        <Topbar title="Analysis" />
        <div className={styles.pageBody}>
          <p style={{ color: "var(--danger)", marginBottom: 16, fontSize: "0.85rem" }}>{error || "Analysis not found."}</p>
          <Link href="/dashboard" className={styles.link}>← Back to dashboard</Link>
        </div>
      </>
    );
  }

  const isRunning = analysis.status === "QUEUED" || analysis.status === "RUNNING";
  const isCompleted = analysis.status === "COMPLETED";
  const isFailed = analysis.status === "FAILED";

  return (
    <>
      <Topbar title="Analysis" subtitle={analysis.website.business.name} />
      <div className={styles.pageBody} style={{ maxWidth: 1000 }}>
        <Link href="/dashboard/websites" className={styles.backLink}>← Websites</Link>
        <h1 className={styles.pageTitle} style={{ marginTop: 10 }}>{analysis.website.business.name}</h1>
        <p className={`${styles.mono} ${styles.pageSubtitle}`}>{analysis.website.url}</p>

        {isRunning && (
          <div className={styles.progressCard}>
            <p className={styles.progressTitle}>Analysis in progress</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {PROGRESS_STEPS.map((step) => {
                const isActive = step.key === analysis.status;
                return (
                  <div key={step.key} className={styles.progressStep}>
                    <span className={styles.progressDot} data-active={isActive} />
                    <span className={styles.progressStepLabel} data-active={isActive}>
                      {step.label}{isActive ? "..." : ""}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className={styles.progressHint}>This may take 30–90 seconds.</p>
          </div>
        )}

        {isFailed && (
          <div className={styles.errorCard}>
            <p className={styles.errorTitle}>Analysis failed</p>
            <p className={styles.errorDesc}>{analysis.errorMessage || "Unknown error."}</p>
            <Link href="/dashboard/add-website" className={styles.link} style={{ display: "inline-block", marginTop: 14 }}>Try again →</Link>
          </div>
        )}

        {isCompleted && (
          <>
            <div className={styles.scoreGrid}>
              {[
                { label: "Overall", value: analysis.overallScore },
                { label: "Technical", value: analysis.technicalScore },
                { label: "Content", value: analysis.contentScore },
                { label: "Structure", value: analysis.structureScore },
                { label: "Indexability", value: analysis.indexabilityScore },
              ].map((s) => (
                <div key={s.label} className={styles.scoreCard}>
                  <p
                    className={`${styles.scoreValue} ${styles.mono}`}
                    style={{ color: (s.value ?? 0) >= 70 ? "var(--success)" : (s.value ?? 0) >= 50 ? "var(--warning)" : "var(--danger)" }}
                  >
                    {s.value ?? "—"}
                  </p>
                  <p className={styles.scoreLabel}>{s.label}</p>
                </div>
              ))}
            </div>

            <div className={styles.statGrid}>
              <div className={styles.statCard}>
                <p className={`${styles.statValue} ${styles.mono}`}>{analysis.pagesCount ?? 0}</p>
                <p className={styles.statLabel}>Pages crawled</p>
              </div>
              <div className={styles.statCard}>
                <p className={`${styles.statValue} ${styles.mono}`}>{analysis._count.issues}</p>
                <p className={styles.statLabel}>SEO issues</p>
              </div>
              <div className={styles.statCard}>
                <p className={`${styles.statValue} ${styles.mono}`}>{analysis._count.opportunities}</p>
                <p className={styles.statLabel}>Opportunities</p>
              </div>
            </div>

            {opportunities.length > 0 && (
              <div className={styles.group}>
                <div className={styles.groupHeader}>
                  <span className={styles.groupLabel}>Opportunities</span>
                  <span className={styles.groupCount}>{opportunities.length}</span>
                </div>
                {opportunities.map((o) => (
                  <div key={o.id} className={styles.issueRow}>
                    <div className={styles.issueMain}>
                      <span className={styles.issueDot} data-tone={PRIORITY_TONE[o.priority] ?? "muted"} />
                      <div style={{ minWidth: 0 }}>
                        <div className={styles.issueTitle}>{o.title}</div>
                        <div className={styles.issueDesc}>{o.reason}</div>
                        <div className={`${styles.issueDesc} ${styles.mono}`} style={{ marginTop: 4 }}>→ {o.recommendation}</div>
                      </div>
                    </div>
                    <div className={styles.issueMeta}>
                      <span className={styles.mono} style={{ fontWeight: 600, color: "var(--primary)" }}>{o.score}</span>
                      <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: 2 }}>{o.affectedPages} page{o.affectedPages === 1 ? "" : "s"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {issues.length > 0 && (
              <div className={styles.group}>
                <div className={styles.groupHeader}>
                  <span className={styles.groupLabel}>SEO Issues</span>
                  <span className={styles.groupCount}>{issues.length}</span>
                </div>
                {issues.map((issue) => (
                  <div key={issue.id} className={styles.issueRow}>
                    <div className={styles.issueMain}>
                      <span className={styles.issueDot} data-tone={SEVERITY_TONE[issue.severity] ?? "muted"} />
                      <div style={{ minWidth: 0 }}>
                        <div className={styles.issueTitle}>{issue.description}</div>
                        {issue.evidence && <div className={styles.issueDesc}>Evidence: {issue.evidence}</div>}
                        <div className={`${styles.issueDesc} ${styles.mono}`} style={{ marginTop: 4 }}>→ {issue.recommendation}</div>
                      </div>
                    </div>
                    <div className={styles.issueMeta}>
                      {issue.pageUrl && <span className={`${styles.mono} ${styles.truncate}`} title={issue.pageUrl}>{issue.pageUrl}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
