"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "./section-heading";
import { LayoutGrid, Search, Tags, Users, FileText, Swords, Target, Zap, BarChart3, Settings } from "lucide-react";

const sidebar = [
  { icon: LayoutGrid, label: "Overview" },
  { icon: Search, label: "SEO" },
  { icon: Tags, label: "Keywords" },
  { icon: Users, label: "Audience" },
  { icon: FileText, label: "Content" },
  { icon: Swords, label: "Competitors" },
  { icon: Target, label: "Opportunities" },
  { icon: Zap, label: "Automations" },
  { icon: BarChart3, label: "Reports" },
  { icon: Settings, label: "Settings" },
];

export function DashboardPreview() {
  return (
    <section className="border-b border-[var(--border)] py-24 md:py-32">
      <Container>
        <SectionHeading eyebrow="The Dashboard" title="Everything, in one place." align="center" className="mx-auto" />
      </Container>
      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mt-14">
        <Container className="max-w-[1180px]">
          <div className="overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-[0_50px_120px_-40px_rgba(0,0,0,0.65)]">
            <div className="grid grid-cols-[190px_1fr]">
              <div className="hidden border-r border-[var(--border)] p-4 sm:block">
                <div className="mb-6 flex items-center gap-2 px-2">
                  <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                  <span className="font-display text-[0.85rem] font-semibold">Signal</span>
                </div>
                <nav className="space-y-1">
                  {sidebar.map((item, i) => (
                    <div key={item.label} className={["flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[0.78rem]", i === 0 ? "bg-[var(--surface-2)] text-[var(--text)]" : "text-[var(--text-faint)]"].join(" ")}>
                      <item.icon size={14} />
                      {item.label}
                    </div>
                  ))}
                </nav>
              </div>
              <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="font-display text-lg font-semibold">Overview</p>
                    <p className="text-[0.78rem] text-[var(--text-faint)]">acme-hardware.com</p>
                  </div>
                  <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-[0.72rem] text-[var(--accent-strong)]">Website score: 84</span>
                </div>
                <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "Organic traffic", value: "+24%" },
                    { label: "Conversions", value: "+11%" },
                    { label: "Keywords", value: "+38" },
                    { label: "Opportunities", value: "12" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg border border-[var(--border)] px-3.5 py-3">
                      <p className="font-mono-num text-[1.1rem] font-semibold">{s.value}</p>
                      <p className="mt-0.5 text-[0.7rem] text-[var(--text-faint)]">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    { title: "Priority Opportunities", rows: ["Emergency service page", "Mobile CTA visibility", "Water heater content"] },
                    { title: "Recent Automations", rows: ["Updated 6 meta descriptions", "Fixed 3 broken links", "Added schema to 4 pages"] },
                  ].map((panel) => (
                    <div key={panel.title} className="rounded-lg border border-[var(--border)] p-4">
                      <p className="eyebrow mb-3">{panel.title}</p>
                      <div className="space-y-2">
                        {panel.rows.map((r) => (
                          <div key={r} className="rounded-md bg-[var(--surface-2)] px-3 py-2 text-[0.8rem] text-[var(--text-dim)]">{r}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Container>
      </motion.div>
    </section>
  );
}
