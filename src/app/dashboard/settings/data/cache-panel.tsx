"use client";

import { useEffect, useState } from "react";

type Cat = {
  key: string; label: string; help: string; usedIn: string; def: number; days: number;
  rows: number; mb: number; saved: number; spent30: number; last: string | null;
};
type Report = {
  categories: Cat[];
  lastCleanup: { at: string; removedSaved: number; errors: string[] } | null;
  paused: boolean;
  dailyBudget: number;
  budgetOptions: number[];
  spentToday: number;
  todayByEndpoint: { endpoint: string; category: string; calls: number; cost: number }[];
};

const DAYS = [1, 3, 7, 14, 30, 60, 90, 180, 365, 0];
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

  return (
    <section style={{ marginTop: 48 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em", margin: 0 }}>Saved data and AI answers</h2>
      <p style={{ color: "var(--secondary)", fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
        Keyword numbers, Google results and backlinks come from DataForSEO, and drafts and research decisions come from the AI
        model; both charge for every request. Hyprlyx saves each answer and keeps it for the time you set below, so the same
        search is paid for only once. Longer means cheaper; shorter means fresher numbers and less stored data. Expired answers
        are deleted every night, and “Delete now” removes a kind at once. Only admins see this section.
      </p>

      <p style={{ ...small, fontSize: 13, marginTop: 14 }}>
        {data.lastCleanup
          ? <>Last cleanup: {new Date(data.lastCleanup.at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · removed {data.lastCleanup.removedSaved.toLocaleString()} expired saved answers{data.lastCleanup.errors.length ? ` · failed: ${data.lastCleanup.errors.join(", ")}` : " · no errors"}</>
          : "Cleanup has not run yet. It runs every night; an admin can also run it from the admin console."}
      </p>

      <div style={card}>
        <div style={{ ...row, borderTop: "none", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Paid data requests {data.paused ? <span style={{ color: "#f43f5e" }}>· paused</span> : <span style={{ color: "#16a34a" }}>· on</span>}</div>
            <div style={{ fontSize: 13, color: "var(--secondary)", marginTop: 4, lineHeight: 1.5 }}>
              Pause stops every new paid DataForSEO request at once (within a minute). Saved data keeps showing everywhere; buttons that need new data say it is paused.
            </div>
          </div>
          <button
            type="button"
            onClick={() => void send("PUT", { paused: !data.paused })}
            disabled={state === "saving"}
            style={{ height: 34, padding: "0 14px", borderRadius: 8, border: "1px solid", borderColor: data.paused ? "#16a34a" : "#f43f5e", background: "transparent", color: data.paused ? "#16a34a" : "#f43f5e", fontSize: 13.5, fontWeight: 500, cursor: "pointer" }}
          >
            {data.paused ? "Resume paid data" : "Pause paid data"}
          </button>
        </div>
        <div style={{ ...row, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Daily limit · spent today {money(data.spentToday)}</div>
            <div style={{ fontSize: 13, color: "var(--secondary)", marginTop: 4, lineHeight: 1.5 }}>
              Once today&apos;s DataForSEO spending reaches the limit, new requests wait until tomorrow (UTC). AI costs are counted separately.
            </div>
          </div>
          <select style={select} value={data.dailyBudget} onChange={(e) => void send("PUT", { dailyBudget: Number(e.target.value) })}>
            {[...new Set([...data.budgetOptions, data.dailyBudget])].sort((a, b) => a - b).map((b) => <option key={b} value={b}>${b.toFixed(2)} a day</option>)}
          </select>
        </div>
        <div style={{ ...row, flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>What cost money today</div>
          {data.todayByEndpoint.length === 0 ? (
            <div style={small}>Nothing paid today.</div>
          ) : (
            <div style={{ width: "100%", display: "grid", gap: 4 }}>
              {data.todayByEndpoint.map((r) => (
                <div key={r.endpoint} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 70px 80px", gap: 12, fontSize: 13, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--font-geist-mono, monospace)", fontSize: 12.5, color: "var(--secondary)" }} title={r.endpoint}>{r.endpoint.replace(/^v3\//, "")}</span>
                  <span style={{ textAlign: "right", color: "var(--muted)" }}>{r.calls} {r.calls === 1 ? "call" : "calls"}</span>
                  <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.cost < 0.01 ? `$${r.cost.toFixed(4)}` : money(r.cost)}</span>
                </div>
              ))}
            </div>
          )}
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
              {DAYS.map((d) => <option key={d} value={d}>{d === 0 ? "Keep forever" : `Keep ${d === 1 ? "1 day" : `${d} days`}`}{d === c.def ? " (default)" : ""}</option>)}
            </select>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18 }}>
        <button
          onClick={() => void send("PUT", { days })}
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
