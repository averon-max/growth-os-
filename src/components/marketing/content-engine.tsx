"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "./section-heading";
import { FileText, FilePlus, Sparkles } from "lucide-react";

const existing = ["Plumbing Services", "Water Heater Repair"];
const missing = ["Emergency Plumber Calgary", "Drain Cleaning Calgary", "24 Hour Plumbing", "Commercial Plumbing"];

export function ContentEngine() {
  return (
    <section className="border-b border-[var(--border)] py-24 md:py-32">
      <Container className="grid items-center gap-14 md:grid-cols-2">
        <div>
          <SectionHeading eyebrow="Content Engine" title="Know what your website should say next." description="See what content you already have, what is missing, and which gaps carry real search demand — before deciding whether to create or improve a page." />
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-6">
          <p className="eyebrow mb-3">Existing content</p>
          <div className="mb-6 space-y-2">
            {existing.map((e) => (
              <div key={e} className="flex items-center gap-2.5 text-[0.85rem] text-[var(--text-dim)]">
                <FileText size={14} className="text-[var(--text-faint)]" />
                {e}
              </div>
            ))}
          </div>
          <p className="eyebrow mb-3">Missing opportunities</p>
          <div className="space-y-2">
            {missing.map((m) => (
              <div key={m} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3.5 py-2.5">
                <div className="flex items-center gap-2.5 text-[0.85rem]">
                  <FilePlus size={14} className="text-[var(--accent)]" />
                  {m}
                </div>
                <Sparkles size={13} className="text-[var(--text-faint)]" />
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-[0.72rem] text-[var(--accent-strong)]">Create article</span>
            <span className="rounded-full bg-[var(--surface-2)] px-3 py-1.5 text-[0.72rem] text-[var(--text-dim)]">Create landing page</span>
            <span className="rounded-full bg-[var(--surface-2)] px-3 py-1.5 text-[0.72rem] text-[var(--text-dim)]">Improve existing page</span>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
