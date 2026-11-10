"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Пароли не совпадают");
      return;
    }

    setBusy(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setBusy(false);

    if (res.ok) {
      setDone(true);
      setTimeout(() => router.push("/login"), 1500);
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Не удалось сменить пароль");
    }
  }

  if (done) {
    return (
      <p className="mt-3 text-sm leading-relaxed text-[#5F6672]">
        Пароль изменён. Перенаправляем на страницу входа…
      </p>
    );
  }

  return (
    <>
      <p className="mt-3 text-sm leading-relaxed text-[#5F6672]">
        Придумайте новый пароль — не короче восьми символов.
      </p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-[#3C4350]">Новый пароль</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10 rounded-lg border border-[#DDE3EC] px-3 text-sm text-[#15161A] outline-none focus:border-[#2F6FB5]"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-[#3C4350]">Ещё раз</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="h-10 rounded-lg border border-[#DDE3EC] px-3 text-sm text-[#15161A] outline-none focus:border-[#2F6FB5]"
          />
        </label>

        {error ? <p className="text-[13px] text-[#B0463C]">{error}</p> : null}

        <button
          type="submit"
          disabled={busy}
          className="h-10 rounded-lg bg-[#2F6FB5] text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Сохраняем…" : "Сменить пароль"}
        </button>
      </form>

      <p className="mt-6 text-[13px] text-[#5F6672]">
        <Link href="/login" className="text-[#1F5FA8]">
          Вернуться ко входу
        </Link>
      </p>
    </>
  );
}
