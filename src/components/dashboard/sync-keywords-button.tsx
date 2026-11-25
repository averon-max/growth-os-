"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import s from "./keyword-actions.module.css";

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
    <span className={s.bar}>
      <button type="button" onClick={sync} disabled={loading} className={s.button} title="Import the latest queries, clicks and positions from Google Search Console (free)">
        {loading ? <Loader2 size={14} className={s.spin} /> : <RefreshCw size={14} />}
        {loading ? "Syncing…" : "Sync Search Console"}
      </button>
      {result ? <span className={s.ok}>{result}</span> : null}
      {error ? <span className={s.err}>{error}</span> : null}
    </span>
  );
}
