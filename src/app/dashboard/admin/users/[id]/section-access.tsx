"use client";

import { useState } from "react";
import a from "../../admin.module.css";

/** Admin → user → Page access: turn dashboard sections off (or back on) for this one user. Saved at once. */
export function SectionAccess({ userId, sections, blocked: initial }: { userId: string; sections: { key: string; label: string }[]; blocked: string[] }) {
  const [blocked, setBlocked] = useState<string[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function toggle(key: string) {
    const next = blocked.includes(key) ? blocked.filter((k) => k !== key) : [...blocked, key];
    setBusy(key);
    setError("");
    const res = await fetch("/api/admin/user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, action: "sections", blocked: next }) });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setError(data.error ?? "Couldn't save.");
    setBlocked(data.blocked ?? next);
  }

  return (
    <div className={a.access}>
      {sections.map((s) => {
        const on = !blocked.includes(s.key);
        return (
          <label key={s.key} className={a.accessRow} data-off={!on || undefined}>
            <span>{s.label}</span>
            <button type="button" role="switch" aria-checked={on} className={a.switch} data-on={on || undefined} disabled={busy !== null} onClick={() => void toggle(s.key)}>
              <i />
            </button>
          </label>
        );
      })}
      {error ? <p className={a.accessError}>{error}</p> : null}
    </div>
  );
}
