"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./admin.module.css";

const PLAN_OPTIONS = [
  { value: "STARTER", label: "Starter" },
  { value: "GROWTH", label: "Growth" },
  { value: "AUTOPILOT", label: "Autopilot" },
  { value: "FREE", label: "Remove access" },
];

export default function GrantForm({
  workspaceId,
  currentPlan,
}: {
  workspaceId: string;
  currentPlan: string;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState(currentPlan === "FREE" ? "STARTER" : currentPlan);
  const [months, setMonths] = useState("12");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch("/api/admin/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        plan,
        months: plan === "FREE" ? 0 : Number(months || 0),
        note: note || null,
      }),
    });

    setBusy(false);

    if (res.ok) {
      setNote("");
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't save");
    }
  }

  return (
    <form onSubmit={submit} className={styles.form}>
      <label className={styles.field}>
        <span className={styles.label}>Plan</span>
        <select value={plan} onChange={(e) => setPlan(e.target.value)}>
          {PLAN_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Months</span>
        <input
          type="number"
          min={0}
          max={120}
          value={months}
          disabled={plan === "FREE"}
          onChange={(e) => setMonths(e.target.value)}
          className={styles.months}
        />
      </label>

      <label className={`${styles.field} ${styles.fieldGrow}`}>
        <span className={styles.label}>Note</span>
        <input
          type="text"
          value={note}
          placeholder="reason for the grant"
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      <button
        type="submit"
        disabled={busy}
        className={`${styles.button} ${styles.buttonPrimary}`}
      >
        {busy ? "…" : "Apply"}
      </button>

      {error ? <p className={styles.error}>{error}</p> : null}
    </form>
  );
}
