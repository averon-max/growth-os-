"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./ui.module.css";

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
      setResult(`Updated ${data.updated} of ${data.requested} keyword${data.requested === 1 ? "" : "s"} via DataForSEO`);
      window.dispatchEvent(new CustomEvent("growth-os:keywords-updated"));
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
      <select
        value={market}
        onChange={(e) => setMarket(e.target.value as (typeof MARKET_OPTIONS)[number]["code"])}
        disabled={loading}
        style={{ fontSize: "0.75rem" }}
      >
        {MARKET_OPTIONS.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        onClick={enrich}
        disabled={loading}
        className={styles.link}
        style={{ background: "none", border: "none", cursor: loading ? "not-allowed" : "pointer", padding: 0, font: "inherit" }}
      >
        {loading ? "Fetching volume..." : "Enrich with search volume →"}
      </button>
      {result && <span style={{ fontSize: "0.75rem", color: "var(--success)" }}>{result}</span>}
      {error && <span style={{ fontSize: "0.75rem", color: "var(--danger)" }}>{error}</span>}
    </div>
  );
}
