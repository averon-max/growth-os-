"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "./section-heading";
import { Badge } from "@/components/ui/badge";

const items = [
  { verb: "Create", target: "Emergency Plumber Calgary", impact: "High", reason: "Strong commercial intent + missing dedicated page" },
  { verb: "Fix", target: "Mobile CTA", impact: "High", reason: "High mobile traffic + low CTA interaction" },
  { verb: "Improve", target: "Water Heater page", impact: "Medium", reason: "Existing visibility + weak content coverage" },
];

export function OpportunityEngine() {
  return (
    <section className="border-b border-[var(--border)] py-24 md:py-32">
      <Container>
        <SectionHeading eyebrow="Opportunity Engine" title="Don't get another SEO report. Get a priority list." align="center" className="mx-auto" />
        <div className="mt-14 mx-auto flex max-w-[680px] flex-col gap-3">
          {items.map((item, i) => (
            <motion.div key={item.target} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08 }} className="flex flex-col gap-3 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Badge tone={item.impact === "High" ? "high" : "medium"}>{item.impact} impact</Badge>
                <p className="mt-2.5 font-display text-[1.05rem] font-medium">{item.verb}: {item.target}</p>
                <p className="mt-1 text-[0.82rem] text-[var(--text-faint)]">{item.reason}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
