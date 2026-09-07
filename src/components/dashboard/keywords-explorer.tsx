"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Tags, Search as SearchIcon } from "lucide-react";
import { EmptyState, Badge } from "./ui";
import uiStyles from "./ui.module.css";
import styles from "./keywords-explorer.module.css";
import { KeywordTrendDrawer } from "./keyword-trend-drawer";

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
  volume: number | null;
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
  const [searchInputValue, setSearchInputValue] = useState("");
  const [search, setSearch] = useState("");
  const [selectedKeywordId, setSelectedKeywordId] = useState<string | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      workspaceId,
      page: String(page),
      limit: String(PAGE_SIZE),
    });
    if (intent !== "ALL") params.set("intent", intent);
    if (search.trim()) params.set("filter", search.trim());

    const res = await fetch(`/api/keywords?${params.toString()}`);
    if (res.ok) {
      const json: KeywordsResponse = await res.json();
      setData(json);
    }
    setLoading(false);
  }, [workspaceId, page, intent, search]);

  useEffect(() => {
    load();
  }, [load]);

  // Sync/Enrich buttons are separate client components that update the DB
  // out of band -- they broadcast this event instead of relying on
  // router.refresh(), which does not re-run this component's own fetch.
  useEffect(() => {
    const handler = () => load();
    window.addEventListener("growth-os:keywords-updated", handler);
    return () => window.removeEventListener("growth-os:keywords-updated", handler);
  }, [load]);

  const handleSearchInput = (value: string) => {
    setSearchInputValue(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 300);
  };

  if (loading && !data) {
    return <p className={styles.loading}>Loading...</p>;
  }

  if (data && data.total === 0 && intent === "ALL" && !search.trim()) {
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
        <div className={styles.searchBox}>
          <SearchIcon size={14} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search keywords..."
            value={searchInputValue}
            onChange={(e) => handleSearchInput(e.target.value)}
          />
        </div>
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
            <th>Volume</th>
          </tr>
        </thead>
        <tbody>
          {data && data.items.length === 0 ? (
            <tr>
              <td colSpan={7} className={styles.emptyRow}>No keywords match this filter.</td>
            </tr>
          ) : (
            data?.items.map((kw) => {
              const snap = kw.snapshots[0];
              const position = snap?.position != null ? Number(snap.position) : null;
              const ctr = snap?.ctr != null ? Number(snap.ctr) : null;
              return (
                <tr key={kw.id} onClick={() => setSelectedKeywordId(kw.id)} className={styles.clickableRow}>
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
                  <td className={uiStyles.mono}>{kw.volume != null ? kw.volume.toLocaleString() : "—"}</td>
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

      {selectedKeywordId && (
        <KeywordTrendDrawer
          keywordId={selectedKeywordId}
          workspaceId={workspaceId}
          onClose={() => setSelectedKeywordId(null)}
        />
      )}
    </div>
  );
}
