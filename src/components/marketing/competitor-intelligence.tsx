"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "./section-heading";
import { Button } from "@/components/ui/button";

const rows = [
  { label: "Keyword coverage", you: 62, a: 84, b: 91 },
  { label: "Content coverage", you: 48, a: 76, b: 70 },
  { label: "Local visibility", you: 55, a: 88, b: 60 },
];

export function CompetitorIntelligence() {
  return (
    <section className="border-b border-[var(--border)] py-24 md:py-32">
      <Container>
        <SectionHeading eyebrow="Competitor Intelligence" title="See the opportunities your competitors are taking." align="center" className="mx-auto" />
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mt-14 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-6">
          <div className="mb-6 grid grid-cols-4 gap-3 text-center text-[0.78rem]">
            <span />
            <span className="font-medium text-[var(--text)]">Your website</span>
            <span className="text-[var(--text-faint)]">Competitor A</span>
            <span className="text-[var(--text-faint)]">Competitor B</span>
          </div>
          <div className="space-y-5">
            {rows.map((r) => (
              <div key={r.label} className="grid grid-cols-4 items-center gap-3">
                <span className="text-[0.82rem] text-[var(--text-dim)]">{r.label}</span>
                {[r.you, r.a, r.b].map((v, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                      <div className={`h-full rounded-full ${i === 0 ? "bg-[var(--accent)]" : "bg-[var(--text-faint)]"}`} style={{ width: `${v}%` }} />
                    </div>
                    <span className="font-mono-num text-[0.72rem] text-[var(--text-faint)]">{v}%</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-center text-[0.82rem] text-[var(--text-dim)]">
            28 relevant topics are covered by competitors but missing from your website.
          </div>
        </motion.div>
        <div className="mt-8 flex justify-center">
          <Button href="/signup" variant="secondary">Find My Opportunities</Button>
        </div>
      </Container>
    </section>
  );
}
