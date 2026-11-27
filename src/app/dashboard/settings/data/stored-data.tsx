"use client";

import { useEffect, useState } from "react";
import s from "./stored-data.module.css";

type Row = { key: string; label: string; help: string; warn?: string; rows: number };

/** Copies of page data kept in this browser for instant loading; cleared together with server data. */
function clearBrowserCopies() {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith("hx:v1:")) localStorage.removeItem(k);
  } catch {
    /* storage unavailable */
  }
}

/** Settings → Data: every kind of saved data with its size and a Delete button that proves the result. */
export default function StoredData() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/settings/stored-data", { cache: "no-store" })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Couldn't load saved data.");
        setRows(j.stores);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  async function remove(r: Row) {
    if (!confirm(`Delete ${r.label.toLowerCase()} (${r.rows.toLocaleString("en-US")} records)?${r.warn ? `\n\n${r.warn}` : ""}\n\nThis can't be undone.`)) return;
    setBusy(r.key);
    setError("");
    const res = await fetch(`/api/settings/stored-data?store=${encodeURIComponent(r.key)}`, { method: "DELETE" });
    const j = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setError(j.error ?? "Couldn't delete.");
    clearBrowserCopies();
    setRows(j.stores);
    setNote((n) => ({ ...n, [r.key]: j.left === 0 ? `Deleted ${Number(j.deleted).toLocaleString("en-US")} records. Nothing left.` : `Deleted ${j.deleted}, ${j.left} still there — try again.` }));
  }

  if (error && !rows) return <p className={s.error}>{error}</p>;
  if (!rows) return <p className={s.muted}>Loading saved data…</p>;

  return (
    <section className={s.panel}>
      <header className={s.head}>
        <h2 className={s.title}>Saved data</h2>
        <p className={s.sub}>Everything Hyprlyx keeps for your sites, with a delete button for each. Your account, websites, keywords and approved or published articles are not in this list and are never deleted here.</p>
      </header>
      {rows.map((r) => (
        <div key={r.key} className={s.row}>
          <div className={s.text}>
            <div className={s.label}>{r.label}</div>
            <div className={s.help}>{r.help}</div>
            {note[r.key] ? <div className={s.note}>{note[r.key]}</div> : null}
          </div>
          <span className={s.count}>{r.rows < 0 ? "—" : r.rows.toLocaleString("en-US")}</span>
          <button type="button" className={s.delete} disabled={busy !== null || r.rows <= 0} onClick={() => void remove(r)}>
            {busy === r.key ? "Deleting…" : "Delete"}
          </button>
        </div>
      ))}
      {error ? <p className={s.error}>{error}</p> : null}
    </section>
  );
}
