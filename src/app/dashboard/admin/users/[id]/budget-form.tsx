"use client";

import { useState } from "react";


/** Admin → user → workspace: paid-data allowance in USD. Empty = the plan's allowance. */
export function BudgetForm({ workspaceId, perDay, perMonth, planDay, planMonth }: { workspaceId: string; perDay: number | null; perMonth: number | null; planDay: number; planMonth: number }) {
  const [day, setDay] = useState(perDay === null ? "" : String(perDay));
  const [month, setMonth] = useState(perMonth === null ? "" : String(perMonth));
  const [state, setState] = useState<"" | "busy" | "saved" | string>("");

  async function save(reset = false) {
    setState("busy");
    const res = await fetch("/api/admin/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, perDay: reset ? null : day, perMonth: reset ? null : month }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setState(data.error ?? "Couldn't save.");
    if (reset) { setDay(""); setMonth(""); }
    setState("saved");
  }

  const btn = { height: 32, padding: "0 12px", border: "1px solid #2e2e2e", borderRadius: 6, background: "#111", color: "#ededed", font: "inherit", fontSize: 13, cursor: "pointer" } as const;
  const input = { height: 32, width: 110, padding: "0 10px", border: "1px solid #2e2e2e", borderRadius: 6, background: "#0a0a0a", color: "#ededed", font: "inherit" } as const;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#a1a1a1" }}>$/day <input style={input} inputMode="decimal" placeholder={`${planDay} (plan)`} value={day} onChange={(e) => setDay(e.target.value)} /></label>
      <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#a1a1a1" }}>$/month <input style={input} inputMode="decimal" placeholder={`${planMonth} (plan)`} value={month} onChange={(e) => setMonth(e.target.value)} /></label>
      <button type="button" style={btn} disabled={state === "busy"} onClick={() => void save()}>Save</button>
      <button type="button" style={btn} disabled={state === "busy"} onClick={() => void save(true)}>Use plan</button>
      <span style={{ color: state === "saved" ? "#3dd68c" : "#ff6369", fontSize: 13 }}>{state === "saved" ? "Saved" : state === "busy" ? "" : state}</span>
    </div>
  );
}
