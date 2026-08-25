import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "positive" | "high" | "medium";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-[var(--surface-2)] text-[var(--text-dim)] border-[var(--border-strong)]",
    accent: "bg-[var(--accent-soft)] text-[var(--accent-strong)] border-transparent",
    positive: "bg-[var(--positive-soft)] text-[var(--positive)] border-transparent",
    high: "bg-[var(--accent-soft)] text-[var(--accent-strong)] border-transparent",
    medium: "bg-[var(--surface-2)] text-[var(--text-dim)] border-[var(--border-strong)]",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-mono uppercase tracking-[0.08em]", tones[tone], className)}>
      {children}
    </span>
  );
}
