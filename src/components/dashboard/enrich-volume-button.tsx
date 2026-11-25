"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Loader2 } from "lucide-react";
import s from "./keyword-actions.module.css";

const MARKET_OPTIONS = [
  { code: "US", label: "United States", language: "English" },
  { code: "CA", label: "Canada", language: "English" },
  { code: "GB", label: "United Kingdom", language: "English" },
  { code: "AU", label: "Australia", language: "English" },
] as const;

export function EnrichVolumeButton({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [market, setMarket] = useState<(typeof MARKET_OPTIONS)[number]["code"]>("US");

  const enrich = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const activeMarket = MARKET_OPTIONS.find((m) => m.code === market) ?? MARKET_OPTIONS[0];
      const res = await fetch("/api/keywords/volume-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          market: activeMarket.code,
          language: activeMarket.language,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Enrichment failed.");
        return;
      }
      setResult(`Updated ${data.updated} of ${data.requested} keyword${data.requested === 1 ? "" : "s"} `);
      window.dispatchEvent(new CustomEvent("growth-os:keywords-updated"));
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <span className={s.bar}>
      <span className={s.group}>
        <select
          className={s.select}
          aria-label="Market"
          value={market}
          onChange={(e) => setMarket(e.target.value as (typeof MARKET_OPTIONS)[number]["code"])}
          disabled={loading}
        >
          {MARKET_OPTIONS.map((option) => (
            <option key={option.code} value={option.code}>{option.label}</option>
          ))}
        </select>
        <button type="button" onClick={enrich} disabled={loading} className={s.button} title="Add search volume, difficulty and CPC to keywords that have none yet (about $0.01 per 700 keywords)">
          {loading ? <Loader2 size={14} className={s.spin} /> : <BarChart3 size={14} />}
          {loading ? "Fetching…" : "Add search volume"}
        </button>
      </span>
      {result ? <span className={s.ok}>{result}</span> : null}
      {error ? <span className={s.err}>{error}</span> : null}
    </span>
  );
}
