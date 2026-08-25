"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "./section-heading";

export function FeedbackLoop() {
  return (
    <section className="border-b border-[var(--border)] py-24 md:py-32">
      <Container className="grid items-center gap-14 md:grid-cols-2">
        <div>
          <SectionHeading eyebrow="Feedback Loop" title="Every change gets measured." description="Signal does not stop at a recommendation. It publishes the change, tracks what happened, and uses the result to decide what to do next." />
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-6">
          <p className="eyebrow mb-1">Updated service page</p>
          <p className="mb-5 text-[0.8rem] text-[var(--text-faint)]">Published 14 days ago</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Organic clicks", value: "+18%" },
              { label: "Conversions", value: "+11%" },
              { label: "Ranking", value: "#17 → #9" },
            ].map((m) => (
              <div key={m.label} className="rounded-lg border border-[var(--border)] px-3.5 py-3 text-center">
                <p className="font-mono-num text-[1.05rem] font-semibold text-[var(--positive)]">{m.value}</p>
                <p className="mt-1 text-[0.7rem] text-[var(--text-faint)]">{m.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between rounded-lg bg-[var(--surface-2)] px-4 py-3">
            <span className="text-[0.8rem] text-[var(--text-dim)]">Next recommended action</span>
            <span className="text-[0.8rem] font-medium text-[var(--accent-strong)]">Expand FAQ section</span>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
