"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquarePlus, X } from "lucide-react";

const KINDS = [
  { value: "Bug", label: "Something's broken" },
  { value: "Idea", label: "Idea or request" },
  { value: "Confusing", label: "Something's confusing" },
  { value: "Praise", label: "Something works great" },
];

export function FeedbackWidget() {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("Bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (pathname.startsWith("/support")) return null;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, message, email, pageUrl: window.location.pathname + window.location.search, viewport: `${window.innerWidth}x${window.innerHeight}` }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setState("error"); setError(d.error ?? "Couldn't send."); return; }
    setState("sent"); setMessage("");
    setTimeout(() => { setOpen(false); setState("idle"); }, 1600);
  }

  const S = {
    fab: { position: "fixed", right: 18, bottom: 18, zIndex: 90, display: "inline-flex", alignItems: "center", gap: 7, height: 34, padding: "0 13px", borderRadius: 999, border: "1px solid #2a2d33", background: "#141516", color: "#ededed", font: "500 13px Inter, system-ui, sans-serif", cursor: "pointer", boxShadow: "0 10px 30px -10px rgba(0,0,0,.8)" },
    panel: { position: "fixed", right: 18, bottom: 62, zIndex: 91, width: "min(360px, calc(100vw - 36px))", padding: 18, borderRadius: 14, border: "1px solid #23252a", background: "#0a0a0a", color: "#ededed", font: "14px Inter, system-ui, sans-serif", boxShadow: "0 30px 80px -20px rgba(0,0,0,.9)" },
    input: { width: "100%", boxSizing: "border-box", borderRadius: 9, border: "1px solid #23252a", background: "#141516", color: "#ededed", font: "inherit", fontSize: 13.5, outline: "none" },
  } satisfies Record<string, React.CSSProperties>;

  return (
    <>
      {open ? (
        <form style={S.panel} onSubmit={send} role="dialog" aria-label="Send feedback">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <b style={{ fontWeight: 600 }}>Send feedback</b>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" style={{ background: "none", border: 0, color: "#8f8f8f", cursor: "pointer" }}><X size={16} /></button>
          </div>
          {state === "sent" ? (
            <p style={{ margin: "8px 0", color: "#a9dcb9" }}>Thanks — the team will read this.</p>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
                {KINDS.map((k) => (
                  <button type="button" key={k.value} onClick={() => setKind(k.value)}
                    style={{ padding: "8px 9px", borderRadius: 8, textAlign: "left", fontSize: 12.5, cursor: "pointer", border: `1px solid ${kind === k.value ? "#4b84ef" : "#23252a"}`, background: kind === k.value ? "rgba(75,132,239,.12)" : "#141516", color: kind === k.value ? "#cfe0ff" : "#b4b8bf" }}>
                    {k.label}
                  </button>
                ))}
              </div>
              <textarea required minLength={5} maxLength={4000} value={message} onChange={(e) => setMessage(e.target.value)} autoFocus
                placeholder="What happened or what would make this better? The current page is attached automatically."
                style={{ ...S.input, height: 110, padding: 10, resize: "vertical", lineHeight: 1.5 }} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email for a reply (optional if logged in)" maxLength={254}
                style={{ ...S.input, height: 36, padding: "0 10px", marginTop: 8 }} />
              {state === "error" ? <p style={{ color: "#f0a3aa", fontSize: 12.5, margin: "8px 0 0" }}>{error}</p> : null}
              <button disabled={state === "sending"} style={{ marginTop: 12, width: "100%", height: 36, borderRadius: 999, border: 0, background: "#ededed", color: "#000000", fontWeight: 600, cursor: "pointer" }}>
                {state === "sending" ? "Sending…" : "Send"}
              </button>
            </>
          )}
        </form>
      ) : null}
      <button type="button" style={S.fab} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <MessageSquarePlus size={15} strokeWidth={1.8} /> Feedback
      </button>
    </>
  );
}
