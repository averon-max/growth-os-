"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import a from "../../admin.module.css";

/** Reply by email, leave an internal note, or change the status. */
export function TicketActions({ id, status, canEmail, email }: { id: string; status: string; canEmail: boolean; email: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"reply" | "note">(canEmail ? "reply" : "note");
  const [text, setText] = useState("");
  const [current, setCurrent] = useState(status);
  const [state, setState] = useState<{ busy?: boolean; ok?: string; error?: string }>({});

  async function send(closeAfter = false) {
    setState({ busy: true });
    const res = await fetch("/api/admin/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, body: text, internal: mode === "note" }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setState({ error: data.error ?? "Couldn't send." });
    if (closeAfter) await changeStatus("closed", true);
    setText("");
    setState({ ok: mode === "note" ? "Note saved." : `Sent to ${email}.` });
    router.refresh();
  }

  async function changeStatus(next: string, quiet = false) {
    setCurrent(next);
    const res = await fetch("/api/admin/tickets", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: next }) });
    if (!res.ok) { setCurrent(status); if (!quiet) setState({ error: "Couldn't change status." }); return; }
    if (!quiet) { setState({ ok: `Marked ${next}.` }); router.refresh(); }
  }

  return (
    <div>
      <div className={a.composeTabs}>
        <div className={a.chips}>
          {canEmail ? <button type="button" className={a.chip} data-active={mode === "reply" ? "true" : "false"} onClick={() => setMode("reply")} style={{ border: 0, background: mode === "reply" ? undefined : "none", cursor: "pointer" }}>Reply to customer</button> : null}
          <button type="button" className={a.chip} data-active={mode === "note" ? "true" : "false"} onClick={() => setMode("note")} style={{ border: 0, background: mode === "note" ? undefined : "none", cursor: "pointer" }}>Internal note</button>
        </div>
        <span className={a.spacer} />
        <label className={a.field} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <span className={a.label}>Status</span>
          <select className={a.select} value={current} onChange={(e) => void changeStatus(e.target.value)}>
            <option value="open">Open</option>
            <option value="pending">Waiting on customer</option>
            <option value="closed">Closed</option>
          </select>
        </label>
      </div>
      <textarea
        className={a.textarea}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={mode === "reply" ? `Write to ${email}…` : "Only admins see notes."}
        maxLength={10000}
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 8 }}>
        <button type="button" className={`${a.btn} ${a.btnPrimary}`} disabled={state.busy || text.trim().length < 2} onClick={() => void send()}>
          {state.busy ? "Sending…" : mode === "reply" ? "Send reply" : "Save note"}
        </button>
        {mode === "reply" ? (
          <button type="button" className={a.btn} disabled={state.busy || text.trim().length < 2} onClick={() => void send(true)}>Send and close</button>
        ) : null}
        {state.ok ? <span className={a.ok}>{state.ok}</span> : null}
        {state.error ? <span className={a.err}>{state.error}</span> : null}
      </div>
    </div>
  );
}
