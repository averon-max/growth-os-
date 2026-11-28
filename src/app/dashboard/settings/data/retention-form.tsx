"use client";

import { useEffect, useState } from "react";
import { card, row, select, btn, rowTitle, rowHelp } from "@/components/dashboard/settings/settings-ui";

type Tier = { key: string; label: string; help: string; def: number; min: number; max: number; allowForever: boolean; toggle?: boolean };
const PRESETS = [7, 14, 30, 60, 90, 180, 365];

export default function RetentionForm({ tiers }: { tiers: Tier[] }) {
  const [values, setValues] = useState<Record<string, number> | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/settings/retention").then((r) => r.json()).then((d) => setValues(d.settings ?? null)).catch(() => setError("Couldn't load settings."));
  }, []);

  async function save() {
    if (!values) return;
    setState("saving");
    const res = await fetch("/api/settings/retention", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settings: values }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setState("error"); setError(d.error ?? "Couldn't save."); return; }
    setValues(d.settings); setState("saved"); setTimeout(() => setState("idle"), 1800);
  }

  if (!values) return <p style={{ marginTop: 24, color: "var(--muted)", fontSize: 14 }}>{error || "Loading…"}</p>;


  return (
    <>
      <div style={card}>
        {tiers.map((t, i) => (
          <div key={t.key} style={{ ...row, borderTop: i ? row.borderTop : "none" }}>
            <div style={{ flex: 1 }}>
              <div style={rowTitle}>{t.label}</div>
              <div style={rowHelp}>{t.help}</div>
            </div>
            {t.toggle ? (
              <select style={select} value={values[t.key]} onChange={(e) => setValues({ ...values, [t.key]: Number(e.target.value) })}>
                <option value={1}>On</option>
                <option value={0}>Off — keep every day</option>
              </select>
            ) : (
              <select style={select} value={values[t.key]} onChange={(e) => setValues({ ...values, [t.key]: Number(e.target.value) })}>
                {PRESETS.filter((d) => d >= t.min && d <= t.max).map((d) => (
                  <option key={d} value={d}>{d} days{d === t.def ? " (default)" : ""}</option>
                ))}
                {t.allowForever ? <option value={0}>Keep forever{t.def === 0 ? " (default)" : ""}</option> : null}
              </select>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18 }}>
        <button onClick={save} disabled={state === "saving"} style={btn}>
          {state === "saving" ? "Saving…" : "Save"}
        </button>
        {state === "saved" ? <span style={{ fontSize: 13, color: "var(--success)" }}>Saved</span> : null}
        {state === "error" ? <span style={{ fontSize: 13, color: "var(--danger)" }}>{error}</span> : null}
      </div>
      <p style={{ marginTop: 28, fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6 }}>
        System records are handled automatically: security logs and rate limits 1–7 days, billing events 30 days,
        usage counters 62 days. Billing records required by tax law are kept by Stripe.
      </p>
    </>
  );
}
