"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "./section-heading";

const steps = ["Detect", "Prioritize", "Prepare", "Approve", "Publish", "Measure"];
const automations = ["Metadata", "Internal links", "Schema", "Content drafts", "Technical fixes", "Content updates"];

export function Automation() {
  return (
    <section className="border-b border-[var(--border)] py-24 md:py-32">
      <Container>
        <SectionHeading eyebrow="Automation" title="From recommendation to execution." align="center" className="mx-auto" />
        <div className="mt-14 flex flex-wrap items-center justify-center gap-2">
          {steps.map((step, i) => (
            <motion.div key={step} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35, delay: i * 0.06 }} className="flex items-center gap-2">
              <span className="rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2 text-[0.82rem]">{step}</span>
              {i < steps.length - 1 && <span className="text-[var(--text-faint)]">→</span>}
            </motion.div>
          ))}
        </div>
        <div className="mx-auto mt-16 grid max-w-[820px] gap-8 md:grid-cols-2">
          <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-6">
            <p className="eyebrow mb-4 text-[var(--accent-strong)]">Autopilot</p>
            <p className="mb-4 text-[0.85rem] text-[var(--text-dim)]">Low-risk, reversible changes are applied automatically.</p>
            <div className="flex flex-wrap gap-2">
              {automations.slice(0, 3).map((a) => (
                <span key={a} className="rounded-full bg-[var(--surface-2)] px-3 py-1.5 text-[0.72rem] text-[var(--text-dim)]">{a}</span>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-6">
            <p className="eyebrow mb-4">Review Mode</p>
            <p className="mb-4 text-[0.85rem] text-[var(--text-dim)]">Higher-impact changes are prepared and wait for your approval.</p>
            <div className="flex flex-wrap gap-2">
              {automations.slice(3).map((a) => (
                <span key={a} className="rounded-full bg-[var(--surface-2)] px-3 py-1.5 text-[0.72rem] text-[var(--text-dim)]">{a}</span>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
