"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import styles from "./keyword-suggestions.module.css";
import { SuggestionTrendDrawer } from "./suggestion-trend-drawer";
import {
  SuggestionTable,
  TrendingQueries,
  CacheBadge,
  type Suggestion,
  type TrendingData,
} from "./keyword-suggestions";

export function IndustryTopKeywords({ workspaceId, seed }: { workspaceId: string; seed: string }) {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [trending, setTrending] = useState<TrendingData | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Suggestion | null>(null);

  useEffect(() => {
    if (!seed.trim()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ workspaceId, seed: seed.trim(), limit: "30" });
    fetch(`/api/keywords/explore?${params.toString()}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setError(data.error || "Could not load top keywords.");
          return;
        }
        setSuggestions(data.suggestions);
        setTrending(data.trending);
        setFromCache(data.fromCache);
      })
      .catch(() => setError("Network error."))
      .finally(() => setLoading(false));
  }, [workspaceId, seed]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Flame size={16} className={styles.icon} />
        <div>
          <div className={styles.title}>Top keywords in your industry</div>
          <div className={styles.subtitle}>
            Based on &quot;{seed}&quot; -- cached DataForSEO data plus free Google Trends signals, independent of your own site data.
          </div>
        </div>
      </div>

      {loading && <p className={styles.empty}>Loading...</p>}
      {error && <p className={styles.error}>{error}</p>}

      {suggestions && suggestions.length === 0 && !error && !loading && (
        <p className={styles.empty}>No industry keyword data found.</p>
      )}

      {suggestions && suggestions.length > 0 && (
        <>
          <div className={styles.resultCount}>
            {suggestions.length} keywords -- click a row for its 12-month trend <CacheBadge fromCache={fromCache} />
          </div>
          <TrendingQueries trending={trending} />
          <SuggestionTable suggestions={suggestions} onSelect={setSelected} />
        </>
      )}

      {selected && (
        <SuggestionTrendDrawer
          keyword={selected.keyword}
          monthlySearches={selected.monthlySearches}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
