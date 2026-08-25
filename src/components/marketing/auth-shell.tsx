import Link from "next/link";
import { Container } from "@/components/ui/container";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center py-16">
      <Container className="max-w-[420px]">
        <Link href="/" className="mb-10 flex items-center justify-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-[var(--accent)]">
            <span className="block h-1.5 w-1.5 rounded-full bg-[#12130f]" />
          </span>
          <span className="font-display text-[0.95rem] font-semibold">Signal</span>
        </Link>
        <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-8">
          <h1 className="font-display text-[1.4rem] font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-[0.85rem] text-[var(--text-dim)]">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </div>
        <p className="mt-6 text-center text-[0.83rem] text-[var(--text-faint)]">{footer}</p>
      </Container>
    </main>
  );
}

export function Field({ label, type = "text", placeholder }: { label: string; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.8rem] text-[var(--text-dim)]">{label}</span>
      <input type={type} placeholder={placeholder} className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] px-3.5 py-2.5 text-[0.88rem] text-[var(--text)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--accent)]" />
    </label>
  );
}
