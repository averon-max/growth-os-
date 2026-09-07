"use client";

import { useEffect, useState } from "react";
import { Globe2 } from "lucide-react";
import styles from "./keyword-suggestions.module.css";
import type { DailyTrendItem } from "@/lib/keywords/trends-provider";

export function GlobalTrending() {
  const [trends, setTrends] = useState<DailyTrendItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/trends/daily")
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setError(data.error || "Could not load global trends.");
          return;
        }
        setTrends(data.trends);
      })
      .catch(() => setError("Network error."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Globe2 size={16} className={styles.icon} />
        <div>
          <div className={styles.title}>Top 10 trending on the internet right now</div>
          <div className={styles.subtitle}>
            General daily Google Trends -- free, not tied to your industry or search terms.
          </div>
        </div>
      </div>

      {loading && <p className={styles.empty}>Loading...</p>}
      {error && <p className={styles.error}>{error}</p>}

      {trends && trends.length === 0 && !error && !loading && (
        <p className={styles.empty}>No trending data available right now.</p>
      )}

      {trends && trends.length > 0 && (
        <div className={styles.trendingChips}>
          {trends.slice(0, 10).map((t, idx) => (
            <span key={t.query} className={`${styles.chip} ${styles.chipRising}`} title={t.traffic}>
              {idx + 1}. {t.query}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
