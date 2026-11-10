import Link from "next/link";
import ResetForm from "./reset-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="min-h-screen bg-[#F4F7FC] flex items-center justify-center p-6">
      <div className="w-full max-w-[400px] rounded-xl border border-[#E1E7F0] bg-white p-8">
        <h1 className="text-[22px] font-semibold tracking-tight text-[#15161A]">
          Новый пароль
        </h1>

        {token ? (
          <ResetForm token={token} />
        ) : (
          <>
            <p className="mt-3 text-sm leading-relaxed text-[#5F6672]">
              Ссылка неполная — в ней нет кода подтверждения. Запросите сброс заново.
            </p>
            <p className="mt-6 text-[13px] text-[#5F6672]">
              <Link href="/forgot-password" className="text-[#1F5FA8]">
                Запросить ссылку
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
