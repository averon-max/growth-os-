"use client";

import { useEffect, useState } from "react";

type Cat = {
  key: string; label: string; help: string; usedIn: string; def: number; days: number;
  rows: number; mb: number; saved: number; spent30: number; last: string | null;
};
type Report = { dailyBudget: number; spentToday: number; categories: Cat[] };

const DAYS = [1, 3, 7, 14, 30, 60, 90, 180, 365];
const BUDGETS = [1, 2, 3, 5, 10, 20, 50];
const money = (n: number) => (n < 0.01 && n > 0 ? "<$0.01" : `$${n.toFixed(2)}`);
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—");

/** Settings → Data: saved DataForSEO answers. Shown to admins only (the API answers 403 to everyone else). */
export default function CachePanel() {
  const [data, setData] = useState<Report | null>(null);
  const [hidden, setHidden] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/settings/data-cache")
      .then(async (r) => (r.status === 403 ? setHidden(true) : setData(await r.json())))
      .catch(() => setError("Couldn't load saved data."));
  }, []);

  async function send(method: "PUT" | "DELETE", body?: object, query = "") {
    setState("saving");
    const res = await fetch(`/api/settings/data-cache${query}`, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setState("error"); setError(d.error ?? "Couldn't save."); return; }
    setData(d); setState("saved"); setTimeout(() => setState("idle"), 1800);
  }

  if (hidden) return null;
  if (!data) return <p style={{ marginTop: 40, color: "var(--muted)", fontSize: 14 }}>{error || "Loading saved data…"}</p>;

  const days = Object.fromEntries(data.categories.map((c) => [c.key, c.days]));
  const setDays = (key: string, v: number) => setData({ ...data, categories: data.categories.map((c) => (c.key === key ? { ...c, days: v } : c)) });
  const card: React.CSSProperties = { border: "1px solid var(--border)", background: "var(--surface)", borderRadius: 12, marginTop: 20, overflow: "hidden" };
  const row: React.CSSProperties = { display: "flex", alignItems: "flex-start", gap: 20, padding: "16px 18px", borderTop: "1px solid var(--border)" };
  const select: React.CSSProperties = { height: 34, padding: "0 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--primary)", fontSize: 13.5, minWidth: 130 };
  const small: React.CSSProperties = { fontSize: 12.5, color: "var(--muted)", marginTop: 6, lineHeight: 1.5 };
  const link: React.CSSProperties = { border: 0, background: "none", padding: 0, color: "var(--secondary)", fontSize: 12.5, textDecoration: "underline", cursor: "pointer" };
  const pct = Math.min(100, Math.round((data.spentToday / data.dailyBudget) * 100));

  return (
    <section style={{ marginTop: 48 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em", margin: 0 }}>Saved search data</h2>
      <p style={{ color: "var(--secondary)", fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
        Keyword numbers, Google results and backlinks come from DataForSEO, which charges for every request. Hyprlyx saves each
        answer and reuses it for everyone until it is older than the time you set below, so the same search is paid for only once.
        Longer means cheaper; shorter means fresher numbers. Old data is deleted every night. Only admins see this section.
      </p>

      <div style={card}>
        <div style={{ ...row, borderTop: "none", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Daily spending limit</div>
            <div style={{ fontSize: 13, color: "var(--secondary)", marginTop: 4, lineHeight: 1.5 }}>
              When today&apos;s DataForSEO spending reaches this, no new data is bought until tomorrow. Saved data keeps working.
            </div>
            <div style={{ height: 4, borderRadius: 2, background: "var(--surface-2)", marginTop: 10, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: pct >= 90 ? "var(--danger)" : "var(--primary)" }} />
            </div>
            <div style={small}>Spent today: {money(data.spentToday)} of ${data.dailyBudget}</div>
          </div>
          <select style={select} value={data.dailyBudget} onChange={(e) => setData({ ...data, dailyBudget: Number(e.target.value) })}>
            {[...new Set([...BUDGETS, data.dailyBudget])].sort((a, b) => a - b).map((b) => <option key={b} value={b}>${b} a day</option>)}
          </select>
        </div>
      </div>

      <div style={card}>
        {data.categories.map((c, i) => (
          <div key={c.key} style={{ ...row, borderTop: i ? row.borderTop : "none" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{c.label}</div>
              <div style={{ fontSize: 13, color: "var(--secondary)", marginTop: 4, lineHeight: 1.5 }}>{c.help}</div>
              <div style={small}>Used in: {c.usedIn}</div>
              <div style={small}>
                {c.rows.toLocaleString()} saved answers · {c.mb} MB · last saved {when(c.last)} · spent in 30 days {money(c.spent30)} · saved by reuse {money(c.saved)}
                {c.rows > 0 ? (
                  <>
                    {" · "}
                    <button
                      type="button"
                      style={link}
                      onClick={() => { if (confirm(`Delete all saved "${c.label}"? The next request for it will be paid again.`)) void send("DELETE", undefined, `?category=${c.key}`); }}
                    >
                      Delete now
                    </button>
                  </>
                ) : null}
              </div>
            </div>
            <select style={select} value={c.days} onChange={(e) => setDays(c.key, Number(e.target.value))}>
              {DAYS.map((d) => <option key={d} value={d}>Keep {d === 1 ? "1 day" : `${d} days`}{d === c.def ? " (default)" : ""}</option>)}
            </select>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18 }}>
        <button
          onClick={() => void send("PUT", { days, dailyBudget: data.dailyBudget })}
          disabled={state === "saving"}
          style={{ height: 36, padding: "0 18px", borderRadius: 999, border: 0, background: "var(--primary)", color: "var(--background)", fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}
        >
          {state === "saving" ? "Saving…" : "Save"}
        </button>
        {state === "saved" ? <span style={{ fontSize: 13, color: "var(--success)" }}>Saved</span> : null}
        {state === "error" ? <span style={{ fontSize: 13, color: "var(--danger)" }}>{error}</span> : null}
      </div>
    </section>
  );
}
