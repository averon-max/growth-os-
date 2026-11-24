"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import s from "./traffic.module.css";

/** Pulls the last 30 days from Cloudflare, then reloads the report with the new data. */
export function SyncButton({ websiteId, label, quiet }: { websiteId: string; label: string; quiet?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function sync() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/traffic/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Sync failed. Try again in a minute.");
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={quiet ? s.sourceActionQuiet : s.sourceAction} onClick={sync} disabled={busy}>
        <RefreshCw size={12} strokeWidth={2} className={busy ? s.spin : undefined} aria-hidden />
        {busy ? "Syncing…" : label}
      </button>
      {error ? <span className={s.sourceError} role="alert">{error}</span> : null}
    </>
  );
}
