"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import a from "./admin.module.css";

export function CleanupButton() {
  const router = useRouter();
  const [state, setState] = useState<{ busy?: boolean; ok?: string; error?: string }>({});
  async function run() {
    setState({ busy: true });
    const res = await fetch("/api/admin/cleanup", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setState({ error: data.error ?? "Cleanup failed." });
    const removed = Object.entries((data.deleted ?? {}) as Record<string, number>).filter(([k]) => !k.endsWith(":error")).reduce((n, [, v]) => n + v, 0);
    setState({ ok: `Removed ${removed.toLocaleString()} rows.` });
    router.refresh();
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
      {state.ok ? <span className={a.ok}>{state.ok}</span> : null}
      {state.error ? <span className={a.err}>{state.error}</span> : null}
      <button type="button" className={a.btn} disabled={state.busy} onClick={() => void run()} style={{ height: 28 }}>
        {state.busy ? "Cleaning…" : "Run cleanup now"}
      </button>
    </span>
  );
}
