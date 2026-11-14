"use client";

import { useState } from "react";
import styles from "@/components/auth.module.css";

const CATEGORIES = ["Account & login", "Billing", "Bug", "Feature request", "Other"];

export default function SupportForm({ email: initialEmail, name: initialName }: { email: string; name: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<number | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, name, category, subject, message, website }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Couldn't send. Email support@hyprlyx.com instead.");
    setSent(data.number ?? 0);
  }

  if (sent !== null) {
    return <p className={styles.notice}>Thanks! Request <b>#{sent}</b> is with our team. We sent a confirmation to <b>{email}</b> — reply to it to add details.</p>;
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      {initialEmail ? null : (
        <div className={styles.field}>
          <label className={styles.label} htmlFor="s-email">Your email</label>
          <input id="s-email" type="email" className={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} placeholder="you@company.com" />
        </div>
      )}
      {initialName ? null : (
        <div className={styles.field}>
          <label className={styles.label} htmlFor="s-name">Name <span style={{ color: "#62666e" }}>(optional)</span></label>
          <input id="s-name" className={styles.input} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </div>
      )}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="s-cat">Topic</label>
        <select id="s-cat" className={styles.input} value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="s-subj">Subject</label>
        <input id="s-subj" className={styles.input} value={subject} onChange={(e) => setSubject(e.target.value)} required minLength={3} maxLength={140} placeholder="Short summary" />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="s-msg">Message</label>
        <textarea id="s-msg" className={styles.input} style={{ height: 150, padding: 12, resize: "vertical", lineHeight: 1.5 }} value={message} onChange={(e) => setMessage(e.target.value)} required minLength={10} maxLength={5000} placeholder="What happened, what you expected, any links or steps." />
      </div>
      <div className={styles.honeypot} aria-hidden="true">
        <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <button className={styles.button} disabled={busy}>{busy ? "Sending…" : "Send message"}</button>
    </form>
  );
}
