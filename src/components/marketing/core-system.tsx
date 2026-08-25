"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "./section-heading";

const inputs = ["Website", "Search", "Audience", "Content", "Competitors", "Conversions"];

export function CoreSystem() {
  return (
    <section id="product" className="border-b border-[var(--border)] py-24 md:py-32">
      <Container>
        <SectionHeading eyebrow="The system" title="One system. Every growth signal." align="center" className="mx-auto" />
        <div className="mt-16 flex flex-col items-center gap-3">
          <div className="grid w-full max-w-[860px] grid-cols-2 gap-3 sm:grid-cols-3">
            {inputs.map((input, i) => (
              <motion.div key={input} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.05 }} className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-center text-[0.85rem] text-[var(--text-dim)]">
                {input}
              </motion.div>
            ))}
          </div>
          <svg viewBox="0 0 4 40" className="h-10 w-1" preserveAspectRatio="none">
            <line x1="2" y1="0" x2="2" y2="40" stroke="var(--border-strong)" strokeWidth="2" strokeDasharray="1 5" strokeLinecap="round" />
          </svg>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="rounded-lg border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-8 py-4 text-center">
            <p className="font-display text-[1.05rem] font-semibold text-[var(--accent-strong)]">Opportunity Engine</p>
          </motion.div>
          <svg viewBox="0 0 4 40" className="h-6 w-1" preserveAspectRatio="none">
            <line x1="2" y1="0" x2="2" y2="40" stroke="var(--border-strong)" strokeWidth="2" strokeDasharray="1 5" strokeLinecap="round" />
          </svg>
          <div className="grid w-full max-w-[500px] grid-cols-2 gap-3">
            {["Actions", "Results"].map((s, i) => (
              <motion.div key={s} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08 }} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-center text-[0.85rem]">
                {s}
              </motion.div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
