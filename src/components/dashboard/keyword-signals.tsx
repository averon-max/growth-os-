"use client";

import { useEffect, useState, useCallback } from "react";
import { Zap } from "lucide-react";
import { EmptyState, Badge } from "./ui";
import uiStyles from "./ui.module.css";

interface KeywordSignal {
  type: "QUICK_WIN" | "HIGH_IMPRESSION_LOW_CTR" | "DECLINING" | "GROWING" | "LOST" | "CANNIBALIZATION";
  keywordId: string;
  keyword: string;
  evidence: Record<string, number | string>;
}

interface SignalsResponse {
  signals: KeywordSignal[];
  page: number;
  limit: number;
  keywordsScanned: number;
}

const SIGNAL_META: Record<KeywordSignal["type"], { label: string; tone: "success" | "warning" | "danger" | "accent" | "muted"; description: string }> = {
  QUICK_WIN: { label: "Quick wins", tone: "success", description: "Ranking 11–20 with meaningful impressions — close to page 1." },
  HIGH_IMPRESSION_LOW_CTR: { label: "High impressions, low CTR", tone: "warning", description: "Seen often in search but rarely clicked — title/snippet may need work." },
  DECLINING: { label: "Declining", tone: "danger", description: "Average position getting worse over the last 28 days." },
  GROWING: { label: "Growing", tone: "accent", description: "Average position improving over the last 28 days." },
  LOST: { label: "Lost", tone: "muted", description: "No fresh ranking data in over 2 weeks — may have dropped out of results." },
  CANNIBALIZATION: { label: "Cannibalization", tone: "danger", description: "Multiple pages on your site compete for the same keyword — consolidate or differentiate them." },
};

const SIGNAL_ORDER: KeywordSignal["type"][] = ["CANNIBALIZATION", "QUICK_WIN", "HIGH_IMPRESSION_LOW_CTR", "DECLINING", "LOST", "GROWING"];

export function KeywordSignals({ workspaceId }: { workspaceId: string }) {
  const [data, setData] = useState<SignalsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/keywords/signals?workspaceId=${workspaceId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setData(json))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener("growth-os:keywords-updated", handler);
    return () => window.removeEventListener("growth-os:keywords-updated", handler);
  }, [load]);

  if (loading) {
    return <p className={uiStyles.awaitingLabel}>Loading signals...</p>;
  }

  if (!data || data.signals.length === 0) {
    return (
      <EmptyState
        icon={Zap}
        title="No signals yet"
        description="Signals are detected from keyword ranking history — check back after a few days of data."
      />
    );
  }

  const grouped = SIGNAL_ORDER.map((type) => ({
    type,
    items: data.signals.filter((s) => s.type === type),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      {grouped.map((group) => {
        const meta = SIGNAL_META[group.type];
        return (
          <div key={group.type} className={uiStyles.group} style={{ marginBottom: 16 }}>
            <div className={uiStyles.groupHeader}>
              <span className={uiStyles.groupLabel}>{meta.label}</span>
              <span className={uiStyles.groupCount}>{group.items.length}</span>
            </div>
            {group.items.map((signal, i) => (
              <div key={`${signal.keywordId}-${i}`} className={uiStyles.issueRow}>
                <div className={uiStyles.issueMain}>
                  <span className={uiStyles.issueDot} data-tone={meta.tone} />
                  <div style={{ minWidth: 0 }}>
                    <div className={uiStyles.issueTitle}>{signal.keyword}</div>
                    <div className={uiStyles.issueDesc}>{meta.description}</div>
                  </div>
                </div>
                <div className={uiStyles.issueMeta}>
                  <span className={`${uiStyles.mono} ${uiStyles.issueDesc}`}>
                    {Object.entries(signal.evidence).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
