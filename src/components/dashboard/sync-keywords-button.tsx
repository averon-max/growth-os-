"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./ui.module.css";

export function SyncKeywordsButton({ workspaceId, siteUrl }: { workspaceId: string; siteUrl: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sync = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/keywords/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, siteUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Sync failed.");
        return;
      }
      setResult(`Imported ${data.imported} keyword${data.imported === 1 ? "" : "s"}`);
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
        onClick={sync}
        disabled={loading}
        className={styles.link}
        style={{ background: "none", border: "none", cursor: loading ? "not-allowed" : "pointer", padding: 0, font: "inherit" }}
      >
        {loading ? "Syncing..." : "Sync now →"}
      </button>
      {result && <span style={{ fontSize: "0.75rem", color: "var(--success)" }}>{result}</span>}
      {error && <span style={{ fontSize: "0.75rem", color: "var(--danger)" }}>{error}</span>}
    </div>
  );
}
