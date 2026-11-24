"use client";

import { useState } from "react";
import { Sparkles, Search, TrendingUp, TrendingDown, Minus, Zap, Flame, ChevronRight } from "lucide-react";
import uiStyles from "./ui.module.css";
import styles from "./keyword-suggestions.module.css";
import { KeywordOverviewDrawer } from "./keyword-overview-drawer";
import { SuggestionFilterBar, applySuggestionFilters, EMPTY_FILTERS, type SuggestionFilters } from "./suggestion-filters";

export interface MonthlySearchPoint {
  year: number;
  month: number;
  searchVolume: number;
}

export interface SearchVolumeTrend {
  monthly: number | null;
  quarterly: number | null;
  yearly: number | null;
}

export interface Suggestion {
  keyword: string;
  searchVolume: number | null;
  competitionLevel: string | null;
  cpc: number | null;
  keywordDifficulty: number | null;
  monthlySearches: MonthlySearchPoint[];
  trend: SearchVolumeTrend | null;
}

export interface TrendQuery {
  query: string;
  value: number;
}

export interface TrendingData {
  topQueries: TrendQuery[];
  risingQueries: TrendQuery[];
}

function formatSuggVol(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "—";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 100_000) return `${Math.round(v / 1_000)}K`;
  if (v >= 10_000) return `${Math.round(v / 1_000)}K`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString("en-US");
}

function formatTrend(v: number): string {
  if (!Number.isFinite(v)) return "—";

  const sign = v > 0 ? "+" : "";

  if (Math.abs(v) >= 1000000) {
    return `${sign}${(v / 1000000).toFixed(1)}M%`;
  }

  if (Math.abs(v) >= 10000) {
    return `${sign}${(v / 1000).toFixed(0)}K%`;
  }

  if (Math.abs(v) >= 1000) {
    return `${sign}${(v / 1000).toFixed(1)}K%`;
  }

  return `${sign}${v}%`;
}

export function difficultyTone(difficulty: number | null): "success" | "warning" | "danger" | "muted" {
  if (difficulty === null) return "muted";
  if (difficulty < 30) return "success";
  if (difficulty < 60) return "warning";
  return "danger";
}

export function TrendBadge({ trend }: { trend: SearchVolumeTrend | null }) {
  const value = trend?.yearly ?? trend?.quarterly ?? trend?.monthly ?? null;
  const span = trend?.yearly != null ? "a year ago" : trend?.quarterly != null ? "3 months ago" : "last month";
  if (value === null) return <span className={uiStyles.mono}>&mdash;</span>;
  if (value > 0) {
    return (
      <span className={`${styles.trendBadge} ${styles.trendUp}`} title={`Monthly searches ${value}% vs. ${span} (Google Ads data)`}>
        <TrendingUp size={12} /> {formatTrend(value)}
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className={`${styles.trendBadge} ${styles.trendDown}`} title={`Monthly searches ${value}% vs. ${span} (Google Ads data)`}>
        <TrendingDown size={12} /> {formatTrend(value)}
      </span>
    );
  }
  return (
    <span className={`${styles.trendBadge} ${styles.trendFlat}`}>
      <Minus size={12} /> 0%
    </span>
  );
}

/** Google Trends marks growth above 5,000% as "Breakout": usually a brand-new search. */
const rising = (v: number) => (v >= 5000 ? "Breakout" : `+${v.toLocaleString("en-US")}%`);

