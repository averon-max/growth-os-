"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./ui.module.css";

export function EnrichVolumeButton({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const enrich = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/keywords/volume-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
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
