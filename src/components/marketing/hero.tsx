"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, Zap } from "lucide-react";

const stats = [
  { label: "Organic traffic", value: "+24%" },
  { label: "Opportunities", value: "12" },
  { label: "Keywords rising", value: "8" },
  { label: "Content gaps", value: "3" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-[var(--border)] pt-20 pb-28 md:pt-32 md:pb-40">
      <div className="hero-glow pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 30% at 50% 100%, rgba(232,164,53,0.04), transparent)" }} />

      <Container className="relative">
        <div className="mx-auto max-w-[800px] text-center">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-7 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent-soft)] px-3.5 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[var(--accent-strong)]">Continuous Website Optimization</span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.05 }} className="font-display text-[3rem] font-semibold leading-[1.02] tracking-[-0.035em] md:text-[4.2rem]">
            <span className="text-gradient">Your website,</span>
            <br />
            <span className="text-gradient">continuously improved.</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="mx-auto mt-7 max-w-[520px] text-[1.05rem] leading-relaxed text-[var(--text-dim)]">
            Analyze your website, search demand, audience behavior and competitors — then turn the highest-value opportunities into measurable growth.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }} className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href="/signup" size="md" className="glow-accent px-7 py-3 text-[0.95rem]">
              Analyze Your Website <ArrowRight size={16} />
            </Button>
            <Button href="#how-it-works" variant="secondary" size="md" className="px-7 py-3 text-[0.95rem]">
              See How It Works
            </Button>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="relative mx-auto mt-20 max-w-[1000px]">
          <div className="hero-card overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-3.5">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#3a3d42]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#3a3d42]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#3a3d42]" />
              </div>
              <span className="eyebrow">acme-hardware.com — overview</span>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--positive)]" />
                <span className="text-[0.65rem] text-[var(--text-faint)]">Live</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr]">
              <div className="border-b border-[var(--border)] p-7 md:border-b-0 md:border-r">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="eyebrow mb-2">SEO Health Score</p>
                    <p className="font-display text-[2.8rem] font-semibold leading-none">
                      84
                      <span className="text-[var(--text-faint)] text-2xl font-normal">/100</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full border border-[var(--positive)]/20 bg-[var(--positive-soft)] px-3 py-1.5 text-[0.72rem] font-mono text-[var(--positive)]">
                    <TrendingUp size={11} /> +24%
                  </div>
                </div>

                <svg viewBox="0 0 400 100" className="mt-6 w-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e8a435" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#e8a435" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,80 L40,75 L80,82 L120,65 L160,68 L200,50 L240,54 L280,35 L320,38 L360,18 L400,22 L400,100 L0,100 Z" fill="url(#fillGrad)" />
                  <path d="M0,80 L40,75 L80,82 L120,65 L160,68 L200,50 L240,54 L280,35 L320,38 L360,18 L400,22" fill="none" stroke="var(--accent)" strokeWidth="1.5" className="signal-line" />
                </svg>

                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  {stats.map((s) => (
                    <div key={s.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
                      <p className="font-mono-num text-[1.1rem] font-semibold text-[var(--accent-strong)]">{s.value}</p>
                      <p className="mt-0.5 text-[0.68rem] text-[var(--text-faint)]">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 p-7">
                <p className="eyebrow mb-2">Priority opportunities</p>
                {[
                  { label: "Emergency service page", impact: "High" },
                  { label: "Mobile CTA visibility", impact: "High" },
                  { label: "Water heater content", impact: "Medium" },
                  { label: "Internal linking gaps", impact: "Medium" },
                ].map((o) => (
                  <div key={o.label} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 transition-colors hover:border-[var(--border-strong)]">
                    <div className="flex items-center gap-2.5">
                      <Zap size={13} className="text-[var(--accent)]" />
                      <span className="text-[0.82rem]">{o.label}</span>
                    </div>
                    <span className={`text-[0.65rem] font-mono uppercase tracking-wider ${o.impact === "High" ? "text-[var(--accent-strong)]" : "text-[var(--text-faint)]"}`}>
                      {o.impact}
                    </span>
                  </div>
                ))}
                <div className="mt-2 flex items-center justify-between rounded-xl border border-[var(--positive)]/15 bg-[var(--positive-soft)] px-4 py-3">
                  <span className="text-[0.78rem] text-[var(--positive)]">4 automated improvements this week</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--positive)]" />
                </div>
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute -bottom-20 left-1/2 h-40 w-[600px] -translate-x-1/2 rounded-full bg-[var(--accent)] opacity-[0.04] blur-3xl" />
        </motion.div>
      </Container>
    </section>
  );
}
