"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Billing = {
  owner: boolean;
  plan?: string;
  planId?: string;
  status?: string;
  source?: string;
  periodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  card?: { brand: string; last4: string; exp: string } | null;
  invoices?: { id: string; date: string; amount: string; status: string; url: string | null }[];
  workspaceId?: string;
  switches?: { plan: string; name: string; dueNow: number | null; currency: string }[];
};

const card: React.CSSProperties = { border: "1px solid #1d1e22", borderRadius: 10, overflow: "hidden", marginBottom: 16 };
const head: React.CSSProperties = { padding: "12px 16px", borderBottom: "1px solid #1d1e22", fontSize: 13, fontWeight: 590, color: "#d0d6e0" };
const body: React.CSSProperties = { padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" };
const btn: React.CSSProperties = { height: 32, padding: "0 12px", border: "1px solid #2e2e2e", borderRadius: 6, background: "#0a0a0a", color: "#ededed", fontSize: 13, fontWeight: 510, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center" };
const danger: React.CSSProperties = { ...btn, color: "#e08a92", borderColor: "rgba(212,102,112,.3)", background: "rgba(212,102,112,.06)" };
const muted: React.CSSProperties = { color: "#8a8f98", fontSize: 13, lineHeight: 1.55, margin: 0 };
const day = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—");

export default function BillingPanel() {
  const [b, setB] = useState<Billing | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/billing/manage", { cache: "no-store" });
    setB(await res.json().catch(() => ({ owner: false })));
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function act(action: string, confirmText: string) {
    if (!confirm(confirmText)) return;
    setBusy(action);
    setMsg(null);
    const res = await fetch("/api/billing/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const data = await res.json().catch(() => ({}));
    setBusy("");
    setMsg(res.ok ? { ok: true, text: data.message ?? "Done." } : { ok: false, text: data.error ?? "Something went wrong." });
    await load();
  }

  async function portal() {
    setBusy("portal");
    const res = await fetch("/api/billing/portal-self", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy("");
    if (data.url) window.location.href = data.url;
    else setMsg({ ok: false, text: data.error ?? "Couldn't open the billing portal." });
  }

  async function switchTo(plan: string, name: string, due: number | null, currency: string) {
    const cost = due === null ? "the difference for the rest of this month" : due > 0 ? `${due.toFixed(2)} ${currency} now` : due < 0 ? `nothing now (${Math.abs(due).toFixed(2)} ${currency} goes to your next invoice)` : "nothing now";
    if (!confirm(`Switch to ${name}? You pay ${cost}. After that, the ${name} price renews each month.`)) return;
    setBusy("switch");
    setMsg(null);
    const res = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
    const data = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) return setMsg({ ok: false, text: data.error ?? "Couldn't switch plans." });
    setMsg({ ok: true, text: `You're on ${name} now.` });
    await load();
  }

  if (!b) return <p style={muted}>Loading…</p>;
  if (!b.owner) return <p style={muted}>Only the workspace owner can see and change billing.</p>;

  const stripe = b.source === "stripe";
  const live = stripe && ["active", "trialing", "past_due"].includes(b.status ?? "");
  const trial = b.status === "trialing";

  return (
    <div>
      <section style={card}>
        <div style={head}>Plan</div>
        <div style={{ ...body, justifyContent: "space-between" }}>
          <div>
            <div style={{ color: "#f7f8f8", fontSize: 15, fontWeight: 590 }}>
              {b.plan}{trial ? " · free trial" : ""}{b.source === "manual" && b.planId !== "FREE" ? " · granted" : ""}
            </div>
            <p style={muted}>
              {!live
                ? b.planId === "FREE" ? "Free plan. No card is charged." : b.periodEnd ? `Active until ${day(b.periodEnd)}.` : "Active."
                : b.cancelAtPeriodEnd
                  ? `Cancelled — ${trial ? "trial" : "access"} ends ${day(b.periodEnd)}. You won't be charged again.`
                  : trial
                    ? `Trial ends ${day(b.periodEnd)}. Your card is charged then unless you cancel before.`
                    : `Renews ${day(b.periodEnd)}.`}
              {b.status === "past_due" ? " The last payment failed — update your card." : ""}
            </p>
          </div>
          <Link href="/pricing" style={btn}>{b.planId === "FREE" ? "See plans" : "Change plan"}</Link>
        </div>
        {live ? (
          <div style={{ ...body, borderTop: "1px solid #1d1e22" }}>
            {b.cancelAtPeriodEnd ? (
              <button style={btn} disabled={!!busy} onClick={() => void act("resume", "Resume your subscription? It will renew and charge your card as usual.")}>Resume subscription</button>
            ) : (
              <button style={danger} disabled={!!busy} onClick={() => void act("cancel", trial ? "Cancel your trial? You keep access until it ends and won't be charged." : "Cancel your subscription? You keep access until the end of the period you paid for and won't be charged again.")}>
                {busy === "cancel" ? "Cancelling…" : trial ? "Cancel trial" : "Cancel subscription"}
              </button>
            )}
          </div>
        ) : null}
      </section>

      {live && !b.cancelAtPeriodEnd && b.switches && b.switches.length > 0 ? (
        <section style={card}>
          <div style={head}>Change plan</div>
          {b.switches.map((s) => (
            <div key={s.plan} style={{ ...body, justifyContent: "space-between", borderBottom: "1px solid #17181b" }}>
              <div>
                <div style={{ color: "#f7f8f8", fontSize: 14, fontWeight: 590 }}>{s.name}</div>
                <p style={muted}>
                  {s.dueNow === null
                    ? "You pay only the difference for the rest of this month."
                    : s.dueNow > 0
                      ? `Pay ${s.dueNow.toFixed(2)} ${s.currency} now${trial ? " — this ends your free trial" : " — the difference for the rest of this month"}.`
                      : s.dueNow < 0
                        ? `Nothing to pay now. ${Math.abs(s.dueNow).toFixed(2)} ${s.currency} is credited to your next invoice.`
                        : "Nothing to pay now."}
                </p>
              </div>
              <button style={btn} disabled={!!busy} onClick={() => void switchTo(s.plan, s.name, s.dueNow, s.currency)}>{busy === "switch" ? "Switching…" : `Switch to ${s.name}`}</button>
            </div>
          ))}
        </section>
      ) : null}

      <section style={card}>
        <div style={head}>Payment method</div>
        <div style={{ ...body, justifyContent: "space-between" }}>
          <p style={muted}>
            {b.card ? <><span style={{ color: "#f7f8f8", textTransform: "capitalize" }}>{b.card.brand}</span> ending in {b.card.last4} · expires {b.card.exp}</> : "No card saved."}
            <br />Cards are stored by Stripe. Hyprlyx never sees the full number.
          </p>
          <span style={{ display: "inline-flex", gap: 8 }}>
            {stripe ? <button style={btn} disabled={!!busy} onClick={() => void portal()}>{busy === "portal" ? "Opening…" : b.card ? "Update card" : "Add card"}</button> : null}
            {b.card ? (
              <button style={danger} disabled={!!busy} onClick={() => void act("removeCard", live && !b.cancelAtPeriodEnd ? "Remove your card? Your subscription will stop renewing, so nothing more is charged. You keep access until the end of the paid period." : "Remove your saved card?")}>
                {busy === "removeCard" ? "Removing…" : "Remove card"}
              </button>
            ) : null}
          </span>
        </div>
      </section>

      {b.invoices && b.invoices.length > 0 ? (
        <section style={card}>
          <div style={head}>Invoices</div>
          {b.invoices.map((i) => (
            <div key={i.id} style={{ ...body, justifyContent: "space-between", borderBottom: "1px solid #17181b", padding: "10px 16px" }}>
              <span style={{ color: "#d0d6e0", fontSize: 13 }}>{day(i.date)}</span>
              <span style={{ color: "#8a8f98", fontSize: 13 }}>{i.amount} · {i.status}</span>
              {i.url ? <a href={i.url} target="_blank" rel="noreferrer" style={{ ...btn, height: 26 }}>View</a> : <span />}
            </div>
          ))}
        </section>
      ) : null}

      {msg ? <p style={{ fontSize: 13, color: msg.ok ? "#68b77d" : "#e08a92" }}>{msg.text}</p> : null}
      <p style={muted}>Deleting your account (Settings → Account) also cancels any subscription and removes your saved card.</p>
    </div>
  );
}
