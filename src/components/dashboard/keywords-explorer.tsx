"use client";

import { useEffect, useState, useCallback } from "react";
import { Tags } from "lucide-react";
import { EmptyState, Badge } from "./ui";
import uiStyles from "./ui.module.css";
import styles from "./keywords-explorer.module.css";

interface KeywordSnapshotRow {
  position: string | null;
  impressions: number | null;
  clicks: number | null;
  ctr: string | null;
}

interface KeywordRow {
  id: string;
  text: string;
  intent: string | null;
  snapshots: KeywordSnapshotRow[];
}

interface KeywordsResponse {
  items: KeywordRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const INTENT_OPTIONS = ["ALL", "INFORMATIONAL", "COMMERCIAL", "TRANSACTIONAL", "NAVIGATIONAL"] as const;
const PAGE_SIZE = 25;

function positionTone(position: number | null): "success" | "warning" | "muted" {
  if (position === null) return "muted";
  if (position < 4) return "success";
  if (position <= 10) return "warning";
  return "muted";
}

export function KeywordsExplorer({ workspaceId }: { workspaceId: string }) {
  const [data, setData] = useState<KeywordsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [intent, setIntent] = useState<(typeof INTENT_OPTIONS)[number]>("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      workspaceId,
      page: String(page),
      limit: String(PAGE_SIZE),
    });
    if (intent !== "ALL") params.set("intent", intent);

    const res = await fetch(`/api/keywords?${params.toString()}`);
    if (res.ok) {
      const json: KeywordsResponse = await res.json();
      setData(json);
    }
    setLoading(false);
  }, [workspaceId, page, intent]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return <p className={styles.loading}>Loading...</p>;
  }

  if (data && data.total === 0 && intent === "ALL") {
    return (
      <EmptyState
        icon={Tags}
        title="No keyword data yet"
        description="Data imports automatically after connection."
      />
    );
  }

  return (
    <div>
      <div className={styles.filters}>
        <select
          className={styles.select}
          value={intent}
          onChange={(e) => {
            setPage(1);
            setIntent(e.target.value as (typeof INTENT_OPTIONS)[number]);
          }}
        >
          {INTENT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option === "ALL" ? "All intents" : option}
            </option>
          ))}
        </select>
      </div>

      <table className={uiStyles.table}>
        <thead>
          <tr>
            <th>Keyword</th>
            <th>Position</th>
            <th>Impressions</th>
            <th>Clicks</th>
            <th>CTR</th>
            <th>Intent</th>
          </tr>
        </thead>
        <tbody>
          {data && data.items.length === 0 ? (
            <tr>
              <td colSpan={6} className={styles.emptyRow}>No keywords match this filter.</td>
            </tr>
          ) : (
            data?.items.map((kw) => {
              const snap = kw.snapshots[0];
              const position = snap?.position != null ? Number(snap.position) : null;
              const ctr = snap?.ctr != null ? Number(snap.ctr) : null;
              return (
                <tr key={kw.id}>
                  <td>{kw.text}</td>
                  <td className={uiStyles.mono}>
                    {position !== null ? (
                      <Badge tone={positionTone(position)}>{position.toFixed(1)}</Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={uiStyles.mono}>{snap?.impressions ?? "—"}</td>
                  <td className={uiStyles.mono}>{snap?.clicks ?? "—"}</td>
                  <td className={uiStyles.mono}>{ctr !== null ? `${(ctr * 100).toFixed(1)}%` : "—"}</td>
                  <td>{kw.intent ? <Badge tone="muted">{kw.intent}</Badge> : "—"}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {data && (
        <div className={styles.pagination}>
          <button
            className={styles.pageButton}
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className={styles.pageLabel}>
            Page {data.page} of {Math.max(1, data.totalPages)}
          </span>
          <button
            className={styles.pageButton}
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
