import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn("max-w-[620px]", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
      <h2 className="font-display text-[1.9rem] font-semibold leading-[1.15] tracking-tight md:text-[2.3rem]">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-[1rem] leading-relaxed text-[var(--text-dim)]">
          {description}
        </p>
      )}
    </div>
  );
}
