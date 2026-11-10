"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setBusy(false);

    if (res.ok) {
      setSent(true);
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Не удалось отправить письмо");
    }
  }

  return (
    <main className="min-h-screen bg-[#F4F7FC] flex items-center justify-center p-6">
      <div className="w-full max-w-[400px] rounded-xl border border-[#E1E7F0] bg-white p-8">
        <h1 className="text-[22px] font-semibold tracking-tight text-[#15161A]">
          Восстановление пароля
        </h1>

        {sent ? (
          <p className="mt-3 text-sm leading-relaxed text-[#5F6672]">
            Если такой аккаунт есть, мы отправили на него ссылку для смены пароля.
            Она действует час. Проверьте почту, включая папку со спамом.
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm leading-relaxed text-[#5F6672]">
              Укажите email, которым вы заходите. Пришлём ссылку для смены пароля.
            </p>

            <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-[13px] font-medium text-[#3C4350]">Email</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 rounded-lg border border-[#DDE3EC] px-3 text-sm text-[#15161A] outline-none focus:border-[#2F6FB5]"
                />
              </label>

              {error ? <p className="text-[13px] text-[#B0463C]">{error}</p> : null}

              <button
                type="submit"
                disabled={busy}
                className="h-10 rounded-lg bg-[#2F6FB5] text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy ? "Отправляем…" : "Отправить ссылку"}
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-[13px] text-[#5F6672]">
          <Link href="/login" className="text-[#1F5FA8]">
            Вернуться ко входу
          </Link>
        </p>
      </div>
    </main>
  );
}
