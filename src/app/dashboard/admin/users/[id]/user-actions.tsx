"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import a from "../../admin.module.css";

async function post(url: string, body: object): Promise<{ ok: boolean; error?: string; needsForce?: boolean }> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return res.ok ? { ok: true } : { ok: false, error: data.error ?? "Something went wrong.", needsForce: data.needsForce };
}

const PLAN_OPTIONS = [
  { value: "STARTER", label: "Starter" },
  { value: "GROWTH", label: "Growth" },
  { value: "AUTOPILOT", label: "Autopilot" },
  { value: "FREE", label: "Remove access (Free)" },
];

/** Give, change or remove a manual plan for one workspace. */
export function PlanForm({ workspaceId, currentPlan, stripeActive }: { workspaceId: string; currentPlan: string; stripeActive: boolean }) {
  const router = useRouter();
  const [plan, setPlan] = useState(currentPlan === "FREE" ? "STARTER" : currentPlan);
  const [months, setMonths] = useState("1");
  const [note, setNote] = useState("");
  const [state, setState] = useState<{ busy?: boolean; ok?: string; error?: string }>({});

  async function apply(force = false) {
    setState({ busy: true });
    const r = await post("/api/admin/subscription", { workspaceId, plan, months: plan === "FREE" ? 0 : Number(months), note, force });
    if (r.needsForce && confirm(`${r.error}\n\nOverride with a manual plan anyway?`)) return apply(true);
    if (!r.ok) return setState({ error: r.error });
    setNote("");
    setState({ ok: plan === "FREE" ? "Access removed." : "Plan saved." });
    router.refresh();
  }

  return (
    <form className={a.form} onSubmit={(e) => { e.preventDefault(); void apply(); }}>
      <label className={a.field}>
        <span className={a.label}>Plan</span>
        <select className={a.select} value={plan} onChange={(e) => setPlan(e.target.value)}>
          {PLAN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <label className={a.field}>
        <span className={a.label}>For</span>
        <select className={a.select} value={months} onChange={(e) => setMonths(e.target.value)} disabled={plan === "FREE"}>
          <option value="1">1 month</option>
          <option value="3">3 months</option>
          <option value="6">6 months</option>
          <option value="12">12 months</option>
          <option value="0">No end date</option>
        </select>
      </label>
      <label className={`${a.field} ${a.fieldGrow}`}>
        <span className={a.label}>Note (why)</span>
        <input className={a.input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. beta tester, refund, partner" maxLength={500} />
      </label>
      <button type="submit" className={`${a.btn} ${a.btnPrimary}`} disabled={state.busy}>{state.busy ? "Saving…" : "Apply"}</button>
      {state.ok ? <span className={a.ok}>{state.ok}</span> : null}
      {state.error ? <span className={a.err}>{state.error}</span> : null}
      {stripeActive ? <p className={a.hint} style={{ width: "100%" }}>This workspace pays through Stripe. Billing changes belong in Stripe; a manual plan here overrides it until removed.</p> : null}
    </form>
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
