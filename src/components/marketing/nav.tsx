"use client";

import Link from "next/link";
import { useState } from "react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const links = [
  { label: "Product", href: "/#product" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Resources", href: "/#resources" },
];

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-[var(--accent)]">
            <span className="block h-1.5 w-1.5 rounded-full bg-[#12130f]" />
          </span>
          <span className="font-display text-[0.95rem] font-semibold tracking-tight">Signal</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link key={l.label} href={l.href} className="text-[0.85rem] text-[var(--text-dim)] transition-colors hover:text-[var(--text)]">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button href="/login" variant="ghost" size="sm">Log in</Button>
          <Button href="/signup" variant="primary" size="sm">Start Free</Button>
        </div>

        <button className="text-[var(--text)] md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </Container>

      {open && (
        <div className="border-t border-[var(--border)] bg-[var(--bg)] md:hidden">
          <Container className="flex flex-col gap-4 py-5">
            {links.map((l) => (
              <Link key={l.label} href={l.href} onClick={() => setOpen(false)} className="text-[0.9rem] text-[var(--text-dim)]">
                {l.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <Button href="/login" variant="secondary">Log in</Button>
              <Button href="/signup" variant="primary">Start Free</Button>
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}
