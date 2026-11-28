"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { card as baseCard, head, label, input, btn, ghost, danger, note } from "@/components/dashboard/settings/settings-ui";

const card = { ...baseCard, marginTop: 0, marginBottom: 16 };

type Props = { email: string; name: string; since: string; plan: string; planStatus: string; planSource: string; renews: string | null };

const body: React.CSSProperties = { padding: "18px 20px", display: "grid", gap: 14 };

async function call(url: string, method: string, data?: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: data ? JSON.stringify(data) : undefined });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, error: json.error as string | undefined };
}

function Status({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return <span style={{ fontSize: 13, color: msg.ok ? "var(--success)" : "var(--danger)" }}>{msg.text}</span>;
}

export default function AccountForms(p: Props) {
  const [name, setName] = useState(p.name);
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [linkMsg, setLinkMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [confirm, setConfirm] = useState("");
  const [delMsg, setDelMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState("");

  async function saveName() {
    setBusy("name");
    const r = await call("/api/account/profile", "PUT", { name });
    setBusy("");
    setNameMsg(r.ok ? { ok: true, text: "Saved" } : { ok: false, text: r.error ?? "Couldn't save" });
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 10) return setPwMsg({ ok: false, text: "Use at least 10 characters." });
    setBusy("pw");
    const r = await call("/api/account/password", "POST", { current, next });
    setBusy("");
    if (!r.ok) return setPwMsg({ ok: false, text: r.error ?? "Couldn't change the password" });
    setPwMsg({ ok: true, text: "Password changed. Signing you out everywhere…" });
    setTimeout(() => signOut({ callbackUrl: "/login?reset=1" }), 1200);
  }

  async function sendLink() {
    setBusy("link");
    const r = await call("/api/auth/forgot-password", "POST", { email: p.email });
    setBusy("");
    setLinkMsg(r.ok ? { ok: true, text: `Link sent to ${p.email}` } : { ok: false, text: r.error ?? "Couldn't send" });
  }

  async function signOutAll() {
    setBusy("all");
    await call("/api/account/signout-all", "POST", {});
    signOut({ callbackUrl: "/login" });
  }

  async function deleteAccount() {
    setBusy("del");
    const r = await call("/api/account/delete", "POST", { confirm });
    if (!r.ok) { setBusy(""); return setDelMsg({ ok: false, text: r.error ?? "Couldn't delete" }); }
    signOut({ callbackUrl: "/" });
  }

  return (
    <div>
      <section style={card}>
        <div style={head}>Profile</div>
        <div style={body}>
          <div>
            <span style={label}>Email</span>
            <div style={{ fontSize: 14 }}>{p.email}</div>
          </div>
          <div>
            <label style={label} htmlFor="acc-name">Name</label>
            <input id="acc-name" style={input} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button style={btn} onClick={saveName} disabled={busy === "name"}>{busy === "name" ? "Saving…" : "Save"}</button>
            <Status msg={nameMsg} />
          </div>
          <p style={note}>Member since {p.since}</p>
        </div>
      </section>

      <section style={card}>
        <div style={head}>Password</div>
        <form style={body} onSubmit={changePassword}>
          <div>
            <label style={label} htmlFor="acc-current">Current password</label>
            <input id="acc-current" type="password" autoComplete="current-password" style={input} value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </div>
          <div>
            <label style={label} htmlFor="acc-next">New password</label>
            <input id="acc-next" type="password" autoComplete="new-password" style={input} value={next} onChange={(e) => setNext(e.target.value)} required maxLength={128} />
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button style={btn} disabled={busy === "pw"}>{busy === "pw" ? "Changing…" : "Change password"}</button>
            <Status msg={pwMsg} />
          </div>
          <p style={note}>
            Signed up with Google or don&apos;t remember your password?{" "}
            <button type="button" onClick={sendLink} disabled={busy === "link"} style={{ background: "none", border: 0, padding: 0, color: "#ededed", textDecoration: "underline", cursor: "pointer", font: "inherit" }}>
              Email me a link to set one
            </button>{" "}
            <Status msg={linkMsg} />
          </p>
        </form>
      </section>

      <section style={card}>
        <div style={head}>Plan</div>
        <div style={{ ...body, gridTemplateColumns: "1fr auto", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{p.plan}{p.planSource === "manual" ? " · granted" : ""}</div>
            <p style={note}>{p.plan === "FREE" ? "Free plan" : p.renews ? `${p.planStatus} · until ${p.renews}` : p.planStatus}</p>
          </div>
          <Link href={p.plan === "FREE" ? "/pricing" : "/dashboard/settings/billing"} style={ghost}>{p.plan === "FREE" ? "Upgrade" : "Manage billing"}</Link>
        </div>
      </section>

      <section style={card}>
        <div style={head}>Sessions</div>
        <div style={{ ...body, gridTemplateColumns: "1fr auto auto", alignItems: "center" }}>
          <p style={note}>Log out here, or on every device at once if you think someone else has access.</p>
          <button style={ghost} onClick={() => signOut({ callbackUrl: "/" })}>Log out</button>
          <button style={ghost} onClick={signOutAll} disabled={busy === "all"}>Log out everywhere</button>
        </div>
      </section>

      <section style={{ ...card, borderColor: "rgba(229,72,77,.3)" }}>
        <div style={{ ...head, color: "#ff6369" }}>Delete account</div>
        <div style={body}>
          <p style={note}>
            Permanently deletes your account and every workspace where you are the only member: websites, keywords, articles, imported links and history. Your subscription is cancelled and Google access is revoked.
            This can&apos;t be undone. Any paid subscription is cancelled right away and your saved card is removed, so you won&apos;t be charged again.
          </p>
          <div>
            <label style={label} htmlFor="acc-confirm">Type <b>{p.email}</b> to confirm</label>
            <input id="acc-confirm" style={input} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button style={{ ...danger, opacity: confirm.trim().toLowerCase() === p.email ? 1 : 0.4 }} disabled={confirm.trim().toLowerCase() !== p.email || busy === "del"} onClick={deleteAccount}>
              {busy === "del" ? "Deleting…" : "Delete my account"}
            </button>
            <Status msg={delMsg} />
          </div>
        </div>
      </section>
    </div>
  );
}
