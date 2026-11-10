"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

type Variant = "dark" | "gold" | "light" | "accent";

const STYLES: Record<Variant, { background: string; color: string }> = {
  dark: { background: "#0a0a0a", color: "#f2f1ed" },
  gold: { background: "#d4a030", color: "#0a0a0a" },
  light: { background: "#f2f1ed", color: "#0a0a0a" },
  accent: { background: "#3b82f6", color: "#ffffff" },
};

export default function SubscribeButton({
  plan = "GROWTH",
  label = "Подписаться",
  variant = "dark",
  size = "md",
}: {
  plan?: "STARTER" | "GROWTH" | "AUTOPILOT";
  label?: string;
  variant?: Variant;
  size?: "md" | "lg";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);

    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });

    // Не вошёл — сначала регистрация, тариф запомним в адресе.
    if (res.status === 401) {
      router.push(`/signup?plan=${plan}`);
      return;
    }

    const body = await res.json().catch(() => ({}));
    setBusy(false);

    if (res.ok && body.url) {
      window.location.href = body.url;
    } else {
      setError(body.error ?? "Не удалось открыть оплату");
    }
  }

  const palette = STYLES[variant];

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 6 }}>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: size === "lg" ? "16px 32px" : "12px 24px",
          borderRadius: 100,
          border: "none",
          cursor: busy ? "default" : "pointer",
          fontFamily: "inherit",
          fontWeight: 600,
          fontSize: size === "lg" ? "0.95rem" : "0.85rem",
          letterSpacing: "-0.01em",
          opacity: busy ? 0.6 : 1,
          ...palette,
        }}
      >
        {busy ? "Открываем оплату…" : label} <ArrowRight size={size === "lg" ? 16 : 14} />
      </button>
      {error ? (
        <span style={{ fontSize: "0.72rem", color: "#b0463c" }}>{error}</span>
      ) : null}
    </span>
  );
}
