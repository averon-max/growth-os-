"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "./section-heading";
import { ArrowRight } from "lucide-react";

export function AudienceBehavior() {
  return (
    <section className="border-b border-[var(--border)] py-24 md:py-32">
      <Container className="grid items-center gap-14 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="order-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-6 md:order-1">
          <p className="eyebrow mb-5">Mobile session funnel</p>
          <div className="space-y-3">
            {[
              { label: "Landing page", pct: 100 },
              { label: "Scrolled to pricing", pct: 64 },
              { label: "Interacted with CTA", pct: 4.8 },
            ].map((step) => (
              <div key={step.label}>
                <div className="mb-1.5 flex items-center justify-between text-[0.8rem]">
                  <span className="text-[var(--text-dim)]">{step.label}</span>
                  <span className="font-mono-num">{step.pct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: step.pct + "%" }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <ArrowRight size={15} className="mt-0.5 shrink-0 text-[var(--accent)]" />
            <div>
              <p className="text-[0.82rem] text-[var(--text-dim)]">64% of mobile visitors reach the pricing section, but only 4.8% interact with the primary CTA.</p>
              <p className="mt-2 text-[0.78rem] font-medium text-[var(--accent-strong)]">Opportunity detected — improve mobile CTA visibility</p>
            </div>
          </div>
        </motion.div>
        <div className="order-1 md:order-2">
          <SectionHeading eyebrow="Audience Behavior" title="Understand what visitors actually do." description="The system studies scroll depth, CTA interaction, exit points and conversion paths — not only where you rank in Google, but what happens once someone arrives." />
        </div>
      </Container>
    </section>
  );
}
