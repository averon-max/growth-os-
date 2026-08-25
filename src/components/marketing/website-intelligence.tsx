"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "./section-heading";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

const checks = [
  { label: "Technical SEO", status: "ok" },
  { label: "Content quality", status: "warn" },
  { label: "Internal linking", status: "warn" },
  { label: "Page structure", status: "ok" },
  { label: "Performance", status: "ok" },
  { label: "Mobile experience", status: "ok" },
  { label: "Indexation", status: "error" },
  { label: "Schema", status: "warn" },
  { label: "Broken links", status: "error" },
];

const icons = {
  ok: <CheckCircle2 size={14} className="text-[var(--positive)]" />,
  warn: <AlertTriangle size={14} className="text-[var(--accent)]" />,
  error: <XCircle size={14} className="text-[var(--negative)]" />,
};

export function WebsiteIntelligence() {
  return (
    <section id="how-it-works" className="border-b border-[var(--border)] py-24 md:py-32">
      <Container className="grid items-center gap-14 md:grid-cols-2">
        <div>
          <SectionHeading eyebrow="Website Intelligence" title="Know exactly what is happening on your website." description="The system continuously maps your website and detects changes, weaknesses and opportunities — not a one-time audit, but an ongoing picture of your site's health." />
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-2">
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
            {checks.map((c) => (
              <div key={c.label} className="flex items-center gap-2.5 rounded-lg px-3.5 py-3 hover:bg-[var(--surface-2)]">
                {icons[c.status as keyof typeof icons]}
                <span className="text-[0.82rem] text-[var(--text-dim)]">{c.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-1 flex items-center justify-between rounded-lg border-t border-[var(--border)] px-3.5 py-3">
            <span className="text-[0.78rem] text-[var(--text-faint)]">214 pages scanned · updated 6 minutes ago</span>
            <span className="font-mono-num text-[0.78rem] text-[var(--accent-strong)]">6 issues found</span>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
