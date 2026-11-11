"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./auth.module.css";

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className={styles.inputWrap}>
      <input
        id={id}
        name={id}
        type={show ? "text" : "password"}
        className={styles.input}
        style={{ paddingRight: 64 }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
        maxLength={128}
      />
      <button type="button" className={styles.reveal} onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}

/** Rough strength guide for the user only; the server does the real check (length + breached-password list). */
function score(pw: string): number {
  if (!pw) return 0;
  let s = pw.length >= 10 ? 1 : 0;
  if (pw.length >= 14) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.max(1, s);
}
const METER = ["#1f2125", "#d46670", "#c9a644", "#7fb0ff", "#4daf6d"];

function Meter({ value }: { value: string }) {
  const s = score(value);
  return (
    <>
      <div className={styles.meter} aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} style={{ background: i <= s ? METER[s] : undefined }} />
        ))}
      </div>
      <span className={styles.hint}>At least 10 characters. A short phrase works well.</span>
    </>
  );
}

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, error: data.error };
  } catch {
    return { ok: false, error: "Network error. Check your connection and try again." };
  }
}

function safeNext(raw: string | null): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(params.get("error") ? "Please log in to continue." : "");
  const [busy, setBusy] = useState(false);
  const reset = params.get("reset") === "1";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    if (!result || result.error) {
      setBusy(false);
      setError("Wrong email or password. After several tries, login pauses for 15 minutes.");
      return;
    }
    router.push(safeNext(params.get("callbackUrl")));
    router.refresh();
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate={false}>
      {reset ? <p className={styles.notice} style={{ marginTop: 0 }}>Password changed. Log in with the new one.</p> : null}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@company.com" required autoFocus maxLength={254} />
      </div>
      <div className={styles.field}>
        <div className={styles.labelRow}>
          <label className={styles.label} htmlFor="password">Password</label>
          <Link href="/forgot-password" className={styles.link}>Forgot password?</Link>
        </div>
        <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" />
      </div>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <button className={styles.button} disabled={busy}>{busy ? "Logging in…" : "Log in"}</button>
    </form>
  );
}

export function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 10) return setError("Use at least 10 characters.");
    setBusy(true);
    const res = await postJson("/api/auth/signup", { name, email, password, company });
    if (!res.ok) {
      setBusy(false);
      return setError(res.error ?? "Couldn't create the account. Try again.");
    }
    const result = await signIn("credentials", { email, password, redirect: false });
    if (!result || result.error) {
      setBusy(false);
      return router.push("/login");
    }
    const plan = params.get("plan");
    router.push(plan ? `/pricing?plan=${encodeURIComponent(plan)}` : "/dashboard");
    router.refresh();
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="name">Name</label>
        <input id="name" name="name" className={styles.input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Your name" maxLength={80} autoFocus />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="email">Work email</label>
        <input id="email" name="email" type="email" className={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@company.com" required maxLength={254} />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="new-password">Password</label>
        <PasswordInput id="new-password" value={password} onChange={setPassword} autoComplete="new-password" />
        <Meter value={password} />
      </div>
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} />
      </div>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <button className={styles.button} disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
      <p className={styles.legal}>By creating an account you agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.</p>
    </form>
  );
}

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await postJson("/api/auth/forgot-password", { email });
    setBusy(false);
    if (res.ok) setSent(true);
    else setError(res.error ?? "Couldn't send the email. Try again.");
  }

  if (sent) {
    return (
      <p className={styles.notice}>
        If an account exists for <b>{email}</b>, a reset link is on its way. It works once and expires in 30 minutes. Check spam too.
      </p>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@company.com" required autoFocus maxLength={254} />
      </div>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <button className={styles.button} disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 10) return setError("Use at least 10 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setBusy(true);
    const res = await postJson("/api/auth/reset-password", { token, password });
    if (!res.ok) {
      setBusy(false);
      return setError(res.error ?? "Couldn't change the password.");
    }
    router.replace("/login?reset=1");
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="new-password">New password</label>
        <PasswordInput id="new-password" value={password} onChange={setPassword} autoComplete="new-password" />
        <Meter value={password} />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="confirm-password">Repeat password</label>
        <PasswordInput id="confirm-password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
      </div>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <button className={styles.button} disabled={busy}>{busy ? "Saving…" : "Set new password"}</button>
      <p className={styles.legal}>You'll be signed out on every other device.</p>
    </form>
  );
}
