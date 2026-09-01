"use client";

import { useEffect, useState, useCallback } from "react";
import { FileText, Sparkles } from "lucide-react";
import { EmptyState, Badge } from "./ui";
import uiStyles from "./ui.module.css";

interface OpportunityRow {
  id: string;
  title: string;
  reason: string;
  recommendation: string;
  score: number;
}

interface ArticleRow {
  id: string;
  title: string;
  status: string;
  publishError: string | null;
}

interface BriefRow {
  id: string;
  topic: string;
  primaryKeyword: string;
  searchIntent: string;
  status: string;
  articles: ArticleRow[];
}

const ARTICLE_STATUS_TONE: Record<string, "success" | "danger" | "warning" | "muted"> = {
  GENERATING: "warning",
  DRAFT: "muted",
  IN_REVIEW: "warning",
  APPROVED: "success",
  PUBLISHED: "success",
  PUBLISH_FAILED: "danger",
  REJECTED: "danger",
};

export function ContentExplorer({ websiteId, opportunities }: { websiteId: string; opportunities: OpportunityRow[] }) {
  const [briefs, setBriefs] = useState<BriefRow[] | null>(null);
  const [generatingOppId, setGeneratingOppId] = useState<string | null>(null);
  const [generatingArticleBriefId, setGeneratingArticleBriefId] = useState<string | null>(null);
  const [busyArticleId, setBusyArticleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadBriefs = useCallback(async () => {
    const res = await fetch(`/api/content/briefs?websiteId=${websiteId}`);
    if (res.ok) {
      const data = await res.json();
      setBriefs(data.items);
    }
  }, [websiteId]);

  useEffect(() => {
    loadBriefs();
  }, [loadBriefs]);

  const briefedOpportunityIds = new Set((briefs ?? []).map((b) => b.topic));

  const generateBrief = async (opp: OpportunityRow) => {
    setGeneratingOppId(opp.id);
    setError(null);
    try {
      const res = await fetch("/api/content/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId, opportunityId: opp.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to generate brief.");
        return;
      }
      await loadBriefs();
    } catch {
      setError("Network error.");
    } finally {
      setGeneratingOppId(null);
    }
  };

  const approveArticle = async (articleId: string) => {
    setBusyArticleId(articleId);
    setError(null);
    try {
      const res = await fetch(`/api/content/articles/${articleId}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to approve article.");
        return;
      }
      await loadBriefs();
    } catch {
      setError("Network error.");
    } finally {
      setBusyArticleId(null);
    }
  };

  const publishArticle = async (articleId: string) => {
    setBusyArticleId(articleId);
    setError(null);
    try {
      const res = await fetch(`/api/content/articles/${articleId}/publish`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to publish article.");
        return;
      }
      await loadBriefs();
    } catch {
      setError("Network error.");
    } finally {
      setBusyArticleId(null);
    }
  };

  const generateArticle = async (briefId: string) => {
    setGeneratingArticleBriefId(briefId);
    setError(null);
    try {
      const res = await fetch(`/api/content/briefs/${briefId}/generate-article`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to generate article.");
        return;
      }
      await loadBriefs();
    } catch {
      setError("Network error.");
    } finally {
      setGeneratingArticleBriefId(null);
    }
  };

  return (
    <div>
      {error && <div className={uiStyles.formError} style={{ marginBottom: 16 }}>{error}</div>}

      <div className={uiStyles.group} style={{ marginBottom: 16 }}>
        <div className={uiStyles.groupHeader}>
          <span className={uiStyles.groupLabel}>Content opportunities</span>
          <span className={uiStyles.groupCount}>{opportunities.length}</span>
        </div>
        {opportunities.length === 0 ? (
          <EmptyState icon={Sparkles} title="No opportunities yet" description="Run an SEO analysis to surface content opportunities." />
        ) : (
          opportunities.map((opp) => {
            const alreadyBriefed = briefedOpportunityIds.has(opp.title);
            return (
              <div key={opp.id} className={uiStyles.issueRow}>
                <div className={uiStyles.issueMain}>
                  <span className={uiStyles.issueDot} data-tone="accent" />
                  <div style={{ minWidth: 0 }}>
                    <div className={uiStyles.issueTitle}>{opp.title}</div>
                    <div className={uiStyles.issueDesc}>{opp.reason}</div>
                  </div>
                </div>
                <div className={uiStyles.issueMeta}>
                  {alreadyBriefed ? (
                    <span className={uiStyles.awaitingLabel}>Brief created</span>
                  ) : (
                    <button
                      onClick={() => generateBrief(opp)}
                      disabled={generatingOppId === opp.id}
                      className={uiStyles.link}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit" }}
                    >
                      {generatingOppId === opp.id ? "Generating brief..." : "Generate brief →"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className={uiStyles.group}>
        <div className={uiStyles.groupHeader}>
          <span className={uiStyles.groupLabel}>Briefs</span>
          <span className={uiStyles.groupCount}>{briefs?.length ?? 0}</span>
        </div>
        {!briefs || briefs.length === 0 ? (
          <EmptyState icon={FileText} title="No briefs yet" description="Generate a brief from an opportunity above to get started." />
        ) : (
          briefs.map((brief) => (
            <div key={brief.id} className={uiStyles.issueRow}>
              <div className={uiStyles.issueMain}>
                <span className={uiStyles.issueDot} data-tone="muted" />
                <div style={{ minWidth: 0 }}>
                  <div className={uiStyles.issueTitle}>{brief.topic}</div>
                  <div className={`${uiStyles.issueDesc} ${uiStyles.mono}`}>
                    {brief.primaryKeyword} · {brief.searchIntent}
                  </div>
                  {brief.articles.map((article) => (
                    <div key={article.id} style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                      <Badge tone={ARTICLE_STATUS_TONE[article.status] ?? "muted"}>{article.status}</Badge>
                      {article.title && <span className={uiStyles.issueDesc}>{article.title}</span>}
                      {article.publishError && <span style={{ color: "var(--danger)", fontSize: "0.72rem" }}>{article.publishError}</span>}
                      {article.status === "DRAFT" && (
                        <button
                          onClick={() => approveArticle(article.id)}
                          disabled={busyArticleId === article.id}
                          className={uiStyles.link}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit" }}
                        >
                          {busyArticleId === article.id ? "Approving..." : "Approve"}
                        </button>
                      )}
                      {article.status === "APPROVED" && (
                        <button
                          onClick={() => publishArticle(article.id)}
                          disabled={busyArticleId === article.id}
                          className={uiStyles.link}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit" }}
                        >
                          {busyArticleId === article.id ? "Publishing..." : "Publish"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className={uiStyles.issueMeta}>
                {brief.articles.length === 0 && (
                  <button
                    onClick={() => generateArticle(brief.id)}
                    disabled={generatingArticleBriefId === brief.id}
                    className={uiStyles.link}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit" }}
                  >
                    {generatingArticleBriefId === brief.id ? "Generating article..." : "Generate article →"}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