export function TrendingQueries({ trending, onPick }: { trending: TrendingData | null; onPick?: (query: string) => void }) {
  if (!trending || (trending.topQueries.length === 0 && trending.risingQueries.length === 0)) return null;

  const columns = [
    {
      key: "rise",
      label: "Rising searches",
      hint: "Searches that grew the most compared with the period before. Breakout means growth above 5,000%, usually a new topic.",
      rows: trending.risingQueries.slice(0, 10),
      value: (q: TrendQuery) => rising(q.value),
      valueClass: `${styles.trendValue} ${styles.risingValue}`,
    },
    {
      key: "top",
      label: "Top searches",
      hint: "The most popular related searches. 100 is the most searched in this list; the others are relative to it, not search counts.",
      rows: trending.topQueries.slice(0, 10),
      value: (q: TrendQuery) => `${q.value}/100`,
      valueClass: styles.trendValue,
    },
  ];

  return (
    <div className={styles.trendingBlock}>
      <div className={styles.trendingHeader}>
        <div className={styles.trendingTitle}>
          <Flame size={13} className={styles.trendingIcon} />
          <span>Search momentum</span>
        </div>
        <span className={styles.freeBadge}>Google Trends</span>
      </div>

      <div className={styles.trendColumns}>
        {columns.map((col) => (
          <div key={col.key} className={styles.trendColumn}>
            <div className={styles.trendColumnLabel} title={col.hint}>{col.label}</div>
            <div className={styles.trendList}>
              {col.rows.map((q, index) => {
                const inner = (
                  <>
                    <span className={styles.trendRank}>{String(index + 1).padStart(2, "0")}</span>
                    <span className={styles.trendName} title={q.query}>{q.query}</span>
                    <span className={col.valueClass}>{col.value(q)}</span>
                  </>
                );
                return onPick ? (
                  <button
                    key={`${col.key}-${q.query}`}
                    type="button"
                    className={`${styles.trendRow} ${styles.trendButton}`}
                    onClick={() => onPick(q.query)}
                    title={`Open volume, difficulty and CPC for "${q.query}"`}
                  >
                    {inner}
                  </button>
                ) : (
                  <div key={`${col.key}-${q.query}`} className={styles.trendRow}>{inner}</div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CacheBadge({ fromCache }: { fromCache: boolean }) {
  if (fromCache) {
    return (
      <span className={`${styles.sourceBadge} ${styles.sourceCache}`}>
        <Zap size={11} /> from cache -- free
      </span>
    );
  }
  return (
    <span className={`${styles.sourceBadge} ${styles.sourceFresh}`}>
      <Zap size={11} /> fresh from DataForSEO
    </span>
  );
}

/** The table row for a keyword if it has one, otherwise just the keyword (the details panel loads its numbers). */
export function pickSuggestion(list: Suggestion[] | null, keyword: string): Suggestion {
  return (
    list?.find((s) => s.keyword.toLowerCase() === keyword.toLowerCase()) ?? {
      keyword,
      searchVolume: null,
      competitionLevel: null,
      cpc: null,
      keywordDifficulty: null,
      monthlySearches: [],
      trend: null,
    }
  );
}

export function SuggestionTable({
  suggestions,
  onSelect,
}: {
  suggestions: Suggestion[];
  onSelect: (s: Suggestion) => void;
}) {
  return (
    <table className={uiStyles.table}>
      <thead className={styles.suggestHead}>
        <tr>
          <th>Keyword</th>
          <th title="Average monthly Google searches over the last 12 months (Google Ads data via DataForSEO)">Volume</th>
          <th title="Change in monthly searches compared with a year ago">Trend</th>
          <th title="How hard it is to reach Google's top 10, 0–100. An estimate by DataForSEO based on the sites that rank now">Difficulty</th>
          <th title="What advertisers pay per click in Google Ads">CPC</th>
          <th title="How many advertisers bid on this search in Google Ads">Competition</th>
          <th aria-label="Open" />
        </tr>
      </thead>
      <tbody>
        {suggestions.map((s) => (
          <tr
            key={s.keyword}
            className={styles.clickableRow}
            onClick={() => onSelect(s)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(s);
              }
            }}
            tabIndex={0}
            title={`Open details for "${s.keyword}"`}
          >
            <td className={styles.keywordCell}>{s.keyword}</td>
            <td className={uiStyles.mono}>{formatSuggVol(s.searchVolume)}</td>
            <td><TrendBadge trend={s.trend} /></td>
            <td className={uiStyles.mono}>
              {s.keywordDifficulty != null ? (
                <span className={styles.difficultyBadge} data-tone={difficultyTone(s.keywordDifficulty)}>
                  {s.keywordDifficulty}
                </span>
              ) : (
                "\u2014"
              )}
            </td>
            <td className={uiStyles.mono}>{s.cpc != null ? `$${s.cpc.toFixed(2)}` : "\u2014"}</td>
            <td>{s.competitionLevel ?? "\u2014"}</td>
            <td className={styles.rowChevron}><ChevronRight size={14} aria-hidden /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function KeywordSuggestions({ workspaceId, market = "US" }: { workspaceId: string; market?: string }) {
  const [seed, setSeed] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [trending, setTrending] = useState<TrendingData | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [selected, setSelected] = useState<Suggestion | null>(null);
  const [filters, setFilters] = useState<SuggestionFilters>(EMPTY_FILTERS);

  const explore = async () => {
    if (!seed.trim() || loading) return;
    setLoading(true);
    setError(null);
    setRateLimited(false);
    try {
      const params = new URLSearchParams({ workspaceId, seed: seed.trim(), limit: "50", market });
      const res = await fetch(`/api/keywords/explore?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not fetch suggestions.");
        setRateLimited(res.status === 429);
        setSuggestions(null);
        setTrending(null);
        return;
      }
      setSuggestions(data.suggestions);
      setTrending(data.trending);
      setFromCache(data.fromCache);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Sparkles size={16} className={styles.icon} />
        <div>
          <div className={styles.title}>Keyword ideas</div>
          <div className={styles.subtitle}>
            Real search volume, CPC, trend &amp; monthly history from DataForSEO -- cached to minimize cost, plus free Google Trends signals.
          </div>
        </div>
      </div>

      <div className={styles.searchRow}>
        <div className={styles.searchBox}>
          <Search size={14} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="e.g. credit monitoring, identity theft protection..."
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && explore()}
          />
        </div>
        <button className={styles.exploreButton} onClick={explore} disabled={loading || !seed.trim()}>
          {loading ? "Searching..." : "Explore"}
        </button>
      </div>

      {error && (
        <p className={rateLimited ? styles.rateLimitError : styles.error}>{error}</p>
      )}

      {suggestions && suggestions.length === 0 && !error && (
        <p className={styles.empty}>No related keyword data found for this term.</p>
      )}

      {suggestions && suggestions.length > 0 && (
        <>
          <TrendingQueries trending={trending} onPick={(k) => setSelected(pickSuggestion(suggestions, k))} />
          {(() => {
            const filtered = applySuggestionFilters(suggestions, filters);
            return (
              <>
                <SuggestionFilterBar
                  filters={filters}
                  onChange={setFilters}
                  resultCount={filtered.length}
                  totalCount={suggestions.length}
                />
                <SuggestionTable suggestions={filtered} onSelect={setSelected} />
              </>
            );
          })()}
        </>
      )}

      {selected && (
        <KeywordOverviewDrawer
          keyword={selected.keyword}
          workspaceId={workspaceId}
          market={market}
          language="English"
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
