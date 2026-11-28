"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import a from "../../admin.module.css";

async function post(url: string, body: object): Promise<{ ok: boolean; error?: string; needsForce?: boolean }> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return res.ok ? { ok: true } : { ok: false, error: data.error ?? "Something went wrong.", needsForce: data.needsForce };
}

const PAID = [
  { value: "STARTER", label: "Starter" },
  { value: "GROWTH", label: "Growth" },
  { value: "AUTOPILOT", label: "Autopilot" },
];

type PlanState = {
  workspaceId: string;
  plan: string;
  source: string;
  stripeActive: boolean;
  cancelAtPeriodEnd: boolean;
  /** End of the manual plan or of the Stripe period, ISO date (yyyy-mm-dd), or null. */
  until?: string | null;
};

/** Everything that can be done with one workspace's plan: manual grants, extensions, Stripe changes, cancellation and refunds. */
export function PlanForm({ workspaceId, plan, source, stripeActive, cancelAtPeriodEnd, until = null }: PlanState) {
  const router = useRouter();
  const manualLive = source === "manual" && plan !== "FREE";
  const [grant, setGrant] = useState(plan === "FREE" ? "STARTER" : plan);
  const [months, setMonths] = useState("1");
  const [delta, setDelta] = useState("1");
  const [endDate, setEndDate] = useState(until ?? "");
  const [note, setNote] = useState("");
  const [change, setChange] = useState(plan === "FREE" ? "STARTER" : plan);
  const [refund, setRefund] = useState(false);
  const [state, setState] = useState<{ busy?: string; ok?: string; error?: string }>({});

  async function act(action: string, extra: object = {}, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    setState({ busy: action });
    const res = await fetch("/api/admin/subscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, action, note, ...extra }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setState({ error: data.error ?? "Something went wrong." });
    setNote("");
    setState({ ok: data.message ?? "Saved." });
    router.refresh();
  }
  const busy = !!state.busy;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {stripeActive ? (
        <>
          <div className={a.form}>
            <label className={a.field}>
              <span className={a.label}>Change plan in Stripe</span>
              <select className={a.select} value={change} onChange={(e) => setChange(e.target.value)}>
                {PAID.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <button type="button" className={`${a.btn} ${a.btnPrimary}`} disabled={busy || change === plan} onClick={() => void act("stripeChange", { plan: change }, `Move this customer to ${change} in Stripe? The price difference is charged or credited right away.`)}>
              {state.busy === "stripeChange" ? "Changing…" : "Change plan"}
            </button>
            {cancelAtPeriodEnd ? (
              <button type="button" className={a.btn} disabled={busy} onClick={() => void act("stripeResume")}>Undo cancellation</button>
            ) : (
              <button type="button" className={a.btn} disabled={busy} onClick={() => void act("stripeCancel", {}, "Cancel at the end of the paid period? The customer keeps access until then and is not charged again.")}>Cancel at period end</button>
            )}
          </div>
          <div className={a.form}>
            <label className={a.field} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={refund} onChange={(e) => setRefund(e.target.checked)} />
              <span className={a.label} style={{ color: "#f7f8f8" }}>Refund the last payment</span>
            </label>
            <button type="button" className={`${a.btn} ${a.btnDanger}`} disabled={busy} onClick={() => void act("remove", { refund }, `Cancel the Stripe subscription now and remove access${refund ? ", and refund the last payment" : ""}? This cannot be undone.`)}>
              {state.busy === "remove" ? "Cancelling…" : "Cancel now and remove access"}
            </button>
          </div>
          <p className={a.hint}>This customer pays through Stripe. Changes here are made in Stripe, so the next webhook keeps them.</p>
        </>
      ) : (
        <>
          <div className={a.form}>
            <label className={a.field}>
              <span className={a.label}>Give plan</span>
              <select className={a.select} value={grant} onChange={(e) => setGrant(e.target.value)}>
                {PAID.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label className={a.field}>
              <span className={a.label}>Months (0 = no end)</span>
              <input className={a.input} style={{ width: 120 }} type="number" min={0} max={120} step={1} value={months} onChange={(e) => setMonths(e.target.value)} />
            </label>
            <label className={`${a.field} ${a.fieldGrow}`}>
              <span className={a.label}>Note (why)</span>
              <input className={a.input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. beta tester, partner, refund" maxLength={500} />
            </label>
            <button type="button" className={`${a.btn} ${a.btnPrimary}`} disabled={busy} onClick={() => void act("grant", { plan: grant, months: Number(months) })}>
              {state.busy === "grant" ? "Saving…" : manualLive ? "Replace plan" : "Give plan"}
            </button>
          </div>
          {manualLive ? (
            <>
              <div className={a.form}>
                <label className={a.field}>
                  <span className={a.label}>Months</span>
                  <input className={a.input} style={{ width: 90 }} type="number" min={1} max={120} step={1} value={delta} onChange={(e) => setDelta(e.target.value)} />
                </label>
                <button type="button" className={a.btn} disabled={busy || !(Number(delta) > 0)} onClick={() => void act("extend", { months: Math.abs(Number(delta)) })}>+ Add months</button>
                <button type="button" className={a.btn} disabled={busy || !(Number(delta) > 0)} onClick={() => void act("extend", { months: -Math.abs(Number(delta)) }, `Take ${Math.abs(Number(delta))} month(s) off? If no time is left, access is removed now.`)}>− Remove months</button>
                <span className={a.spacer} />
                <label className={a.field}>
                  <span className={a.label}>Ends on</span>
                  <input className={a.input} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </label>
                <button type="button" className={a.btn} disabled={busy} onClick={() => void act("setEnd", { until: endDate })}>{endDate ? "Set date" : "No end date"}</button>
              </div>
              <div className={a.form}>
                <p className={a.hint} style={{ margin: 0 }}>{until ? `Currently ends ${new Date(`${until}T12:00:00`).toDateString()}.` : "Currently has no end date."} Months are counted as 30 days.</p>
                <span className={a.spacer} />
                <button type="button" className={`${a.btn} ${a.btnDanger}`} disabled={busy} onClick={() => void act("remove", {}, "Remove this plan now? Paid sections close immediately.")}>
                  {state.busy === "remove" ? "Removing…" : "Remove access"}
                </button>
              </div>
            </>
          ) : null}
        </>
      )}
      {state.ok ? <span className={a.ok}>{state.ok}</span> : null}
      {state.error ? <span className={a.err}>{state.error}</span> : null}
    </div>
  );
}

/** Compact plan control for a row in the users list. */
export function QuickPlan({ workspaceId, plan, stripeActive, userId }: { workspaceId: string | null; plan: string; stripeActive: boolean; userId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!workspaceId) return <span className={a.muted}>No workspace</span>;
  if (stripeActive) return <a className={a.panelLink} style={{ marginLeft: 0 }} href={`/dashboard/admin/users/${userId}`}>Manage in Stripe →</a>;

  async function apply(value: string) {
    if (!value) return;
    let [action, p, m] = value.split(":");
    if (action === "custom") {
      const asked = prompt(`Give ${p} for how many months? (0 = no end date)`, "2");
      if (asked === null) return;
      const n = Math.trunc(Number(asked));
      if (!Number.isFinite(n) || n < 0 || n > 120) return setError("Enter 0–120 months");
      action = "grant";
      m = String(n);
      setBusy(true);
      setError("");
      const res = await fetch("/api/admin/subscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, action, plan: p, months: n }) });
      const data = await res.json().catch(() => ({}));
      setBusy(false);
      if (!res.ok) return setError(data.error ?? "Failed");
      return router.refresh();
    }
    const text = action === "remove" ? "Remove this plan now?" : `Give ${p} for ${m === "0" ? "no end date" : `${m} month${m === "1" ? "" : "s"}`}?`;
    if (!confirm(text)) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/subscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, action, plan: p, months: Number(m ?? 0) }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Failed");
    router.refresh();
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <select className={a.select} style={{ height: 28, fontSize: 12 }} value="" disabled={busy} onChange={(e) => void apply(e.target.value)} aria-label="Change plan">
        <option value="">{busy ? "Saving…" : "Change…"}</option>
        <optgroup label="Give for 1 month">
          {PAID.map((o) => <option key={o.value} value={`grant:${o.value}:1`}>{o.label}</option>)}
        </optgroup>
        <optgroup label="Give with no end date">
          {PAID.map((o) => <option key={o.value} value={`grant:${o.value}:0`}>{o.label}</option>)}
        </optgroup>
        <optgroup label="Give for any number of months">
          {PAID.map((o) => <option key={o.value} value={`custom:${o.value}`}>{o.label}…</option>)}
        </optgroup>
        {plan !== "FREE" ? <option value="remove::0">Remove access</option> : null}
      </select>
      {error ? <span className={a.err}>{error}</span> : null}
    </span>
  );
}

/** Account actions for one user. Every action is written to the audit log. */
export function UserActions({ userId, email, isAdmin, self }: { userId: string; email: string; isAdmin: boolean; self: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});
  const [busy, setBusy] = useState("");

  async function run(action: string, extra: object, done: string) {
    setBusy(action);
    setMsg({});
    const r = await post("/api/admin/user", { userId, action, ...extra });
    setBusy("");
    if (!r.ok) return setMsg({ error: r.error });
    setMsg({ ok: done });
    if (action === "delete") router.push("/dashboard/admin/users");
    else router.refresh();
  }

  return (
    <div className={a.actions}>
      <button type="button" className={a.btn} disabled={!!busy} onClick={() => run("sendReset", {}, `Reset link sent to ${email}.`)}>
        {busy === "sendReset" ? "Sending…" : "Send password reset link"}
      </button>
      <button type="button" className={a.btn} disabled={!!busy} onClick={() => confirm(`Sign ${email} out on every device?`) && run("signOut", {}, "Signed out everywhere.")}>
        {busy === "signOut" ? "…" : "Sign out on all devices"}
      </button>
      {self ? null : (
        <button type="button" className={a.btn} disabled={!!busy} onClick={() => confirm(isAdmin ? `Remove admin rights from ${email}?` : `Make ${email} an admin? They will see this console and can change any account.`) && run("setAdmin", { isAdmin: !isAdmin }, isAdmin ? "Admin rights removed." : "Now an admin.")}>
          {isAdmin ? "Remove admin rights" : "Make admin"}
        </button>
      )}
      {self ? null : (
        <button
          type="button"
          className={`${a.btn} ${a.btnDanger}`}
          disabled={!!busy}
          onClick={() => {
            const typed = prompt(`Delete ${email} for good? Their workspaces where they are the only member are deleted with all data.\n\nType the email to confirm:`);
            if (typed !== null) void run("delete", { confirm: typed }, "Deleted.");
          }}
        >
          Delete account…
        </button>
      )}
      {msg.ok ? <span className={a.ok}>{msg.ok}</span> : null}
      {msg.error ? <span className={a.err}>{msg.error}</span> : null}
    </div>
  );
}
