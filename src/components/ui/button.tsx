"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonProps = {
  href?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
};

export function Button({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  onClick,
  type = "button",
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 whitespace-nowrap cursor-pointer",
    size === "md" ? "px-5 py-2.5 text-[0.88rem] rounded-[9px]" : "px-4 py-2 text-[0.8rem] rounded-[7px]",
    variant === "primary" && [
      "bg-[var(--accent)] text-[#080909] font-semibold",
      "hover:bg-[var(--accent-strong)] hover:shadow-[0_4px_20px_rgba(232,164,53,0.4)]",
      "active:scale-[0.98]",
    ],
    variant === "secondary" && [
      "bg-[var(--surface-2)] text-[var(--text)]",
      "border border-[var(--border-strong)]",
      "hover:border-[var(--text-faint)] hover:bg-[var(--surface)]",
      "active:scale-[0.98]",
    ],
    variant === "ghost" && "text-[var(--text-dim)] hover:text-[var(--text)]",
    className
  );

  if (href) {
    return <Link href={href} className={classes}>{children}</Link>;
  }
  return (
    <button type={type} onClick={onClick} className={classes}>
      {children}
    </button>
  );
}
